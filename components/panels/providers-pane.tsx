"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Cloud, 
  ChevronRight,
  Link2, 
  Info, 
  ExternalLink
} from "lucide-react"

interface Provider {
  id: string
  name: string
  displayName: string
  icon: string
  status: "connected" | "disconnected"
  consoleUrl?: string
}

const PROVIDERS: Provider[] = [
  {
    id: "aws",
    name: "AWS",
    displayName: "Amazon Web Services",
    icon: "☁️",
    status: "connected",
    consoleUrl: "https://console.aws.amazon.com"
  },
  {
    id: "gcp",
    name: "GCP",
    displayName: "Google Cloud Platform",
    icon: "🌩️",
    status: "disconnected",
    consoleUrl: "https://console.cloud.google.com"
  },
  {
    id: "azure",
    name: "Azure",
    displayName: "Microsoft Azure",
    icon: "☁️",
    status: "disconnected",
    consoleUrl: "https://portal.azure.com"
  },
  {
    id: "supabase",
    name: "Supabase",
    displayName: "Supabase",
    icon: "⚡",
    status: "disconnected",
    consoleUrl: "https://supabase.com/dashboard"
  }
]

interface ProvidersPaneProps {
  currentProvider?: string
}

export function ProvidersPane({ currentProvider }: ProvidersPaneProps) {
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)

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
            {PROVIDERS.length}
          </Badge>
        </div>
      </div>

      {/* Content - Expandable List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {PROVIDERS.map((provider) => {
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
                  <div className="text-xl">{provider.icon}</div>
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
                        variant={provider.status === "connected" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {provider.status === "connected" ? "Connected" : "Disconnected"}
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
        })}
      </div>
    </div>
  )
}

