"use client"

import { ConfigLoader, ServiceConfig } from "@/lib/config-loader"
import { CloudServiceNodeData, CloudServiceNode as CloudServiceNodeType } from "@/types"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { memo, useEffect, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface CloudServiceNodeProps extends NodeProps<CloudServiceNodeType> {
  onDoubleClick?: (nodeData: CloudServiceNodeData) => void
}

export const CloudServiceNode = memo(({ data, selected, onDoubleClick }: CloudServiceNodeProps) => {
  const [config, setConfig] = useState((data as CloudServiceNodeData)?.config || {})
  const [serviceConfig, setServiceConfig] = useState<ServiceConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Early return if data is not properly structured
  if (!data) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-sm p-2 min-w-[100px]">
        <div className="text-center text-muted-foreground text-xs">
          Invalid
        </div>
      </div>
    )
  }

  
  const nodeData = data as CloudServiceNodeData

  // Load service configuration when component mounts
  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true)
      try {
        const config = await ConfigLoader.loadServiceConfig(nodeData.provider, nodeData.id)
        setServiceConfig(config)
      } catch (error) {
        console.error('Failed to load service config:', error)
      } finally {
        setLoading(false)
      }
    }

    if (nodeData.provider && nodeData.id) {
      loadConfig()
    }
  }, [nodeData.provider, nodeData.id])



  const getNodeIcon = (serviceId: string, provider: string) => {
    // Always use the icon from the service config first
    if (nodeData.icon) {
      return nodeData.icon
    }
    
    // Fallback to hardcoded icons only if no config icon is available
    switch (serviceId) {
      case 'lambda':
        return 'λ'
      case 'ec2':
        return '🖥️'
      case 's3':
        return '🪣'
      case 'rds':
        return '🗄️'
      case 'vpc':
        return '🌐'
      case 'alb':
        return '⚖️'
      default:
        return '☁️' // Generic cloud icon
    }
  }

  const isImageIcon = (icon: string) => {
    return icon && typeof icon === 'string' && icon.startsWith('/') && (icon.endsWith('.png') || icon.endsWith('.svg') || icon.endsWith('.jpg') || icon.endsWith('.jpeg'))
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
        return 'bg-green-500'
      case 'stripe':
        return 'bg-purple-500'
      default:
        return 'bg-muted-foreground'
    }
  }

  const getSelectionBorderColor = (provider: string) => {
    switch (provider) {
      case 'aws':
        return 'ring-orange-500'
      case 'gcp':
        return 'ring-blue-500'
      case 'azure':
        return 'ring-cyan-500'
      case 'supabase':
        return 'ring-green-500'
      case 'stripe':
        return 'ring-purple-500'
      default:
        return 'ring-gray-500'
    }
  }

  const handleDoubleClick = () => {
    if (onDoubleClick && nodeData) {
      onDoubleClick(nodeData)
    }
  }

  return (
    <div className={`relative ${selected ? `ring-2 ${getSelectionBorderColor(nodeData.provider)} ring-offset-2 ring-offset-background` : ""}`}>
      {/* Delete button - only visible when selected */}
      {selected && nodeData.onDelete && (
        <Button
          size="icon"
          variant="destructive"
          className="absolute -top-3 -right-3 h-6 w-6 rounded-full shadow-lg z-10"
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteDialog(true);
          }}
        >
          <X className="w-3 h-3" />
        </Button>
      )}
      {/* Handles on all four sides: top, bottom, left, right */}
      {/* Use a shared class to ensure transforms originate from center, use GPU acceleration,
          and raise z-index while hovered so the scaled circle doesn't reveal artifacts. */}
      {/* `pointer-events-auto` ensures the handle receives hover events even if its parent scales. */}
      {(() => {
        const handleClass =
          "w-3.5 h-3.5 !bg-blue-400 dark:!bg-blue-500 " +
          "transform-gpu origin-center pointer-events-auto rounded-full";

        return (
          <>
            {/* Left side handles */}
            <Handle type="source" position={Position.Left} id="left-source" className={handleClass} style={{ opacity: 1, transformOrigin: 'center' }} />
            <Handle type="target" position={Position.Left} id="left-target" className={handleClass} style={{ opacity: 1, transformOrigin: 'center' }} />

            {/* Right side handles */}
            <Handle type="source" position={Position.Right} id="right-source" className={handleClass} style={{ opacity: 1, transformOrigin: 'center' }} />
            <Handle type="target" position={Position.Right} id="right-target" className={handleClass} style={{ opacity: 1, transformOrigin: 'center' }} />

            {/* Top side handles */}
            <Handle type="source" position={Position.Top} id="top-source" className={handleClass} style={{ opacity: 1, transformOrigin: 'center' }} />
            <Handle type="target" position={Position.Top} id="top-target" className={handleClass} style={{ opacity: 1, transformOrigin: 'center' }} />

            {/* Bottom side handles */}
            <Handle type="source" position={Position.Bottom} id="bottom-source" className={handleClass} style={{ opacity: 1, transformOrigin: 'center' }} />
            <Handle type="target" position={Position.Bottom} id="bottom-target" className={handleClass} style={{ opacity: 1, transformOrigin: 'center' }} />
          </>
        )
      })()}

      <div 
        className="cursor-pointer"
        onDoubleClick={handleDoubleClick}
      >
        {/* Just the image */}
        {isImageIcon(nodeData.icon) ? (
          <img src={nodeData.icon} alt={nodeData.name} className="w-18 h-18" />
        ) : (
          <div className={`w-10 h-10 ${getNodeColor(nodeData.id, nodeData.provider)} flex items-center justify-center shadow-md rounded-lg`}>
            <span className="text-white text-base font-bold">
              {getNodeIcon(nodeData.id, nodeData.provider)}
            </span>
          </div>
        )}

      </div>

      {/* Delete Node Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Node</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this node? This action cannot be undone and will also remove all connected edges.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                nodeData.onDelete?.();
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Node
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
})

CloudServiceNode.displayName = "CloudServiceNode"
