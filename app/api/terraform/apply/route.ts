import { spawn } from 'child_process'
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join, resolve, relative, isAbsolute } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { CredentialManager } from '@/lib/credential-manager'

// Define allowed sandbox root for Terraform operations
// In production, this should be configured via environment variable
const TERRAFORM_SANDBOX = process.env.TERRAFORM_SANDBOX || join(tmpdir(), 'terraform-sandbox')

// Ensure sandbox directory exists
if (!existsSync(TERRAFORM_SANDBOX)) {
  mkdirSync(TERRAFORM_SANDBOX, { recursive: true })
  console.log('📁 Created Terraform sandbox directory:', TERRAFORM_SANDBOX)
}

/**
 * Validates that a directory path is within the allowed sandbox
 * Prevents directory traversal attacks
 */
function isPathInSandbox(targetPath: string, sandboxRoot: string = TERRAFORM_SANDBOX): boolean {
  const resolvedTarget = resolve(targetPath)
  const resolvedSandbox = resolve(sandboxRoot)
  
  const relativePath = relative(resolvedSandbox, resolvedTarget)
  
  // Check if path escapes sandbox (starts with '..' or is absolute outside sandbox)
  const isInside = !relativePath.startsWith('..') && !isAbsolute(relativePath)
  
  console.log('🔒 Path validation:', {
    targetPath,
    resolvedTarget,
    sandboxRoot: resolvedSandbox,
    relativePath,
    isInside
  })
  
  return isInside
}

