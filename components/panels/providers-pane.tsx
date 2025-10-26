"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Cloud, 
  ChevronRight,
  Link2, 
  Info, 
  ExternalLink
} from "lucide-react"
import { CredentialManager } from "@/lib/credential-manager"

interface Provider {
  id: string
  name: string
  displayName: string
  icon: string
  consoleUrl?: string
}

const PROVIDERS: Provider[] = [
  {
    id: "aws",
    name: "AWS",
    displayName: "Amazon Web Services",
    icon: "/aws/aws.svg",
    consoleUrl: "https://console.aws.amazon.com",
  },
  {
    id: "gcp",
    name: "GCP",
    displayName: "Google Cloud Platform",
    icon: "🌩️",
    consoleUrl: "https://console.cloud.google.com",
  },
  {
    id: "azure",
    name: "Azure",
    displayName: "Microsoft Azure",
    icon: "☁️",
    consoleUrl: "https://portal.azure.com",
  },
  {
    id: "supabase",
    name: "Supabase",
    displayName: "Supabase",
    icon: "/supabase/supabase-logo-icon.svg",
    consoleUrl: "https://supabase.com/dashboard",
  },
  {
    id: "stripe",
    name: "Stripe",
    displayName: "Stripe",
    icon: "/stripe/stripe.svg",
    consoleUrl: "https://dashboard.stripe.com",
  },
];

interface ProvidersPaneProps {
  currentProvider?: string
  nodes?: any[]
}

export function ProvidersPane({ currentProvider, nodes = [] }: ProvidersPaneProps) {
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
  const [credentialStatus, setCredentialStatus] = useState<Record<string, boolean>>({})

  // Check credential status for all providers
  const checkCredentials = async () => {
    const status: Record<string, boolean> = {}
    
    for (const provider of PROVIDERS) {
      try {
        const hasCredentials = CredentialManager.hasCredentials(provider.id as any)
        status[provider.id] = hasCredentials
      } catch (error) {
        console.error(`Error checking credentials for ${provider.id}:`, error)
        status[provider.id] = false
      }
    }
    
    setCredentialStatus(status)
  }

  useEffect(() => {
    checkCredentials()
  }, [])

  // Listen for credential changes (storage events)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('credentials_') || e.key === 'credentials_updated') {
        checkCredentials()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Helper function to determine provider from block type
  const getProviderFromBlockType = (type: string): string | null => {
    if (type.startsWith('supabase_')) return 'supabase'
    if (type.startsWith('stripe_')) return 'stripe'
    // AWS types (all other current types are AWS)
    const awsTypes = ['ec2', 'lambda', 'fargate', 'kubernetes', 'container', 's3', 'rds', 'dynamodb', 
                      'redis', 'ebs', 'vpc', 'subnet', 'internet_gateway', 'security_group', 
                      'loadbalancer', 'apigateway', 'api_gateway', 'cloudfront', 'securitygroup',
                      'iam', 'secrets', 'secrets_manager', 'cognito', 'waf', 'sqs', 'step_functions',
                      'cloudwatch', 'costmonitor', 'securityscanner', 'autoscaler', 'backupmanager']
    if (awsTypes.includes(type)) return 'aws'
    return null
  }

  // Extract unique providers from nodes on the diagram
  const activeProviders = new Set(
    nodes
      .map((node) => {
        // Handle ReactFlow nodes (with data.provider)
        if (node.data?.provider) {
          return node.data.provider
        }
        // Handle legacy blocks (with type field)
        if (node.type) {
          return getProviderFromBlockType(node.type)
        }
        return null
      })
      .filter((provider) => provider)
  )

  // Filter providers to only show those with resources on the diagram
  const visibleProviders = PROVIDERS.filter((provider) => 
    activeProviders.has(provider.id)
  )

  const handleProviderClick = (providerId: string) => {
    setExpandedProvider(expandedProvider === providerId ? null : providerId)
  }

  const handleConnectMCP = (provider: Provider) => {
    console.log("Connect MCP for", provider.name)
    // TODO: Implement MCP connection logic
  }

  const handleFetchDetails = (provider: Provider) => {
    console.log("Fetch details for", provider.name)
    // TODO: Implement fetch details logic
  }

  const handleVisitConsole = (provider: Provider) => {
    if (provider.consoleUrl) {
      window.open(provider.consoleUrl, "_blank")
    }
  }

  return (
    <div className="bg-sidebar h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Providers</span>
          <Badge variant="secondary" className="text-xs">
            {visibleProviders.length}
          </Badge>
        </div>
      </div>

      {/* Content - Expandable List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {visibleProviders.length === 0 ? (
          <div className="flex items-center justify-center h-full px-4 py-8 text-center">
            <div className="text-sm text-muted-foreground">
              No providers yet. Add resources from the Components panel to see providers here.
            </div>
          </div>
        ) : (
          visibleProviders.map((provider) => {
          const isExpanded = expandedProvider === provider.id
          const isActive = currentProvider === provider.id
          
          return (
            <div key={provider.id} className="border-b border-sidebar-border">
              {/* Provider Item Header */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleProviderClick(provider.id)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <ChevronRight
                    className={`w-4 h-4 text-muted-foreground transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  />
                  <div className="text-xl">
                    {provider.icon.startsWith('/') ? (
                      <img src={provider.icon} alt={provider.name} className="w-6 h-6 object-contain" />
                    ) : (
                      provider.icon
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {provider.displayName}
                      </span>
                      {isActive && (
                        <Badge variant="outline" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge 
                        variant={credentialStatus[provider.id] ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {credentialStatus[provider.id] ? "Connected" : "Disconnected"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 py-3 bg-muted/30 space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleConnectMCP(provider)
                    }}
                    className="w-full justify-start text-xs h-8"
                  >
                    <Link2 className="w-3 h-3 mr-2" />
                    Connect MCP
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleFetchDetails(provider)
                    }}
                    className="w-full justify-start text-xs h-8"
                  >
                    <Info className="w-3 h-3 mr-2" />
                    Fetch Details
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleVisitConsole(provider)
                    }}
                    className="w-full justify-start text-xs h-8"
                  >
                    <ExternalLink className="w-3 h-3 mr-2" />
                    Visit Console
                  </Button>
                </div>
              )}
            </div>
          )
        })
        )}
      </div>
    </div>
  )
}

