"use client"

import { useEffect, useRef } from "react"
import { X, Terminal, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ConsoleOutputDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  output: string
  isRunning: boolean
  status: 'running' | 'success' | 'error' | 'idle'
}

export function ConsoleOutputDialog({
  open,
  onOpenChange,
  title,
  output,
  isRunning,
  status
}: ConsoleOutputDialogProps) {
  const outputRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onOpenChange])

  if (!open) return null

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Terminal className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'border-blue-500'
      case 'success':
        return 'border-green-500'
      case 'error':
        return 'border-red-500'
      default:
        return 'border-gray-300'
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 z-50"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Dialog Content */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
        <div className={`bg-white border-2 ${getStatusColor()} rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden`}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                <p className="text-sm text-gray-500">
                  {status === 'running' && 'Running...'}
                  {status === 'success' && 'Completed successfully'}
                  {status === 'error' && 'Failed with errors'}
                  {status === 'idle' && 'Ready'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 hover:bg-gray-200"
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Output Content */}
          <div
            ref={outputRef}
            className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-sm text-green-400"
          >
            <pre className="whitespace-pre-wrap break-words">
              {output || 'No output yet...'}
            </pre>
          </div>

          {/* Footer with stats and close button */}
          <div className="flex items-center justify-between p-3 border-t bg-gray-50">
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span>Lines: {output.split('\n').length}</span>
              <span>Characters: {output.length}</span>
            </div>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              size="sm"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
