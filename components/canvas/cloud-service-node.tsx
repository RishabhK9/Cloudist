"use client"

import { CloudServiceNodeData, CloudServiceNode as CloudServiceNodeType } from "@/types"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { memo, useState } from "react"
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
        return 'bg-gray-500'
    }
  }

  const handleDoubleClick = () => {
    if (onDoubleClick && nodeData) {
      onDoubleClick(nodeData)
    }
  }

  return (
    <div className={`relative ${selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}>
      {/* Delete button - only visible when selected */}
      {selected && (
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
      {/* Each side has BOTH source and target handles with SAME ID */}
      {(() => {
        const handleClass =
          "w-4 h-4 !bg-primary hover:!bg-primary/80 " +
          "!border-2 !border-background transition-all duration-200 " +
          "pointer-events-auto rounded-full cursor-crosshair";

        return (
          <>
            {/* Left side - source handle */}
            <Handle 
              type="source" 
              position={Position.Left} 
              id="left" 
              className={handleClass} 
              style={{ 
                left: '-6px',
                opacity: 1,
              }} 
              isConnectable={true}
            />
            {/* Left side - target handle (same ID, overlapping) */}
            <Handle 
              type="target" 
              position={Position.Left} 
              id="left" 
              className={handleClass} 
              style={{ 
                left: '-6px',
                opacity: 1,
              }} 
              isConnectable={true}
            />

            {/* Right side - source handle */}
            <Handle 
              type="source" 
              position={Position.Right} 
              id="right" 
              className={handleClass} 
              style={{ 
                right: '-6px',
                opacity: 1,
              }} 
              isConnectable={true}
            />
            {/* Right side - target handle (same ID, overlapping) */}
            <Handle 
              type="target" 
              position={Position.Right} 
              id="right" 
              className={handleClass} 
              style={{ 
                right: '-6px',
                opacity: 1,
              }} 
              isConnectable={true}
            />

            {/* Top side - source handle */}
            <Handle 
              type="source" 
              position={Position.Top} 
              id="top" 
              className={handleClass} 
              style={{ 
                top: '-6px',
                opacity: 1,
              }} 
              isConnectable={true}
            />
            {/* Top side - target handle (same ID, overlapping) */}
            <Handle 
              type="target" 
              position={Position.Top} 
              id="top" 
              className={handleClass} 
              style={{ 
                top: '-6px',
                opacity: 1,
              }} 
              isConnectable={true}
            />

            {/* Bottom side - source handle */}
            <Handle 
              type="source" 
              position={Position.Bottom} 
              id="bottom" 
              className={handleClass} 
              style={{ 
                bottom: '-6px',
                opacity: 1,
              }} 
              isConnectable={true}
            />
            {/* Bottom side - target handle (same ID, overlapping) */}
            <Handle 
              type="target" 
              position={Position.Bottom} 
              id="bottom" 
              className={handleClass} 
              style={{ 
                bottom: '-6px',
                opacity: 1,
              }} 
              isConnectable={true}
            />
          </>
        )
      })()}

      <div 
        className="cursor-pointer flex flex-col items-center"
        onDoubleClick={handleDoubleClick}
      >
        {/* Node Icon */}
        {isImageIcon(nodeData.icon) ? (
          <img src={nodeData.icon} alt={nodeData.name} className="w-18 h-18" />
        ) : (
          <div className={`w-10 h-10 ${getNodeColor(nodeData.id, nodeData.provider)} flex items-center justify-center shadow-md`}>
            <span className="text-white text-base font-bold">
              {getNodeIcon(nodeData.id, nodeData.provider)}
            </span>
          </div>
        )}
        
        {/* Node Name */}
        <div className="mt-1 text-xs text-center text-card-foreground bg-card/80 backdrop-blur-sm px-2 py-1 rounded border border-border/50 max-w-20 truncate">
          {nodeData.name}
        </div>
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
                console.log('Delete button clicked, onDelete function:', nodeData.onDelete);
                if (nodeData.onDelete) {
                  nodeData.onDelete();
                } else {
                  console.log('No onDelete function available');
                }
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
