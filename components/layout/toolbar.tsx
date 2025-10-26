"use client"

import { Save, Code, Rocket, Undo2, Redo2, CheckCircle, Eye, FileCode, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

interface ToolbarProps {
  onSave: () => void
  onGenerateTerraform: () => void
  onPlanOrApply: () => void
  onUndo: () => void
  onRedo: () => void
  onViewPreview?: () => void
  onViewCode?: () => void
  canUndo?: boolean
  canRedo?: boolean
  deploymentStage: 'none' | 'generated' | 'planned' | 'applying' | 'applied'
  isGeneratingTerraform?: boolean
}

export function Toolbar({ 
  onSave, 
  onGenerateTerraform, 
  onPlanOrApply, 
  onUndo, 
  onRedo, 
  onViewPreview,
  onViewCode,
  canUndo, 
  canRedo,
  deploymentStage,
  isGeneratingTerraform 
}: ToolbarProps) {
  // Detect if user is on Mac - use state to avoid hydration mismatch
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0)
  }, [])

  return (
    <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onSave} className="hover:bg-accent">
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
      </div>

      {/* Center Section - Undo/Redo */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          className="hover:bg-accent disabled:opacity-50 flex items-center gap-2"
          title={`Undo (${isMac ? '⌘Z' : 'Ctrl+Z'})`}
        >
          <Undo2 className="w-4 h-4" />
          <span className="text-xs text-muted-foreground">{isMac ? '⌘Z' : 'Ctrl+Z'}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          className="hover:bg-accent disabled:opacity-50 flex items-center gap-2"
          title={`Redo (${isMac ? '⌘⇧Z' : 'Ctrl+Y'})`}
        >
          <Redo2 className="w-4 h-4" />
          <span className="text-xs text-muted-foreground">{isMac ? '⌘⇧Z' : 'Ctrl+Y'}</span>
        </Button>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 flex-1 justify-end">
        <Button 
          variant="outline"
          onClick={onGenerateTerraform}
          disabled={deploymentStage === 'applying' || isGeneratingTerraform}
        >
          {isGeneratingTerraform ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Code className="w-4 h-4 mr-2" />
              {deploymentStage === 'generated' || deploymentStage === 'planned' ? 'Regenerate Terraform' : 'Generate Terraform'}
            </>
          )}
        </Button>
        
        {deploymentStage === 'generated' && (
          <>
            {onViewCode && (
              <Button 
                variant="outline"
                onClick={onViewCode}
              >
                <FileCode className="w-4 h-4 mr-2" />
                View Code
              </Button>
            )}
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={onPlanOrApply}
            >
              <Rocket className="w-4 h-4 mr-2" />
              Plan
            </Button>
          </>
        )}
        
        {deploymentStage === 'planned' && (
          <>
            {onViewCode && (
              <Button 
                variant="outline"
                onClick={onViewCode}
              >
                <FileCode className="w-4 h-4 mr-2" />
                View Code
              </Button>
            )}
            {onViewPreview && (
              <Button 
                variant="outline"
                onClick={onViewPreview}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Preview
              </Button>
            )}
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={onPlanOrApply}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Apply
            </Button>
          </>
        )}
        
        {deploymentStage === 'applying' && (
          <Button 
            className="bg-green-600"
            disabled
          >
            <Rocket className="w-4 h-4 mr-2 animate-spin" />
            Applying...
          </Button>
        )}
        
        {deploymentStage === 'applied' && (
          <Button 
            className="bg-green-600"
            disabled
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Deployed
          </Button>
        )}
      </div>
    </div>
  )
}
