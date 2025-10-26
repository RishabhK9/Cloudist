"use client"

import { Save, Rocket, Undo2, Redo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

interface ToolbarProps {
  onSave: () => void
  onDeploy: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo?: boolean
  canRedo?: boolean
}

export function Toolbar({ onSave, onDeploy, onUndo, onRedo, canUndo, canRedo }: ToolbarProps) {
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
        <Button className="bg-primary hover:bg-primary/90" onClick={onDeploy}>
          <Rocket className="w-4 h-4 mr-2" />
          Deploy
        </Button>
      </div>
    </div>
  )
}
