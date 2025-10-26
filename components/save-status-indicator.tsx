"use client"

import { Clock, Save, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface SaveStatusIndicatorProps {
  isAutoSaving: boolean
  hasUnsavedChanges: boolean
  lastSaved: string | null
  className?: string
}

export function SaveStatusIndicator({ 
  isAutoSaving, 
  hasUnsavedChanges, 
  lastSaved, 
  className 
}: SaveStatusIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      {isAutoSaving ? (
        <div className="flex items-center text-primary">
          <Save className="w-3 h-3 mr-1 animate-pulse" />
          Saving...
        </div>
      ) : hasUnsavedChanges ? (
        <div className="flex items-center text-orange-500">
          <AlertCircle className="w-3 h-3 mr-1" />
          Unsaved changes
        </div>
      ) : lastSaved ? (
        <div className="flex items-center text-green-500">
          <Clock className="w-3 h-3 mr-1" />
          Saved {new Date(lastSaved).toLocaleTimeString()}
        </div>
      ) : (
        <div className="flex items-center text-muted-foreground">
          <Clock className="w-3 h-3 mr-1" />
          Not saved
        </div>
      )}
    </div>
  )
}
