"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Copy, Check } from "lucide-react"
import { useState } from "react"

interface PlanPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planOutput: string | null
  onApply?: () => void
}

export function PlanPreviewDialog({
  open,
  onOpenChange,
  planOutput,
  onApply,
}: PlanPreviewDialogProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (planOutput) {
      navigator.clipboard.writeText(planOutput)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatPlanOutput = (output: string) => {
    const lines = output.split('\n')
    return lines.map((line, index) => {
      let className = "font-mono text-sm"
      
      // Color code different types of changes
      if (line.includes('+ resource') || line.trim().startsWith('+')) {
        className += " text-green-600 dark:text-green-400"
      } else if (line.includes('- resource') || line.trim().startsWith('-')) {
        className += " text-red-600 dark:text-red-400"
      } else if (line.includes('~ resource') || line.trim().startsWith('~')) {
        className += " text-yellow-600 dark:text-yellow-400"
      } else if (line.includes('Plan:')) {
        className += " text-blue-600 dark:text-blue-400 font-semibold"
      } else {
        className += " text-muted-foreground"
      }

      return (
        <div key={index} className={className}>
          {line || '\u00A0'}
        </div>
      )
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Terraform Plan Preview</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
          </DialogTitle>
          <DialogDescription>
            Review the proposed infrastructure changes before applying
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 mt-4 border rounded-md bg-muted/50">
          <div className="p-4">
            {planOutput ? (
              formatPlanOutput(planOutput)
            ) : (
              <p className="text-muted-foreground text-sm">No plan output available</p>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onApply && (
            <Button
              onClick={() => {
                onApply()
                onOpenChange(false)
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Apply Changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
