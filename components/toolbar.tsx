"use client"

import { Save, Code, Rocket, Undo2, Redo2, CheckCircle, Eye, FileCode, Loader2, Brain } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

interface ToolbarProps {
  onSave: () => void
  onGenerateTerraform?: () => void
  onDeploy?: () => void
  onPlanOrApply?: () => void
  onUndo: () => void
  onRedo: () => void
  onCodeReview?: () => void
  onViewPreview?: () => void
  onViewCode?: () => void
  canUndo?: boolean
  canRedo?: boolean
  deploymentStage?: 'none' | 'generated' | 'planned' | 'applying' | 'applied'
  isGeneratingTerraform?: boolean
}

export function Toolbar({ 
  onSave, 
  onGenerateTerraform,
  onDeploy,
  onPlanOrApply, 
  onUndo, 
  onRedo, 
  onCodeReview,
  onViewPreview,
  onViewCode,
  canUndo, 
  canRedo,
  deploymentStage = 'none',
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
        {/* Code Review Button - Only visible after Terraform is generated */}
        {onCodeReview && (deploymentStage === 'generated' || deploymentStage === 'planned' || deploymentStage === 'applied') && (
          <Button 
            variant="default"
            size="default"
            onClick={onCodeReview}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold shadow-lg"
            style={{ minWidth: '140px' }}
          >
            <Brain className="w-5 h-5 mr-2" />
            Code Review
          </Button>
        )}

        {/* Workflow: none -> Generate Terraform */}
        {deploymentStage === 'none' && onGenerateTerraform && (
          <Button 
            onClick={onGenerateTerraform}
            disabled={isGeneratingTerraform}
            className="bg-primary hover:bg-primary/90"
          >
            {isGeneratingTerraform ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Code className="w-4 h-4 mr-2" />
                Generate Terraform
              </>
            )}
          </Button>
        )}
        
        {/* Workflow: generated -> Regenerate + Preview Code + Plan */}
        {deploymentStage === 'generated' && (
          <>
            {onGenerateTerraform && (
              <Button 
                variant="outline"
                onClick={onGenerateTerraform}
                disabled={isGeneratingTerraform}
              >
                {isGeneratingTerraform ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <Code className="w-4 h-4 mr-2" />
                    Regenerate
                  </>
                )}
              </Button>
            )}
            {onViewCode && (
              <Button 
                variant="outline"
                onClick={onViewCode}
              >
                <FileCode className="w-4 h-4 mr-2" />
                Preview Code
              </Button>
            )}
            {onPlanOrApply && (
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={onPlanOrApply}
              >
                <Rocket className="w-4 h-4 mr-2" />
                Plan
              </Button>
            )}
          </>
        )}
        
        {/* Workflow: planned -> Regenerate + Preview Code + View Preview (Diff) + Apply */}
        {deploymentStage === 'planned' && (
          <>
            {onGenerateTerraform && (
              <Button 
                variant="outline"
                onClick={onGenerateTerraform}
                disabled={isGeneratingTerraform}
              >
                {isGeneratingTerraform ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <Code className="w-4 h-4 mr-2" />
                    Regenerate
                  </>
                )}
              </Button>
            )}
            {onViewCode && (
              <Button 
                variant="outline"
                onClick={onViewCode}
              >
                <FileCode className="w-4 h-4 mr-2" />
                Preview Code
              </Button>
            )}
            {onViewPreview && (
              <Button 
                variant="outline"
                onClick={onViewPreview}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Diff
              </Button>
            )}
            {onPlanOrApply && (
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={onPlanOrApply}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Apply
              </Button>
            )}
          </>
        )}
        
        {/* Workflow: applying -> Applying... */}
        {deploymentStage === 'applying' && (
          <Button 
            className="bg-green-600 text-white"
            disabled
          >
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Applying...
          </Button>
        )}
        
        {/* Workflow: applied -> Regenerate + Deployed */}
        {deploymentStage === 'applied' && (
          <>
            {onGenerateTerraform && (
              <Button 
                variant="outline"
                onClick={onGenerateTerraform}
                disabled={isGeneratingTerraform}
              >
                {isGeneratingTerraform ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <Code className="w-4 h-4 mr-2" />
                    Regenerate
                  </>
                )}
              </Button>
            )}
            <Button 
              className="bg-green-600 text-white"
              disabled
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Deployed
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
