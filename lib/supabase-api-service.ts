import { SupabaseCredentials } from '@/lib/credential-manager'

const SUPABASE_API_BASE_URL = 'https://api.supabase.com/v1'

export interface SupabaseProject {
  id: string
  organization_id: string
  name: string
  region: string
  created_at: string
  database: {
    host: string
    version: string
  }
  status: 'ACTIVE_HEALTHY' | 'ACTIVE_UNHEALTHY' | 'COMING_UP' | 'GOING_DOWN' | 'INACTIVE' | 'PAUSING' | 'PAUSED' | 'RESTORING' | 'UPGRADING' | 'UNKNOWN'
}

export interface SupabaseProjectConfig {
  name: string
  organization_id: string
  db_pass: string
  region: string
  plan?: string
  db_version?: string
}

export interface SupabaseProjectResponse {
  id: string
  organization_id: string
  name: string
  region: string
  created_at: string
  database: {
    host: string
    version: string
  }
  // Connection info returned on creation
  db_host?: string
  db_port?: number
  db_user?: string
  db_name?: string
  jwt_secret?: string
  anon_key?: string
  service_role_key?: string
  project_url?: string
}

export interface SupabaseOrganization {
  id: string
  name: string
  slug: string
}

/**
 * Service for interacting with Supabase Management API
 */
export class SupabaseApiService {
  private accessToken: string

  constructor(credentials: SupabaseCredentials) {
    this.accessToken = credentials.accessToken
  }

  /**
   * Get authorization headers for API requests
   */
  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    }
  }

  /**
   * Create a new Supabase project
   */
  async createProject(config: SupabaseProjectConfig): Promise<SupabaseProjectResponse> {
    try {
      const response = await fetch(`${SUPABASE_API_BASE_URL}/projects`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          name: config.name,
          organization_id: config.organization_id,
          db_pass: config.db_pass,
          region: config.region,
          plan: config.plan || 'free',
          // Note: db_version is not supported by Supabase Management API
          // They use the latest stable version automatically
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          `Failed to create Supabase project: ${response.status} ${response.statusText}. ${
            errorData.message || JSON.stringify(errorData)
          }`
        )
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error creating Supabase project:', error)
      throw error
    }
  }

  /**
   * Get project details by project reference/ID
   */
  async getProject(projectRef: string): Promise<SupabaseProject> {
    try {
      const response = await fetch(`${SUPABASE_API_BASE_URL}/projects/${projectRef}`, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          `Failed to get Supabase project: ${response.status} ${response.statusText}. ${
            errorData.message || ''
          }`
        )
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error getting Supabase project:', error)
      throw error
    }
  }

  /**
   * Delete a Supabase project
   */
  async deleteProject(projectRef: string): Promise<void> {
    try {
      const response = await fetch(`${SUPABASE_API_BASE_URL}/projects/${projectRef}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          `Failed to delete Supabase project: ${response.status} ${response.statusText}. ${
            errorData.message || ''
          }`
        )
      }
    } catch (error) {
      console.error('Error deleting Supabase project:', error)
      throw error
    }
  }

  /**
   * List all organizations for the authenticated user
   */
  async listOrganizations(): Promise<SupabaseOrganization[]> {
    try {
      const response = await fetch(`${SUPABASE_API_BASE_URL}/organizations`, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          `Failed to list organizations: ${response.status} ${response.statusText}. ${
            errorData.message || ''
          }`
        )
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error listing organizations:', error)
      throw error
    }
  }

  /**
   * Get project API keys
   */
  async getProjectApiKeys(projectRef: string): Promise<{
    anon: string
    service_role: string
  }> {
    try {
      const response = await fetch(
        `${SUPABASE_API_BASE_URL}/projects/${projectRef}/api-keys`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          `Failed to get API keys: ${response.status} ${response.statusText}. ${
            errorData.message || ''
          }`
        )
      }

      const data = await response.json()
      return {
        anon: data.find((key: any) => key.name === 'anon')?.api_key || '',
        service_role: data.find((key: any) => key.name === 'service_role')?.api_key || '',
      }
    } catch (error) {
      console.error('Error getting API keys:', error)
      throw error
    }
  }

  /**
   * Wait for project to be ready (poll status)
   */
  async waitForProjectReady(
    projectRef: string,
    maxAttempts: number = 60,
    intervalMs: number = 5000
  ): Promise<SupabaseProject> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const project = await this.getProject(projectRef)

      if (project.status === 'ACTIVE_HEALTHY') {
        return project
      }

      if (project.status === 'INACTIVE' || project.status === 'ACTIVE_UNHEALTHY') {
        throw new Error(`Project is in unhealthy state: ${project.status}`)
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }

    throw new Error('Timeout waiting for project to be ready')
  }

  /**
   * Test credentials by fetching organizations
   */
  async testCredentials(): Promise<{ valid: boolean; message: string; organizationId?: string }> {
    try {
      const orgs = await this.listOrganizations()
      
      if (orgs.length === 0) {
        return {
          valid: false,
          message: 'No organizations found. Please ensure you have access to at least one Supabase organization.',
        }
      }

      return {
        valid: true,
        message: `Successfully authenticated. Found ${orgs.length} organization(s).`,
        organizationId: orgs[0].id,
      }
    } catch (error) {
      return {
        valid: false,
        message: error instanceof Error ? error.message : 'Failed to validate credentials',
      }
    }
  }
}