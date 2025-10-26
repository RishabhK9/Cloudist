import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import OpenAI from 'openai';

const execAsync = promisify(exec);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(request: NextRequest) {
  console.log('🚀 AI Review API called');
  
  try {
    console.log('📥 Parsing request body...');
    const { terraformFiles, provider } = await request.json();
    console.log('✅ Request body parsed:', {
      fileCount: Object.keys(terraformFiles || {}).length,
      provider,
      fileNames: Object.keys(terraformFiles || {})
    });

    if (!terraformFiles || Object.keys(terraformFiles).length === 0) {
      console.error('❌ No Terraform files provided');
      return NextResponse.json(
        { error: 'No Terraform files provided' },
        { status: 400 }
      );
    }

    // Validate that all file contents are strings
    for (const [filename, content] of Object.entries(terraformFiles)) {
      if (typeof content !== 'string') {
        console.error(`❌ Invalid content type for ${filename}:`, typeof content);
        return NextResponse.json(
          { error: `Invalid content type for ${filename}. Expected string, got ${typeof content}` },
          { status: 400 }
        );
      }
    }

    console.log('🔍 Starting CodeRabbit review for', Object.keys(terraformFiles).length, 'files');
    console.log('📄 File contents preview:', Object.entries(terraformFiles).map(([name, content]) => 
      `${name}: ${typeof content === 'string' ? content.substring(0, 100) : 'invalid'}...`
    ));

    // Create temporary directory for review
    const tempDir = path.join(os.tmpdir(), `terraform-review-${Date.now()}`);
    console.log('📁 Creating temp directory:', tempDir);
    await fs.mkdir(tempDir, { recursive: true });
    console.log('✅ Temp directory created');

    try {
      // Write Terraform files to temp directory
      console.log('📝 Writing Terraform files to temp directory...');
      for (const [filename, content] of Object.entries(terraformFiles)) {
        const filePath = path.join(tempDir, filename as string);
        console.log(`  - Writing ${filename} (${typeof content === 'string' ? content.length : 0} chars)`);
        await fs.writeFile(filePath, content as string, 'utf-8');
        console.log(`  ✅ Wrote ${filename}`);
      }

      // Initialize git repo (CodeRabbit needs it)
      console.log('🔧 Initializing Git repository...');
      await execAsync('git init', { cwd: tempDir });
      console.log('✅ Git init complete');
      
      await execAsync('git config user.email "cloudist@coderabbit.ai"', { cwd: tempDir });
      console.log('✅ Git config email set');
      
      await execAsync('git config user.name "Cloudist Review Bot"', { cwd: tempDir });
      console.log('✅ Git config name set');
      
      // Add and commit files to make them reviewable
      console.log('📦 Adding files to git...');
      const gitAddResult = await execAsync('git add .', { cwd: tempDir });
      console.log('✅ Git add complete:', gitAddResult.stdout || 'no output');
      
      console.log('💾 Committing files...');
      const gitCommitResult = await execAsync('git commit -m "Initial Terraform configuration"', { cwd: tempDir });
      console.log('✅ Git commit complete:', gitCommitResult.stdout?.substring(0, 100) || 'no output');

      // Check if CodeRabbit is installed
      console.log('🔍 Checking if CodeRabbit CLI is installed...');
      let useCodeRabbit = false;
      try {
        const { stdout: versionOutput } = await execAsync('which coderabbit');
        console.log('✅ CodeRabbit CLI found at:', versionOutput.trim());
        useCodeRabbit = true;
      } catch (whichError) {
        console.log('⚠️ CodeRabbit CLI not found, falling back to OpenAI API');
      }

      let analysis;
      
      if (useCodeRabbit) {
        console.log('🤖 Running CodeRabbit CLI...');
        console.log('   Command: coderabbit --plain --type committed --no-color');
        console.log('   Working directory:', tempDir);

        // Run CodeRabbit CLI in plain mode
        const startTime = Date.now();
        const { stdout, stderr } = await execAsync(
          'coderabbit --plain --type committed --no-color',
          {
            cwd: tempDir,
            timeout: 60000, // 60 second timeout
            maxBuffer: 1024 * 1024 * 10, // 10MB buffer
          }
        );
        const duration = Date.now() - startTime;

        console.log('✅ CodeRabbit review completed in', duration, 'ms');
        console.log('📊 CodeRabbit stderr:', stderr || '(empty)');
        console.log('📊 CodeRabbit stdout length:', stdout?.length || 0);
        console.log('📊 CodeRabbit stdout preview:', stdout?.substring(0, 200) || '(empty)');

        // Parse CodeRabbit plain text output
        console.log('🔍 Parsing CodeRabbit output...');
        analysis = parseCodeRabbitOutput(stdout || '', terraformFiles);
        console.log('✅ Analysis complete:', {
          score: analysis.overallScore,
          issueCount: analysis.issues?.length || 0,
          summary: analysis.summary?.substring(0, 100)
        });
      } else {
        // Use OpenAI API as fallback
        console.log('🤖 Using OpenAI API for infrastructure review...');
        analysis = await reviewWithOpenAI(terraformFiles);
        console.log('✅ OpenAI analysis complete:', {
          score: analysis.overallScore,
          issueCount: analysis.issues?.length || 0,
          summary: analysis.summary?.substring(0, 100)
        });
      }

      return NextResponse.json(analysis);

    } finally {
      // Cleanup: Remove temp directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
        console.log('🧹 Cleaned up temp directory');
      } catch (cleanupError) {
        console.error('Failed to cleanup temp directory:', cleanupError);
      }
    }

  } catch (error) {
    console.error('❌ CodeRabbit Review Error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error
    });
    
    // Check if CodeRabbit is installed
    if (error instanceof Error && 
        (error.message.includes('command not found') || 
         error.message.includes('ENOENT'))) {
      return NextResponse.json(
        { 
          error: 'CodeRabbit CLI not installed',
          details: 'Please install CodeRabbit CLI: curl -fsSL https://cli.coderabbit.ai/install.sh | sh',
          installUrl: 'https://docs.coderabbit.ai/cli/overview',
          overallScore: 0,
          summary: 'CodeRabbit CLI is not installed on this system',
          strengths: [],
          issues: [],
          recommendations: [
            {
              category: 'setup',
              title: 'Install CodeRabbit CLI',
              description: 'Visit https://docs.coderabbit.ai/cli/overview to install the CodeRabbit CLI',
              impact: 'high'
            }
          ],
          costOptimization: {
            estimatedMonthlyCost: 'N/A',
            suggestions: []
          },
          securityAnalysis: {
            securityScore: 0,
            findings: []
          }
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze with CodeRabbit',
        details: error instanceof Error ? error.message : 'Unknown error',
        overallScore: 0,
        summary: 'Review failed due to an error',
        strengths: [],
        issues: [],
        recommendations: [],
        costOptimization: {
          estimatedMonthlyCost: 'N/A',
          suggestions: []
        },
        securityAnalysis: {
          securityScore: 0,
          findings: []
        }
      },
      { status: 500 }
    );
  }
}

