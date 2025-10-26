"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Copy, Check, FileCode, FolderDown, X } from "lucide-react"
import { useState, useEffect } from "react"

interface TerraformPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  terraformCode: string | null
}

export function TerraformPreviewDialog({
  open,
  onOpenChange,
  terraformCode,
}: TerraformPreviewDialogProps) {
  const [copied, setCopied] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string>('main.tf')

  // Reset to main.tf when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedFile('main.tf')
      setCopied(false)
    }
  }, [open])

  const splitIntoFiles = () => {
    if (!terraformCode) return {}
    
    const files: Record<string, string> = {
      'main.tf': ''
    }
    
    const lines = terraformCode.split('\n')
    let currentFile = 'main.tf'
    let buffer: string[] = []
    
    for (const line of lines) {
      // Check if this line should go into a different file
      if (line.includes('provider "')) {
        if (buffer.length > 0 && currentFile !== 'provider.tf') {
          files[currentFile] = buffer.join('\n')
        }
        currentFile = 'provider.tf'
        buffer = [line]
      } else if (line.includes('variable "')) {
        if (buffer.length > 0 && currentFile !== 'variables.tf') {
          files[currentFile] = buffer.join('\n')
        }
        currentFile = 'variables.tf'
        buffer = [line]
      } else if (line.includes('output "')) {
        if (buffer.length > 0 && currentFile !== 'outputs.tf') {
          files[currentFile] = buffer.join('\n')
        }
        currentFile = 'outputs.tf'
        buffer = [line]
      } else {
        buffer.push(line)
      }
    }
    
    // Add remaining buffer
    if (buffer.length > 0) {
      files[currentFile] = buffer.join('\n')
    }
    
    return files
  }

  const getCurrentFileContent = () => {
    const files = splitIntoFiles()
    return files[selectedFile] || terraformCode || ''
  }

  const handleCopy = () => {
    const currentCode = getCurrentFileContent()
    if (currentCode) {
      navigator.clipboard.writeText(currentCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownloadAll = () => {
    const files = getGeneratedFiles()
    if (files.length === 0) return

    // Download each file with a small delay
    files.forEach((file, index) => {
      setTimeout(() => {
        const blob = new Blob([file.content || ''], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, index * 100) // 100ms delay between downloads
    })
  }

  const getGeneratedFiles = () => {
    if (!terraformCode) return []
    
    const splitFiles = splitIntoFiles()
    const fileDescriptions: Record<string, string> = {
      'main.tf': 'Main infrastructure configuration',
      'variables.tf': 'Input variables',
      'outputs.tf': 'Output values',
      'provider.tf': 'Provider configuration'
    }
    
    return Object.keys(splitFiles)
      .filter(fileName => splitFiles[fileName]?.trim())
      .map(fileName => ({
        name: fileName,
        description: fileDescriptions[fileName] || 'Configuration file',
        content: splitFiles[fileName]
      }))
  }

  const formatTerraformCode = (code: string) => {
    const lines = code.split('\n')
    return lines.map((line, index) => {
      let className = "font-mono text-sm"
      
      // Syntax highlighting for Terraform
      if (line.trim().startsWith('#')) {
        className += " text-gray-500 dark:text-gray-400 italic"
      } else if (line.includes('resource "') || line.includes('provider "') || line.includes('variable "') || line.includes('output "')) {
        className += " text-purple-600 dark:text-purple-400 font-semibold"
      } else if (line.trim().match(/^[a-z_]+\s*=/)) {
        className += " text-blue-600 dark:text-blue-400"
      } else if (line.includes('"') && !line.trim().startsWith('#')) {
        className += " text-green-600 dark:text-green-400"
      } else {
        className += " text-foreground"
      }

      return (
        <div key={index} className={className}>
          <span className="text-gray-400 select-none mr-4 inline-block w-8 text-right">
            {index + 1}
          </span>
          {line || '\u00A0'}
        </div>
      )
    })
  }

  const generatedFiles = getGeneratedFiles()

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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 z-50"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Overlay Content */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
        <div className="bg-background border border-border rounded-lg shadow-2xl w-full max-w-[60vw] h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 p-6 border-b space-y-2">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Generated Terraform Code</h2>
                <p className="text-sm text-muted-foreground">
                  Review your infrastructure as code before planning and deploying
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 px-6 py-3 border-b flex-shrink-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileCode className="w-4 h-4" />
              <span>{generatedFiles.length} file{generatedFiles.length !== 1 ? 's' : ''} will be generated</span>
            </div>
            <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleDownloadAll}
              className="h-8 bg-purple-600 hover:bg-purple-700"
            >
              <FolderDown className="w-4 h-4 mr-2" />
              Download All ({generatedFiles.length})
            </Button>
            <Button
              variant="outline"
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
          </div>
        </div>

          {/* Files List - Clickable Tabs */}
          {generatedFiles.length > 0 && (
            <div className="space-y-2 flex-shrink-0 px-6 py-4">
              <h3 className="text-sm font-semibold">Files to be Generated:</h3>
              <div className="flex gap-2 flex-wrap">
              {generatedFiles.map((file) => (
                <button
                  key={file.name}
                  onClick={() => setSelectedFile(file.name)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-all ${
                    selectedFile === file.name
                      ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                      : 'bg-muted/50 hover:bg-muted border-border hover:border-purple-400'
                  }`}
                >
                  <FileCode className={`w-4 h-4 ${
                    selectedFile === file.name ? 'text-white' : 'text-purple-600'
                  }`} />
                  <div className="text-left">
                    <p className="text-sm font-medium font-mono">{file.name}</p>
                    <p className={`text-xs ${
                      selectedFile === file.name ? 'text-purple-100' : 'text-muted-foreground'
                    }`}>{file.description}</p>
                  </div>
                </button>
              ))}
              </div>
            </div>
          )}

          {/* Code Preview */}
          <div className="flex-1 flex flex-col border rounded-md bg-slate-950 dark:bg-slate-950 overflow-hidden min-h-0 mx-6 mb-6">
          {/* File Header */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800 bg-slate-900 flex-shrink-0">
            <FileCode className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-mono text-gray-300">{selectedFile}</span>
            <span className="text-xs text-gray-500 ml-auto">
              {getCurrentFileContent().split('\n').length} lines
            </span>
          </div>
          
          {/* Code Content */}
          <ScrollArea className="flex-1 min-h-0 h-full">
            <div className="p-4">
              {getCurrentFileContent() ? (
                <div className="text-gray-100">
                  {formatTerraformCode(getCurrentFileContent())}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No code available for this file</p>
              )}
            </div>
          </ScrollArea>
          </div>
        </div>
      </div>
    </>
  )
}
