import { NextRequest, NextResponse } from 'next/server'
import { SupabaseApiService } from '@/lib/supabase-api-service'

export interface SupabaseStatusRequest {
  projectId: string
  credentials: {
    accessToken: string
    organizationId?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SupabaseStatusRequest = await request.json()
    console.log('🔍 Checking Supabase project status:', body.projectId)

    if (!body.projectId || !body.credentials) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Initialize Supabase API service
    const supabaseApi = new SupabaseApiService(body.credentials)

    // Get project details
    const project = await supabaseApi.getProject(body.projectId)

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        region: project.region,
        createdAt: project.created_at,
        database: project.database,
      },
    })
  } catch (error) {
    console.error('❌ Failed to get Supabase project status:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}

