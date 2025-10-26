import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Terraform Generate API: Received request')
    
    const body = await request.json()
    const { blocks, connections, provider = 'aws' } = body

    console.log('📦 Blocks:', blocks?.length || 0)
    console.log('🔗 Connections:', connections?.length || 0)
    console.log('☁️ Provider:', provider)

    if (!blocks || blocks.length === 0) {
      return NextResponse.json(
        { error: 'No infrastructure blocks provided' },
        { status: 400 }
      )
    }

    // Build context for Claude
    const infrastructureContext = {
      blocks: blocks.map((block: any) => ({
        id: block.id,
        name: block.name,
        service: block.service,
        provider: block.provider,
        config: block.config
      })),
      connections: connections?.map((conn: any) => ({
        source: conn.source,
        target: conn.target
      })) || []
    }

    const prompt = `You are a Terraform code generator. Your task is to generate clean, production-ready Terraform code.

**CRITICAL INSTRUCTIONS:**
- Return ONLY valid Terraform (.tf) code syntax
- Do NOT include ANY text that is not valid Terraform syntax
- Do NOT add usage instructions, setup steps, or notes after the code
- Do NOT add explanatory paragraphs about how to use the code
- Start immediately with Terraform syntax (comments using # are allowed)
- End with the last closing brace of your final resource/output/variable block

**Infrastructure Components:**
${JSON.stringify(infrastructureContext.blocks, null, 2)}

**Connections:**
${JSON.stringify(infrastructureContext.connections, null, 2)}

**Requirements:**
1. Generate complete, valid Terraform code that can be deployed immediately
2. Use the ${provider.toUpperCase()} provider
3. Include proper resource dependencies based on the connections
4. Add appropriate variables for sensitive data (passwords, keys, etc.)
5. Include outputs for important resource attributes (ARNs, endpoints, URLs)
6. Use best practices for naming and tagging
7. Add inline comments (using #) to explain resources
8. Structure the code properly with terraform block, provider block, and resources

**STRICT Output Rules:**
✅ ALLOWED:
- terraform {} blocks
- provider {} blocks
- resource {} blocks
- variable {} blocks
- output {} blocks
- data {} blocks
- module {} blocks
- Comments starting with # (inline in the code)

❌ FORBIDDEN:
- Text before the first Terraform block
- Text after the last closing brace
- Usage instructions (e.g., "To use this configuration...")
- Setup steps (e.g., "1. Create a terraform.tfvars file...")
- Notes or explanations outside of # comments
- Markdown code fences
- Any prose or natural language paragraphs

Your response must be 100% valid .tf file syntax that can be directly saved and run with terraform commands.`

    console.log('🤖 Calling Claude API for Terraform generation...')

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8192,
      temperature: 0.2, // Lower temperature for more consistent, focused code generation
      system: 'You are a Terraform code generator. Output ONLY valid Terraform (.tf) syntax. Do NOT include usage instructions, setup steps, explanatory notes, or any text that is not valid Terraform code. Your entire response must be valid HCL that can be saved directly to a .tf file and executed with terraform commands. End your response immediately after the last closing brace of your code.',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    console.log('✅ Claude response received')

    // Extract the generated Terraform code
    const textContent = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    )

    if (!textContent?.text) {
      throw new Error('No Terraform code generated')
    }

    let terraformCode = textContent.text

    // Clean up only markdown code fences if Claude adds them despite instructions
    terraformCode = terraformCode
      .replace(/```terraform\n?/g, '')
      .replace(/```hcl\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    console.log('📝 Generated Terraform code length:', terraformCode.length)
    console.log('✅ Terraform generation complete')

    return NextResponse.json({
      success: true,
      terraformCode,
      metadata: {
        blocksCount: blocks.length,
        connectionsCount: connections?.length || 0,
        provider
      }
    })

  } catch (error) {
    console.error('❌ Terraform generation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate Terraform code',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
