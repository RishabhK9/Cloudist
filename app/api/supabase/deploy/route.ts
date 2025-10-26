import { NextRequest, NextResponse } from 'next/server'
import { SupabaseApiService } from '@/lib/supabase-api-service'
import type { Node, Edge } from '@xyflow/react'

export interface SupabaseDeploymentRequest {
  name: string
  nodes: Node[]
  edges: Edge[]
  credentials: {
    accessToken: string
    organizationId?: string
  }
}

export interface SupabaseDeploymentResult {
  success: boolean
  projectId?: string
  projectUrl?: string
  anonKey?: string
  serviceRoleKey?: string
  databaseHost?: string
  databaseName?: string
  error?: string
  logs?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body: SupabaseDeploymentRequest = await request.json()
    console.log('🚀 Supabase deployment request:', {
      name: body.name,
      nodeCount: body.nodes?.length || 0,
      hasCredentials: !!body.credentials,
    })

    // Validate request
    if (!body.name || !body.nodes || !body.credentials) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Extract database configuration from nodes
    const databaseNode = body.nodes.find(
      (node) => node.data?.provider === 'supabase' && node.data?.id === 'database'
    )

    if (!databaseNode) {
      return NextResponse.json(
        { success: false, error: 'No Supabase database node found in deployment' },
        { status: 400 }
      )
    }

    const config = databaseNode.data.config as any
    console.log('📋 Database config:', config)

    // Validate database configuration
    if (!config?.project_name || !config?.db_password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database configuration incomplete. Please provide project name and password.',
        },
        { status: 400 }
      )
    }

    // Initialize Supabase API service
    const supabaseApi = new SupabaseApiService(body.credentials)

    // Get organization ID if not provided
    let organizationId = body.credentials.organizationId
    if (!organizationId) {
      console.log('🔍 Fetching organization ID...')
      const orgs = await supabaseApi.listOrganizations()
      if (orgs.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'No organizations found. Please ensure you have access to a Supabase organization.',
          },
          { status: 400 }
        )
      }
      organizationId = orgs[0].id
      console.log('✅ Using organization:', organizationId)
    }

    const logs: string[] = []
    logs.push('Starting Supabase project creation...')
    logs.push(`Project name: ${config.project_name}`)
    logs.push(`Region: ${config.region || 'us-east-1'}`)
    logs.push(`Plan: ${config.plan || 'free'}`)

    // Create the Supabase project
    console.log('🏗️ Creating Supabase project...')
    logs.push('Creating project via Supabase Management API...')

    const project = await supabaseApi.createProject({
      name: config.project_name,
      organization_id: organizationId,
      db_pass: config.db_password,
      region: config.region || 'us-east-1',
      plan: config.plan || 'free',
      // db_version is not supported - Supabase uses latest stable version
    })

    console.log('✅ Project created:', project.id)
    logs.push(`Project created with ID: ${project.id}`)

    // Wait for project to be ready
    console.log('⏳ Waiting for project to be ready...')
    logs.push('Waiting for project to be fully provisioned...')

    const readyProject = await supabaseApi.waitForProjectReady(project.id, 60, 5000)
    console.log('✅ Project is ready:', readyProject.status)
    logs.push('Project is ready!')

    // Get API keys
    console.log('🔑 Fetching API keys...')
    logs.push('Retrieving API keys...')

    const apiKeys = await supabaseApi.getProjectApiKeys(project.id)
    console.log('✅ API keys retrieved')
    logs.push('API keys retrieved successfully')

    // Build project URL
    const projectUrl = `https://${project.id}.supabase.co`

    const result: SupabaseDeploymentResult = {
      success: true,
      projectId: project.id,
      projectUrl,
      anonKey: apiKeys.anon,
      serviceRoleKey: apiKeys.service_role,
      databaseHost: project.database?.host || readyProject.database?.host,
      databaseName: 'postgres',
      logs,
    }

    console.log('🎉 Supabase deployment successful!')
    logs.push('Deployment completed successfully!')

    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ Supabase deployment failed:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        logs: [`Error: ${errorMessage}`],
      },
      { status: 500 }
    )
  }
}
