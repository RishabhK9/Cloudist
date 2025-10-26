import { NextRequest, NextResponse } from 'next/server'
import { SupabaseApiService } from '@/lib/supabase-api-service'

export interface SupabaseTestRequest {
  credentials: {
    accessToken: string
  }
}

export interface SupabaseTestResult {
  success: boolean
  organizationCount?: number
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SupabaseTestRequest = await request.json()
    
    if (!body.credentials?.accessToken) {
      return NextResponse.json(
        { success: false, error: 'Access token is required' },
        { status: 400 }
      )
    }

    // Initialize Supabase API service
    const supabaseApi = new SupabaseApiService(body.credentials)

    // Test credentials by listing organizations
    const orgs = await supabaseApi.listOrganizations()
    
    const result: SupabaseTestResult = {
      success: true,
      organizationCount: orgs.length,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ Supabase credential test failed:', error)
    
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
