"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ConfigLoader, ServiceConfig } from "@/lib/config-loader"
import { ConfigurationPanelProps } from "@/types"
import { Info, MoreHorizontal, Save, Undo, X } from "lucide-react"
import { useEffect, useState } from "react"

export function ConfigurationPanel({ 
  isOpen, 
  onClose, 
  nodeData, 
  serviceConfig, 
  onConfigUpdate,
  onSave 
}: ConfigurationPanelProps) {
  const [config, setConfig] = useState<Record<string, any>>(nodeData?.config || {})
  const [searchTerm, setSearchTerm] = useState("")
  const [loadedServiceConfig, setLoadedServiceConfig] = useState<ServiceConfig | null>(null)
  const [loading, setLoading] = useState(false)

  
  useEffect(() => {
    const loadConfig = async () => {
      if (!nodeData?.provider || !nodeData?.id) return
      
      setLoading(true)
      try {
        const config = await ConfigLoader.loadServiceConfig(nodeData.provider, nodeData.id)
        setLoadedServiceConfig(config)
      } catch (error) {
        console.error('Failed to load service config:', error)
      } finally {
        setLoading(false)
      }
    }

    if (isOpen && nodeData) {
      loadConfig()
    }
  }, [isOpen, nodeData?.provider, nodeData?.id])

  if (!isOpen || !nodeData) {
    return null
  }

  const currentServiceConfig = serviceConfig || loadedServiceConfig

  const configSchema = currentServiceConfig?.configSchema || {}
  const filteredSchema = Object.entries(configSchema).filter(([key, fieldConfig]: [string, any]) => {
    if (!searchTerm) return true
    return fieldConfig.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
           key.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const updateConfig = (key: string, value: string) => {
    const newConfig = { ...config, [key]: value }
    setConfig(newConfig)
    onConfigUpdate(newConfig)
  }

  const renderConfigField = (key: string, fieldConfig: any) => {
    const value = config[key] || fieldConfig.default || ""
    const isRequired = fieldConfig.required || false

    const renderField = () => {
      switch (fieldConfig.type) {
        case "select":
          return (
            <Select value={value} onValueChange={(val) => updateConfig(key, val)}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder={`Select ${fieldConfig.label}`} />
              </SelectTrigger>
              <SelectContent>
                {fieldConfig.options?.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )

        case "multiselect":
          return (
            <div className="space-y-2">
              <Select value={value} onValueChange={(val) => updateConfig(key, val)}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder={`Select ${fieldConfig.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {fieldConfig.options?.map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )

        case "boolean":
          return (
            <div className="flex items-center space-x-2">
              <Checkbox
                id={key}
                checked={value === true || value === "true"}
                onCheckedChange={(checked: boolean) => updateConfig(key, checked.toString())}
              />
              <Label htmlFor={key} className="text-sm text-foreground">
                {fieldConfig.label}
              </Label>
            </div>
          )

        case "number":
          return (
            <Input
              type="number"
              className="h-8"
              value={value}
              onChange={(e) => updateConfig(key, e.target.value)}
              placeholder={fieldConfig.default?.toString()}
              min={fieldConfig.validation?.min}
              max={fieldConfig.validation?.max}
            />
          )

        case "string":
        default:
          if (fieldConfig.label.toLowerCase().includes("description") || 
              fieldConfig.label.toLowerCase().includes("definition")) {
            return (
              <Textarea
                className="min-h-[80px]"
                value={value}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateConfig(key, e.target.value)}
                placeholder={fieldConfig.default}
              />
            )
          }
          return (
            <Input
              className="h-8"
              value={value}
              onChange={(e) => updateConfig(key, e.target.value)}
              placeholder={fieldConfig.default}
            />
          )
      }
    }

    return (
      <div key={key} className="space-y-2">
        <div className="flex items-center space-x-1">
          <Label className="text-sm font-medium text-foreground">
            {fieldConfig.label}
            {isRequired && <span className="text-destructive ml-1">*</span>}
          </Label>
          {fieldConfig.description && (
            <div title={fieldConfig.description}>
              <Info className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </div>
        {fieldConfig.description && (
          <p className="text-xs text-muted-foreground">{fieldConfig.description}</p>
        )}
        {renderField()}
      </div>
    )
  }

  const getNodeIconPath = (serviceId: string, provider: string) => {
    // Use the icon from the loaded service config if available
    if (loadedServiceConfig?.icon) {
      return loadedServiceConfig.icon
    }
    return '/aws/Arch_Amazon-EC2_64.svg'
  }

  const getNodeColor = (serviceId: string, provider: string) => {
    switch (provider) {
      case 'aws':
        return 'bg-orange-500'
      case 'gcp':
        return 'bg-blue-500'
      case 'azure':
        return 'bg-cyan-500'
      case 'supabase':
        return 'bg-emerald-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="w-80 bg-card border-l border-border h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          {/* Left: icon + stacked text */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm bg-card border border-border flex-shrink-0">
              <img
                src={getNodeIconPath(nodeData.id, nodeData.provider)}
                alt={`${nodeData.id} icon`}
                className="w-6 h-6"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground truncate">{nodeData.name}</h3>
              <p className="text-xs text-muted-foreground truncate">{nodeData.terraformType}</p>
            </div>
          </div>

          {/* Right: close button */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-accent text-muted-foreground hover:text-foreground" onClick={onClose}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Input
            placeholder="Search attributes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8 text-sm border border-border rounded-md bg-input text-foreground"
          />
        </div>
      </div>

      {/* Configuration Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Required Parameters Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-foreground">Required parameters</h4>
              <div className="w-4 h-4 bg-muted rounded flex items-center justify-center">
                <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
              </div>
            </div>
            
            {/* Resource Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Resource name</Label>
              <Input
                value={nodeData.name}
                className="h-8 bg-input"
                readOnly
              />
              <p className="text-xs text-muted-foreground">This name is used to create Terraform resource.</p>
            </div>

            {/* Region */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Region</Label>
              <Input
                value="US East (N. Virginia)"
                className="h-8 bg-input"
                readOnly
              />
              <p className="text-xs text-muted-foreground">us-east-1</p>
            </div>

            {/* Dynamic Configuration Fields */}
            {filteredSchema.map(([key, fieldConfig]) => renderConfigField(key, fieldConfig))}
          </div>
        </div>
      </div>
    </div>
  )
}
