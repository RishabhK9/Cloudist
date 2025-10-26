"use client"

import { useEffect, useRef, useState } from "react"
import { X, Terminal, Loader2, CheckCircle2, XCircle, Copy, Trash2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface ConsoleOutputDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  output: string
  isRunning: boolean
  status: 'running' | 'success' | 'error' | 'idle'
  enableStreaming?: boolean  // Enable streaming animation effect
  onClear?: () => void        // Callback to clear output
}

export function ConsoleOutputDialog({
  open,
  onOpenChange,
  title,
  output,
  isRunning,
  status,
  enableStreaming = false,
  onClear
}: ConsoleOutputDialogProps) {
  const outputRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const [autoScroll, setAutoScroll] = useState(true)
  const [displayedOutput, setDisplayedOutput] = useState('')
  const previousOutputRef = useRef('')
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Reset effect: clear state when dialog reopens or output becomes empty
  useEffect(() => {
    // Clear any running interval first
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current)
      streamIntervalRef.current = null
    }

    // Reset when dialog closes or output becomes empty
    if (!open || output === '') {
      setDisplayedOutput('')
      previousOutputRef.current = ''
      return
    }

    // Reset when streaming is disabled and output changes
    if (!enableStreaming) {
      setDisplayedOutput(output)
      previousOutputRef.current = output
    }
  }, [open, output, enableStreaming])

  // Streaming effect: gradually show new output
  useEffect(() => {
    if (!enableStreaming) {
      setDisplayedOutput(output)
      return
    }

    const newContent = output.slice(previousOutputRef.current.length)
    if (newContent.length === 0) return

    previousOutputRef.current = output
    
    // Clear any existing interval before starting new one
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current)
    }
    
    // Stream new content character by character (fast)
    const charsPerTick = 5 // Characters to display per tick (60fps)
    let index = 0
    streamIntervalRef.current = setInterval(() => {
      if (index < newContent.length) {
        setDisplayedOutput(prev => prev + newContent.slice(index, index + charsPerTick))
        index += charsPerTick
      } else {
        if (streamIntervalRef.current) {
          clearInterval(streamIntervalRef.current)
          streamIntervalRef.current = null
        }
      }
    }, 16) // 16ms per tick (~60fps)

    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current)
        streamIntervalRef.current = null
      }
    }
  }, [output, enableStreaming])

  // Auto-scroll to bottom when output changes (if autoScroll is enabled)
  useEffect(() => {
    if (outputRef.current && autoScroll) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [displayedOutput, autoScroll])

  // Detect manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (!outputRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = outputRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10
    
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false)
    } else if (isAtBottom && !autoScroll) {
      setAutoScroll(true)
    }
  }

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

  // Copy output to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(output)
    toast({
      title: "✅ Copied",
      description: "Console output copied to clipboard",
      duration: 2000
    })
  }

  // Download output as text file
  const handleDownload = () => {
    const blob = new Blob([output], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}-${Date.now()}.log`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: "✅ Downloaded",
      description: "Console output saved as log file",
      duration: 2000
    })
  }

  // Clear output
  const handleClear = () => {
    if (onClear) {
      onClear()
      setDisplayedOutput('')
      previousOutputRef.current = ''
      toast({
        title: "🧹 Cleared",
        description: "Console output cleared",
        duration: 2000
      })
    }
  }

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
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="h-8 w-8 hover:bg-gray-200"
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="h-8 w-8 hover:bg-gray-200"
                title="Download as file"
              >
                <Download className="h-4 w-4" />
              </Button>
              {onClear && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClear}
                  disabled={isRunning}
                  className="h-8 w-8 hover:bg-gray-200"
                  title="Clear output"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <div className="w-px h-6 bg-gray-300 mx-1" />
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
          </div>

          {/* Output Content */}
          <div className="relative flex-1 overflow-hidden">
            <div
              ref={outputRef}
              onScroll={handleScroll}
              className="h-full overflow-auto p-4 bg-slate-950 font-mono text-sm text-green-400 scroll-smooth"
            >
              <pre className="whitespace-pre-wrap break-words">
                {displayedOutput || 'No output yet...'}
              </pre>
            </div>
            
            {/* Auto-scroll indicator */}
            {!autoScroll && (
              <div className="absolute bottom-4 right-4">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setAutoScroll(true)
                    if (outputRef.current) {
                      outputRef.current.scrollTop = outputRef.current.scrollHeight
                    }
                  }}
                  className="shadow-lg"
                >
                  ↓ Resume auto-scroll
                </Button>
              </div>
            )}
          </div>

          {/* Footer with stats and close button */}
          <div className="flex items-center justify-between p-3 border-t bg-gray-50">
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span>Lines: {output.split('\n').length}</span>
              <span>Characters: {output.length}</span>
              {enableStreaming && isRunning && (
                <span className="flex items-center gap-1 text-blue-600">
                  <span className="inline-block w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                  Streaming...
                </span>
              )}
              {!autoScroll && (
                <span className="flex items-center gap-1 text-orange-600">
                  <span className="inline-block w-2 h-2 bg-orange-600 rounded-full"></span>
                  Auto-scroll paused
                </span>
              )}
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
