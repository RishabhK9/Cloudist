import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

function getBlockTypeMapping(provider: string): string {
  if (provider === 'aws') {
    return `
- ec2 → aws_instance (virtual machine)
- s3 → aws_s3_bucket (object storage)
- rds → aws_db_instance (relational database)
- lambda → aws_lambda_function (serverless function)
- dynamodb → aws_dynamodb_table (NoSQL database)
- vpc → aws_vpc (virtual private cloud)
- subnet → aws_subnet
- security_group → aws_security_group
- elb → aws_lb (load balancer)
- api_gateway → aws_api_gateway_rest_api
- cloudfront → aws_cloudfront_distribution
- route53 → aws_route53_zone
- iam_role → aws_iam_role
- sns → aws_sns_topic
- sqs → aws_sqs_queue
- ecs → aws_ecs_cluster
- eks → aws_eks_cluster
`
  } else if (provider === 'gcp') {
    return `
- compute → google_compute_instance
- storage → google_storage_bucket
- sql → google_sql_database_instance
- functions → google_cloudfunctions_function
- gke → google_container_cluster
`
  } else if (provider === 'azure') {
    return `
- vm → azurerm_virtual_machine
- storage → azurerm_storage_account
- sql → azurerm_sql_server
- functions → azurerm_function_app
- aks → azurerm_kubernetes_cluster
`
  }
  return ''
}

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
        type: block.type,  // Service type (ec2, s3, rds, etc.)
        name: block.name,
        config: block.config || {},
        position: { x: block.x, y: block.y }
      })),
      connections: connections?.map((conn: any) => ({
        id: conn.id,
        from: conn.from,
        to: conn.to,
        sourceHandle: conn.sourceHandle,
        targetHandle: conn.targetHandle
      })) || []
    }

    const prompt = `You are a Terraform code generator. Your task is to generate clean, production-ready Terraform code.

**CRITICAL INSTRUCTIONS:**
- Return ONLY valid Terraform (.tf) code syntax
- Do NOT include ANY text that is not valid Terraform syntax
- Do NOT add usage instructions, setup steps, or notes after the code
- Do NOT add explanatory paragraphs about how to use the code
- Start each logical file section with a comment marker: # === filename.tf ===
- Use these file markers to organize your code:
  * # === terraform.tf === (for terraform {} block)
  * # === provider.tf === (for provider configuration)
  * # === main.tf === (for all resource blocks)
  * # === variables.tf === (for variable declarations)
  * # === outputs.tf === (for output declarations)
  * # === data.tf === (for data source blocks, if any)
- End with the last closing brace of your final resource/output/variable block

**Infrastructure Components:**
${JSON.stringify(infrastructureContext.blocks, null, 2)}

**Connections Between Components:**
${JSON.stringify(infrastructureContext.connections, null, 2)}

**Block Type Mappings for ${provider.toUpperCase()}:**
${getBlockTypeMapping(provider)}

**Requirements:**
1. Generate complete, valid Terraform code that can be deployed immediately
2. Use the ${provider.toUpperCase()} provider
3. For EACH block in the infrastructure components, create a corresponding resource block based on its "type" field
4. Map block types to actual ${provider.toUpperCase()} resources (e.g., "ec2" → "aws_instance", "s3" → "aws_s3_bucket")
5. Include proper resource dependencies based on the connections (use depends_on or reference other resources)
6. Add appropriate variables for sensitive data (passwords, keys, etc.)
7. Include outputs for important resource attributes (ARNs, endpoints, URLs)
8. Use best practices for naming and tagging
9. Add inline comments (using #) to explain each resource
10. Structure the code properly with terraform block, provider block, and ALL resource blocks

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

    console.log('🤖 Calling OpenAI API for Terraform generation...')

    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 8192,
      temperature: 0.2, // Lower temperature for more consistent, focused code generation
      system: `You are a Terraform code generator. 

CRITICAL RULES:
1. Output ONLY valid Terraform (.tf) syntax - nothing else
2. Create a resource block for EVERY block listed in the infrastructure components
3. Do NOT skip any blocks - each must have a corresponding Terraform resource
4. Use the block's "type" field to determine which Terraform resource to create
5. Use the block's "config" for resource properties
6. Do NOT include usage instructions, setup steps, or explanatory notes
7. Your entire response must be valid HCL that can be saved directly to a .tf file
8. End your response immediately after the last closing brace

FILE ORGANIZATION (CRITICAL):
- Start each file section with: # === filename.tf ===
- Use these exact markers:
  * # === terraform.tf === (terraform block and required_providers)
  * # === provider.tf === (provider configuration)
  * # === main.tf === (all resource blocks)
  * # === variables.tf === (all variable declarations)
  * # === outputs.tf === (all output declarations)
  * # === data.tf === (data source blocks, if needed)

EXAMPLE OUTPUT FORMAT:
# === terraform.tf ===
terraform { ... }

# === provider.tf ===
provider "aws" { ... }

# === main.tf ===
resource "aws_instance" "..." { ... }
resource "aws_s3_bucket" "..." { ... }

# === variables.tf ===
variable "region" { ... }

# === outputs.tf ===
output "instance_id" { ... }`,
      messages: [
        {
          role: 'system',
          content: 'You are a Terraform code generator. Output ONLY valid Terraform (.tf) syntax. Do NOT include usage instructions, setup steps, explanatory notes, or any text that is not valid Terraform code. Your entire response must be valid HCL that can be saved directly to a .tf file and executed with terraform commands. End your response immediately after the last closing brace of your code.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    console.log('✅ OpenAI response received')

    // Extract the generated Terraform code
    const terraformCode = response.choices[0]?.message?.content

    if (!terraformCode) {
      throw new Error('No Terraform code generated')
    }

    // Clean up only markdown code fences if OpenAI adds them despite instructions
    let cleanedTerraformCode = terraformCode
      .replace(/```terraform\n?/g, '')
      .replace(/```hcl\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    console.log('📝 Generated Terraform code length:', terraformCode.length)
    console.log('\n' + '='.repeat(80))
    console.log('📄 FULL GENERATED TERRAFORM CODE:')
    console.log('='.repeat(80))
    console.log(terraformCode)
    console.log('='.repeat(80) + '\n')
    console.log('✅ Terraform generation complete')

    return NextResponse.json({
      success: true,
      terraformCode: cleanedTerraformCode,
      metadata: {
        blocksCount: blocks.length,
        connectionsCount: connections?.length || 0,
        provider,
        codeLength: terraformCode.length
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
