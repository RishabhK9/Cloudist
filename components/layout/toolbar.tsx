"use client"

import { Save, Code, Rocket, Undo2, Redo2, CheckCircle, Eye, FileCode, Loader2, Brain } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

interface ToolbarProps {
  onSave: () => void
  onGenerateCode: () => void
  onPlanOrApply: () => void
  onUndo: () => void
  onRedo: () => void
  onViewPreview?: () => void
  onViewCode?: () => void
  onAIReview?: () => void
  canUndo?: boolean
  canRedo?: boolean
  deploymentStage: 'none' | 'generated' | 'planned' | 'applying' | 'applied'
  isGeneratingCode?: boolean
}

export function Toolbar({ 
  onSave, 
  onGenerateCode, 
  onPlanOrApply, 
  onUndo, 
  onRedo, 
  onViewPreview,
  onViewCode,
  onAIReview,
  canUndo, 
  canRedo,
  deploymentStage,
  isGeneratingCode 
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
        {onAIReview && (
          <Button 
            variant="default"
            size="default"
            onClick={onAIReview}
            disabled={deploymentStage === 'applying'}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold shadow-lg"
            style={{ minWidth: '140px' }}
          >
            <Brain className="w-5 h-5 mr-2" />
            Code Review
          </Button>
        )}
        <Button 
          variant="outline"
          onClick={onGenerateCode}
          disabled={deploymentStage === 'applying' || isGeneratingCode}
        >
          {isGeneratingCode ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Code className="w-4 h-4 mr-2" />
              {deploymentStage === 'generated' || deploymentStage === 'planned' ? 'Regenerate Code' : 'Generate Code'}
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
              className="bg-green-600 hover:bg-green-700"
              onClick={onPlanOrApply}
            >
              <Rocket className="w-4 h-4 mr-2" />
              Deploy
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
