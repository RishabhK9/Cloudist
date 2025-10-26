"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { deployInfrastructure } from "@/lib/api-service"
import type { Node, Edge } from "@xyflow/react"

// Mock Supabase nodes for testing
const mockSupabaseNodes: Node[] = [
  {
    id: "supabase-db-1",
    type: "default",
    position: { x: 100, y: 100 },
    data: {
      label: "Supabase Database",
      type: "supabase_database",
      provider: "supabase",
      config: {
        project_name: "cloudist-test-project",
        region: "us-east-1",
        plan: "free",
        db_password: "TestPassword123",
        postgres_version: "Latest (Auto)"
      }
    }
  }
]

const mockSupabaseEdges: Edge[] = []

export function SupabaseDeploymentTest() {
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentResult, setDeploymentResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testSupabaseDeployment = async () => {
    setIsDeploying(true)
    setDeploymentResult(null)
    setError(null)

    try {
      const deploymentRequest = {
        name: "Supabase Test Deployment",
        provider: "supabase" as const,
        nodes: mockSupabaseNodes,
        edges: mockSupabaseEdges,
        autoApprove: false
      }

      console.log("🚀 Testing Supabase deployment:", deploymentRequest)
      
      const result = await deployInfrastructure(deploymentRequest)
      
      console.log("✅ Deployment result:", result)
      setDeploymentResult(result)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      console.error("❌ Deployment failed:", errorMessage)
      setError(errorMessage)
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Supabase Deployment Test</h1>
        <p className="text-gray-600">
          This component tests the Supabase project creation integration.
          You only need to configure your Supabase access token in settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>Supabase database configuration for testing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Project Name</label>
              <p className="text-sm text-gray-600">cloudist-test-project</p>
            </div>
            <div>
              <label className="text-sm font-medium">Region</label>
              <p className="text-sm text-gray-600">us-east-1</p>
            </div>
            <div>
              <label className="text-sm font-medium">Plan</label>
              <Badge variant="secondary">free</Badge>
            </div>
            <div>
              <label className="text-sm font-medium">Provider</label>
              <Badge variant="outline">supabase</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button 
          onClick={testSupabaseDeployment}
          disabled={isDeploying}
          className="flex items-center gap-2"
        >
          {isDeploying ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Deploying...
            </>
          ) : (
            <>
              🚀 Test Supabase Deployment
            </>
          )}
        </Button>
      </div>

      {deploymentResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              Deployment Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <label className="text-sm font-medium">Success:</label>
                <Badge variant={deploymentResult.success ? "default" : "destructive"}>
                  {deploymentResult.success ? "Yes" : "No"}
                </Badge>
              </div>
              {deploymentResult.projectId && (
                <div>
                  <label className="text-sm font-medium">Project ID:</label>
                  <p className="text-sm font-mono bg-gray-100 p-2 rounded">{deploymentResult.projectId}</p>
                </div>
              )}
              {deploymentResult.outputs && (
                <div>
                  <label className="text-sm font-medium">Outputs:</label>
                  <div className="space-y-2">
                    {deploymentResult.outputs.database_resource && (
                      <div className="p-2 bg-green-50 border border-green-200 rounded">
                        <h4 className="font-medium text-green-800">Database Resource Created:</h4>
                        <div className="text-sm text-green-700 mt-1">
                          <p><strong>ID:</strong> {deploymentResult.outputs.database_resource.id}</p>
                          <p><strong>Name:</strong> {deploymentResult.outputs.database_resource.name}</p>
                          <p><strong>Host:</strong> {deploymentResult.outputs.database_resource.config.database_host}</p>
                          <p><strong>Status:</strong> {deploymentResult.outputs.database_resource.config.status}</p>
                        </div>
                      </div>
                    )}
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                      {JSON.stringify(deploymentResult.outputs, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              {deploymentResult.logs && deploymentResult.logs.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Logs:</label>
                  <div className="text-xs bg-gray-100 p-2 rounded max-h-32 overflow-auto">
                    {deploymentResult.logs.map((log: string, index: number) => (
                      <div key={index} className="mb-1">{log}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-red-600">❌</span>
              Deployment Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