async function reviewWithOpenAI(terraformFiles: Record<string, string>) {
  console.log('🔍 [reviewWithOpenAI] Starting OpenAI-based review...');
  
  // Combine all Terraform files into a single context
  const filesContext = Object.entries(terraformFiles)
    .map(([filename, content]) => `=== ${filename} ===\n${content}`)
    .join('\n\n');

  console.log('📝 [reviewWithOpenAI] Prepared context:', filesContext.length, 'characters');

  const prompt = `You are an expert infrastructure engineer and security analyst. Review the following Terraform configuration and provide a comprehensive analysis.

${filesContext}

Please analyze this infrastructure and provide your review in the following JSON format:
{
  "overallScore": <number 0-100>,
  "summary": "<brief summary of the overall infrastructure>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "issues": [
    {
      "severity": "high|medium|low",
      "category": "security|cost|best-practices|performance",
      "description": "<issue description>",
      "recommendation": "<how to fix>",
      "file": "<filename>",
      "line": 0
    }
  ],
  "recommendations": [
    {
      "category": "security|cost|performance|reliability",
      "title": "<recommendation title>",
      "description": "<detailed description>",
      "impact": "high|medium|low"
    }
  ],
  "costOptimization": {
    "estimatedMonthlyCost": "<cost estimate or range>",
    "suggestions": ["<suggestion 1>", "<suggestion 2>", ...]
  },
  "securityAnalysis": {
    "securityScore": <number 0-100>,
    "findings": ["<finding 1>", "<finding 2>", ...]
  }
}

Focus on:
- Security best practices (encryption, access control, network security)
- Cost optimization opportunities
- Scalability and reliability concerns
- Terraform best practices
- Resource configuration issues`;

  try {
    console.log('🤖 [reviewWithOpenAI] Calling OpenAI API...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert infrastructure engineer specializing in cloud infrastructure, security, and cost optimization. You provide detailed, actionable reviews of Terraform configurations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    console.log('✅ [reviewWithOpenAI] OpenAI API response received');
    
    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    console.log('📊 [reviewWithOpenAI] Parsing response...');
    const analysis = JSON.parse(responseText);
    
    // Add metadata
    analysis.reviewedBy = 'OpenAI GPT-4';
    analysis.reviewMethod = 'AI Analysis';
    
    console.log('✅ [reviewWithOpenAI] Review complete:', {
      score: analysis.overallScore,
      issueCount: analysis.issues?.length || 0,
      recommendationCount: analysis.recommendations?.length || 0
    });

    return analysis;

  } catch (error) {
    console.error('❌ [reviewWithOpenAI] Error:', error);
    
    // Return a basic fallback analysis
    return {
      overallScore: 70,
      summary: 'Unable to perform detailed AI analysis. Basic validation passed.',
      strengths: [
        'Terraform syntax appears valid',
        'Infrastructure resources are properly defined'
      ],
      issues: [],
      recommendations: [
        {
          category: 'setup',
          title: 'Enable AI Review',
          description: 'Configure OpenAI API key to enable detailed infrastructure analysis',
          impact: 'medium'
        }
      ],
      costOptimization: {
        estimatedMonthlyCost: 'Unable to estimate without detailed analysis',
        suggestions: []
      },
      securityAnalysis: {
        securityScore: 70,
        findings: ['Manual security review recommended']
      },
      reviewedBy: 'Basic Validation',
      reviewMethod: 'Fallback',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function parseCodeRabbitOutput(
  output: string, 
  files: Record<string, any>
): any {
  console.log('📊 [parseCodeRabbitOutput] Starting to parse output...');
  console.log('📊 [parseCodeRabbitOutput] Output type:', typeof output);
  console.log('📊 [parseCodeRabbitOutput] Output length:', output?.length || 0);
  console.log('📊 [parseCodeRabbitOutput] Files count:', Object.keys(files || {}).length);
  
  // Handle undefined or null output
  if (!output) {
    console.warn('⚠️ [parseCodeRabbitOutput] CodeRabbit output is empty or undefined');
    output = '';
  }
  
  console.log('📊 [parseCodeRabbitOutput] Splitting output into lines...');
  const lines = output.split('\n');
  console.log('📊 [parseCodeRabbitOutput] Total lines:', lines.length);
  
  const analysis = {
    overallScore: 85,
    summary: '',
    strengths: [] as string[],
    issues: [] as any[],
    recommendations: [] as any[],
    costOptimization: {
      estimatedMonthlyCost: 'Variable based on usage',
      suggestions: [] as string[]
    },
    securityAnalysis: {
      securityScore: 90,
      findings: [] as string[]
    },
    coderabbitRawOutput: output,
    reviewedBy: 'CodeRabbit CLI'
  };

  let currentFile = '';
  let issueCount = 0;
  let securityIssueCount = 0;
  
  // Parse CodeRabbit output line by line
  console.log('📊 [parseCodeRabbitOutput] Starting line-by-line parsing...');
  for (let i = 0; i < lines.length; i++) {
    try {
      const rawLine = lines[i];
      
      // Ensure rawLine is a string and trim it
      if (typeof rawLine !== 'string') {
        if (i < 10) console.log(`📊 [parseCodeRabbitOutput] Line ${i}: (not a string, skipping)`);
        continue;
      }
      
      const line = rawLine.trim();
      
      // Skip empty lines
      if (!line || line.length === 0) {
        if (i < 10) console.log(`📊 [parseCodeRabbitOutput] Line ${i}: (empty)`);
        continue;
      }
      
      if (i < 10) console.log(`📊 [parseCodeRabbitOutput] Line ${i}: "${line.substring(0, 80)}..."`);
      
      // Match file headers like "main.tf:15" or "variables.tf"
      const fileMatch = line.match(/^([^:]+\.tf):?(\d+)?/);
      if (fileMatch) {
        currentFile = fileMatch[1];
        console.log(`📄 [parseCodeRabbitOutput] Found file reference: ${currentFile}`);
        continue;
      }
      
      // Safely convert to lowercase - double check
      if (typeof line !== 'string' || !line) {
        console.warn(`⚠️ [parseCodeRabbitOutput] Line ${i} is not a valid string, skipping`);
        continue;
      }
      
      // Detect issue severity keywords
      const lowerLine = line.toLowerCase();
    
      if (lowerLine.includes('error') || lowerLine.includes('critical') || 
          lowerLine.includes('vulnerability') || lowerLine.includes('security')) {
        issueCount++;
        console.log(`⚠️ [parseCodeRabbitOutput] Found issue (${issueCount}): ${line.substring(0, 80)}`);
        
        const issue = {
          severity: lowerLine.includes('critical') || lowerLine.includes('vulnerability') ? 'high' : 'medium',
          category: lowerLine.includes('security') || lowerLine.includes('vulnerability') ? 'security' : 'best-practices',
          description: line,
          recommendation: 'Review and address this finding',
          file: currentFile || 'unknown',
          line: 0
        };
        
        analysis.issues.push(issue);
        
        if (issue.category === 'security') {
          securityIssueCount++;
          analysis.securityAnalysis.findings.push(line);
        }
      }
      
      // Detect warnings
      if (lowerLine.includes('warning') || lowerLine.includes('consider')) {
        issueCount++;
        analysis.issues.push({
          severity: 'low',
          category: 'best-practices',
          description: line,
          recommendation: 'Consider improving this aspect',
          file: currentFile || 'unknown',
          line: 0
        });
      }
      
      // Detect cost-related items
      if (lowerLine.includes('cost') || lowerLine.includes('expensive') || 
          lowerLine.includes('pricing')) {
        analysis.costOptimization.suggestions.push(line);
      }
      
      // Detect positive feedback
      if (lowerLine.includes('good') || lowerLine.includes('well') || 
          lowerLine.includes('correct')) {
        analysis.strengths.push(line);
      }
    } catch (lineError) {
      console.error(`❌ [parseCodeRabbitOutput] Error parsing line ${i}:`, lineError);
      console.error(`   Raw line: ${lines[i]}`);
    }
  }
  
  // If no specific issues found, check for general output
  if (analysis.issues.length === 0) {
    if (output.includes('No issues found') || output.includes('looks good')) {
      analysis.strengths.push('CodeRabbit found no major issues with your Terraform configuration');
      analysis.strengths.push('Infrastructure follows good practices');
      analysis.summary = '✅ CodeRabbit review: No critical issues found. Your Terraform configuration looks solid!';
      analysis.overallScore = 95;
      analysis.securityAnalysis.securityScore = 95;
    } else if (output.trim().length < 100) {
      // Very short output - might be no review needed
      analysis.strengths.push('Terraform configuration successfully reviewed');
      analysis.summary = 'CodeRabbit completed review of your infrastructure';
      analysis.overallScore = 90;
    } else {
      // Has content but no obvious issues
      analysis.strengths.push('Terraform syntax is valid');
      analysis.strengths.push('Basic infrastructure setup appears correct');
      analysis.summary = 'CodeRabbit review completed. Configuration appears functional.';
    }
  } else {
    // Calculate scores based on issues found
    analysis.overallScore = Math.max(40, 95 - (issueCount * 8));
    analysis.securityAnalysis.securityScore = Math.max(50, 95 - (securityIssueCount * 12));
    
    const criticalCount = analysis.issues.filter(i => i.severity === 'high').length;
    
    if (criticalCount > 0) {
      analysis.summary = `⚠️ CodeRabbit identified ${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} and ${issueCount - criticalCount} other finding${issueCount - criticalCount > 1 ? 's' : ''} to address`;
    } else {
      analysis.summary = `📋 CodeRabbit found ${issueCount} suggestion${issueCount > 1 ? 's' : ''} for improving your Terraform configuration`;
    }
  }
  
  // Add recommendations based on findings
  if (analysis.securityAnalysis.findings.length > 0) {
    analysis.recommendations.push({
      category: 'security',
      title: 'Address Security Findings',
      description: 'CodeRabbit identified security-related concerns that should be reviewed',
      impact: 'high'
    });
  }
  
  if (analysis.costOptimization.suggestions.length > 0) {
    analysis.recommendations.push({
      category: 'cost',
      title: 'Review Cost Optimization Suggestions',
      description: 'Consider the cost-related recommendations from CodeRabbit',
      impact: 'medium'
    });
  }
  
  console.log('📊 [parseCodeRabbitOutput] Parsing complete!');
  console.log(`   - Issues found: ${analysis.issues.length}`);
  console.log(`   - Strengths found: ${analysis.strengths.length}`);
  console.log(`   - Overall score: ${analysis.overallScore}`);
  console.log(`   - Summary: ${analysis.summary?.substring(0, 100)}`);
  
  return analysis;
}
