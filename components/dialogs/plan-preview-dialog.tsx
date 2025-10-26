"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

interface PlanPreviewDialogProps {
  isOpen: boolean
  onClose: () => void
  planOutput: string | null
  isLoading?: boolean
  onApply?: () => void
}

export function PlanPreviewDialog({
  isOpen,
  onClose,
  planOutput,
  isLoading = false,
  onApply,
}: PlanPreviewDialogProps) {
  const parsePlanOutput = (output: string) => {
    // Simple parsing - can be enhanced
    const lines = output.split('\n')
    const toCreate = lines.filter(line => line.includes('will be created') || line.includes('+ resource')).length
    const toUpdate = lines.filter(line => line.includes('will be updated') || line.includes('~ resource')).length
    const toDestroy = lines.filter(line => line.includes('will be destroyed') || line.includes('- resource')).length
    
    return { toCreate, toUpdate, toDestroy }
  }

  const stats = planOutput ? parsePlanOutput(planOutput) : { toCreate: 0, toUpdate: 0, toDestroy: 0 }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Terraform Plan Preview</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Running terraform plan...</span>
          </div>
        ) : (
          <>
            {/* Plan Statistics */}
            <div className="grid grid-cols-3 gap-4 py-4">
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">To Create</span>
                </div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.toCreate}</div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 mb-1">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">To Update</span>
                </div>
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.toUpdate}</div>
              </div>

              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-1">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">To Destroy</span>
                </div>
                <div className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.toDestroy}</div>
              </div>
            </div>

            {/* Plan Output */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {planOutput || "No plan output available"}
                </pre>
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          {!isLoading && onApply && (
            <Button onClick={onApply} className="bg-primary">
              Apply Changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
