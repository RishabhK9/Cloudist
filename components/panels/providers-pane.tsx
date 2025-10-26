"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { 
  Cloud, 
  ChevronDown, 
  Link2, 
  Info, 
  ExternalLink,
  Settings
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
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
    currentProvider ? PROVIDERS.find(p => p.id === currentProvider) || null : null
  )
  const [isExpanded, setIsExpanded] = useState(true)

  const handleProviderClick = (provider: Provider) => {
    setSelectedProvider(provider.id === selectedProvider?.id ? null : provider)
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
    <div className="border-t border-gray-200 bg-white">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">Providers</span>
          <Badge variant="secondary" className="text-xs">
            {PROVIDERS.length}
          </Badge>
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-gray-600 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2 max-h-64 overflow-y-auto">
          {PROVIDERS.map((provider) => (
            <Card 
              key={provider.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedProvider?.id === provider.id 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center gap-3 flex-1"
                    onClick={() => handleProviderClick(provider)}
                  >
                    <div className="text-2xl">{provider.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {provider.displayName}
                        </span>
                        {currentProvider === provider.id && (
                          <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={provider.status === "connected" ? "default" : "secondary"}
                          className={`text-xs ${
                            provider.status === "connected" 
                              ? "bg-green-100 text-green-700 border-green-200" 
                              : "bg-gray-100 text-gray-600 border-gray-200"
                          }`}
                        >
                          {provider.status === "connected" ? "Connected" : "Disconnected"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {selectedProvider?.id === provider.id && (
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleConnectMCP(provider)
                        }}
                        className="h-8 px-2 text-xs"
                        title="Connect MCP"
                      >
                        <Link2 className="w-3 h-3 mr-1" />
                        MCP
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleFetchDetails(provider)
                        }}
                        className="h-8 px-2 text-xs"
                        title="Fetch Details"
                      >
                        <Info className="w-3 h-3 mr-1" />
                        Details
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleVisitConsole(provider)
                        }}
                        className="h-8 px-2 text-xs"
                        title="Visit Console"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Console
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

