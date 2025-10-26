import { spawn } from 'child_process'
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { CredentialManager } from '@/lib/credential-manager'

export async function POST(request: NextRequest) {
  let tempDir: string | null = null
  
  try {
    const body = await request.json()
    const { terraformCode, provider = 'aws', workingDirectory, planFile, autoApprove = true, credentials } = body
    
    console.log('🚀 Terraform Apply API called:', {
      hasTerraformCode: !!terraformCode,
      workingDirectory,
      planFile,
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

    // If terraformCode is provided, create a temporary directory
    if (terraformCode) {
      tempDir = join(tmpdir(), `terraform-apply-${randomUUID()}`)
      mkdirSync(tempDir, { recursive: true })
      console.log('📁 Created temporary directory:', tempDir)

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
    }

    const args = []
    if (planFile) {
      args.push(planFile)
      console.log('📋 Using plan file:', planFile)
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
  env?: NodeJS.ProcessEnv
): Promise<{ success: boolean; output: string; error?: string; exitCode: number }> {
  return new Promise((resolve) => {
    const fullCommand = `terraform ${command} ${args.join(' ')}`
    console.log('🚀 Executing command:', {
      command: fullCommand,
      workingDirectory,
      timestamp: new Date().toISOString()
    })

    const terraform = spawn('terraform', [command, ...args], {
      cwd: workingDirectory,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: env || process.env
    })

    let output = ''
    let error = ''

    terraform.stdout?.on('data', (data) => {
      const chunk = data.toString()
      output += chunk
      console.log('📤 Terraform stdout:', chunk.trim())
    })

    terraform.stderr?.on('data', (data) => {
      const chunk = data.toString()
      error += chunk
      console.log('📥 Terraform stderr:', chunk.trim())
    })

    terraform.on('close', (code) => {
      console.log('🏁 Terraform command finished:', {
        command: fullCommand,
        exitCode: code,
        success: code === 0,
        outputLength: output.length,
        errorLength: error.length
      })
      
      resolve({
        success: code === 0,
        output,
        error: error || undefined,
        exitCode: code || 1
      })
    })

    terraform.on('error', (err) => {
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