export async function POST(request: NextRequest) {
  let tempDir: string | null = null
  
  try {
    const body = await request.json()
    const { terraformCode, provider = 'aws', workingDirectory, planFile, planFileData, autoApprove = true, credentials } = body
    
    console.log('🚀 Terraform Apply API called:', {
      hasTerraformCode: !!terraformCode,
      workingDirectory,
      planFile,
      hasPlanFileData: !!planFileData,
      autoApprove,
      provider,
      timestamp: new Date().toISOString()
    })

    // Setup environment variables with credentials
    const env = { ...process.env }
    
    // Setup Terraform plugin cache directory for faster init
    const pluginCacheDir = join(tmpdir(), 'terraform-plugin-cache')
    if (!existsSync(pluginCacheDir)) {
      mkdirSync(pluginCacheDir, { recursive: true })
      console.log('📦 Created Terraform plugin cache directory:', pluginCacheDir)
    }
    env.TF_PLUGIN_CACHE_DIR = pluginCacheDir
    
    if (credentials?.aws) {
      const validationErrors = CredentialManager.validateAWSCredentials(credentials.aws)
      if (validationErrors.length > 0) {
        return NextResponse.json(
          { error: `Invalid AWS credentials: ${validationErrors.join(', ')}` },
          { status: 400 }
        )
      }
      env.AWS_ACCESS_KEY_ID = credentials.aws.accessKeyId
      env.AWS_SECRET_ACCESS_KEY = credentials.aws.secretAccessKey
      env.AWS_DEFAULT_REGION = credentials.aws.region
      console.log('🔑 Using AWS credentials for terraform apply')
    }

    let actualWorkingDir = workingDirectory

    // If terraformCode is provided, create a temporary directory INSIDE sandbox
    if (terraformCode) {
      tempDir = join(TERRAFORM_SANDBOX, `terraform-apply-${randomUUID()}`)
      
      // Validate tempDir is in sandbox (should always pass since we're using join)
      if (!isPathInSandbox(tempDir)) {
        console.error('❌ Security: Generated temp directory outside sandbox:', tempDir)
        return NextResponse.json(
          { error: 'Internal error: Invalid temporary directory' },
          { status: 500 }
        )
      }
      
      mkdirSync(tempDir, { recursive: true })
      console.log('📁 Created temporary directory in sandbox:', tempDir)

      // Write Terraform code to main.tf
      const mainTfPath = join(tempDir, 'main.tf')
      writeFileSync(mainTfPath, terraformCode, 'utf-8')
      console.log('✅ Written main.tf')

      // Run terraform init with optimization flags for faster execution
      console.log('🔧 Running terraform init...')
      const initArgs = [
        '-upgrade=false',      // Don't check for newer provider versions
        '-backend=false',      // Skip backend initialization (not needed for apply)
      ]
      const initResult = await executeTerraformCommand('init', initArgs, tempDir, env)
      
      if (!initResult.success) {
        console.error('❌ Terraform init failed:', initResult.error)
        return NextResponse.json(
          { 
            error: 'Terraform initialization failed', 
            details: initResult.error,
            output: initResult.output 
          },
          { status: 500 }
        )
      }
      console.log('✅ Terraform init successful')

      actualWorkingDir = tempDir
    } else if (!workingDirectory) {
      console.error('❌ Missing working directory and terraform code')
      return NextResponse.json(
        { error: 'Either working directory or terraform code is required' },
        { status: 400 }
      )
    } else {
      // Validate that workingDirectory is within sandbox
      if (!isPathInSandbox(workingDirectory)) {
        console.error('❌ Security: Working directory outside allowed sandbox:', workingDirectory)
        return NextResponse.json(
          { error: 'Working directory outside allowed sandbox' },
          { status: 400 }
        )
      }
      
      // Validate directory exists
      if (!existsSync(workingDirectory)) {
        console.error('❌ Working directory does not exist:', workingDirectory)
        return NextResponse.json(
          { error: `Working directory does not exist: ${workingDirectory}` },
          { status: 400 }
        )
      }
      
      console.log('✅ Working directory validated and within sandbox')
    }

    // If planFileData is provided, write it to a file in the working directory
    let localPlanFile: string | undefined
    if (planFileData) {
      try {
        // Decode base64 plan file data
        const planBuffer = Buffer.from(planFileData, 'base64')
        const planFileName = planFile || `plan-${randomUUID()}.tfplan`
        localPlanFile = join(actualWorkingDir, planFileName)
        
        writeFileSync(localPlanFile, planBuffer)
        console.log('✅ Plan file written from data:', {
          path: localPlanFile,
          sizeBytes: planBuffer.length
        })
      } catch (writeError) {
        console.error('❌ Failed to write plan file from data:', writeError)
        return NextResponse.json(
          { error: 'Failed to write plan file from provided data' },
          { status: 500 }
        )
      }
    }

    const args = []
    if (localPlanFile) {
      // Use the plan file we just wrote from planFileData
      args.push(localPlanFile)
      console.log('📋 Using plan file from data:', localPlanFile)
    } else if (planFile) {
      // Use external plan file reference (legacy, may not work if file doesn't exist)
      args.push(planFile)
      console.log('📋 Using external plan file:', planFile)
    } else if (autoApprove) {
      args.push('-auto-approve')
      console.log('⚡ Auto-approve enabled')
    }

    console.log('🚀 Executing terraform apply command with args:', args)
    const result = await executeTerraformCommand('apply', args, actualWorkingDir, env)
    
    console.log('📊 Terraform apply result:', {
      success: result.success,
      exitCode: result.exitCode,
      outputLength: result.output?.length || 0,
      errorLength: result.error?.length || 0
    })
    
    if (result.output) {
      console.log('📋 Terraform apply output:', result.output)
    }
    if (result.error) {
      console.warn('⚠️ Terraform apply error:', result.error)
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('💥 Error running terraform apply:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })
    return NextResponse.json(
      { error: 'Failed to run terraform apply' },
      { status: 500 }
    )
  } finally {
    // Cleanup temporary directory
    if (tempDir && existsSync(tempDir)) {
      try {
        rmSync(tempDir, { recursive: true, force: true })
        console.log('🧹 Cleaned up temporary directory:', tempDir)
      } catch (cleanupError) {
        console.error('⚠️ Failed to cleanup temporary directory:', cleanupError)
      }
    }
  }
}

function executeTerraformCommand(
  command: string,
  args: string[],
  workingDirectory: string,
  env?: NodeJS.ProcessEnv,
  options?: {
    timeoutMs?: number      // Default: 5 minutes for apply (can be longer than plan)
    maxOutputBytes?: number // Default: 10MB
  }
): Promise<{ success: boolean; output: string; error?: string; exitCode: number }> {
  return new Promise((resolve) => {
    const fullCommand = `terraform ${command} ${args.join(' ')}`
    const timeoutMs = options?.timeoutMs || 5 * 60 * 1000  // 5 minutes default
    const maxOutputBytes = options?.maxOutputBytes || 10 * 1024 * 1024 // 10MB default
    
    console.log('🚀 Executing command:', {
      command: fullCommand,
      workingDirectory,
      timeoutMs,
      maxOutputBytes,
      timestamp: new Date().toISOString()
    })

    const terraform = spawn('terraform', [command, ...args], {
      cwd: workingDirectory,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: env || process.env
    })

    let output = ''
    let error = ''
    let outputTruncated = false
    let errorTruncated = false
    let timedOut = false
    let processKilled = false

    // Setup timeout
    const timeoutId = setTimeout(() => {
      timedOut = true
      processKilled = true
      terraform.kill('SIGTERM')
      
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (!terraform.killed) {
          terraform.kill('SIGKILL')
        }
      }, 5000)
      
      console.error('⏰ Terraform command timed out:', {
        command: fullCommand,
        timeoutMs,
        outputLength: output.length,
        errorLength: error.length
      })
    }, timeoutMs)

    terraform.stdout?.on('data', (data) => {
      const chunk = data.toString()
      
      // Check output size limit
      if (output.length + chunk.length > maxOutputBytes) {
        if (!outputTruncated) {
          const remaining = maxOutputBytes - output.length
          output += chunk.substring(0, remaining)
          output += '\n\n[... Output truncated due to size limit ...]\n'
          outputTruncated = true
          console.warn('⚠️ Terraform stdout truncated at max size:', maxOutputBytes)
        }
      } else {
        output += chunk
        console.log('📤 Terraform stdout:', chunk.trim().substring(0, 200))
      }
    })

    terraform.stderr?.on('data', (data) => {
      const chunk = data.toString()
      
      // Check error size limit
      if (error.length + chunk.length > maxOutputBytes) {
        if (!errorTruncated) {
          const remaining = maxOutputBytes - error.length
          error += chunk.substring(0, remaining)
          error += '\n\n[... Error output truncated due to size limit ...]\n'
          errorTruncated = true
          console.warn('⚠️ Terraform stderr truncated at max size:', maxOutputBytes)
        }
      } else {
        error += chunk
        console.log('📥 Terraform stderr:', chunk.trim().substring(0, 200))
      }
    })

    terraform.on('close', (code) => {
      clearTimeout(timeoutId)
      
      console.log('🏁 Terraform command finished:', {
        command: fullCommand,
        exitCode: code,
        success: code === 0 && !timedOut,
        outputLength: output.length,
        errorLength: error.length,
        outputTruncated,
        errorTruncated,
        timedOut,
        processKilled
      })
      
      if (timedOut) {
        resolve({
          success: false,
          output,
          error: `Command timed out after ${timeoutMs}ms. ${error}`,
          exitCode: 124 // Standard timeout exit code
        })
      } else {
        resolve({
          success: code === 0,
          output: outputTruncated ? output : output,
          error: errorTruncated || error ? error || undefined : undefined,
          exitCode: code || 1
        })
      }
    })

    terraform.on('error', (err) => {
      clearTimeout(timeoutId)
      
      console.error('💥 Terraform spawn error:', {
        command: fullCommand,
        error: err.message,
        code: (err as any).code
      })
      
      resolve({
        success: false,
        output,
        error: err.message,
        exitCode: 1
      })
    })
  })
}
