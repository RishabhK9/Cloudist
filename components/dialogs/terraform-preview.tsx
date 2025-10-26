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

  const splitIntoFiles = () => {
    if (!terraformCode) return {}
    
    const files: Record<string, string> = {}
    
    // Check if code uses file markers (# === filename.tf ===)
    const fileMarkerRegex = /^#\s*===\s*([a-z]+\.tf)\s*===\s*$/i
    const lines = terraformCode.split('\n')
    
    let currentFile = 'main.tf'
    let buffer: string[] = []
    let hasFileMarkers = false
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()
      
      // Check for file marker
      const markerMatch = trimmed.match(fileMarkerRegex)
      if (markerMatch) {
        hasFileMarkers = true
        // Save previous buffer
        if (buffer.length > 0) {
          const content = buffer.join('\n').trim()
          if (content) {
            files[currentFile] = (files[currentFile] || '') + content + '\n\n'
          }
          buffer = []
        }
        // Switch to new file (don't include the marker line itself)
        currentFile = markerMatch[1]
        continue
      }
      
      buffer.push(line)
    }
    
    // Add remaining buffer
    if (buffer.length > 0) {
      const content = buffer.join('\n').trim()
      if (content) {
        files[currentFile] = (files[currentFile] || '') + content
      }
    }
    
    // If no file markers were found, fall back to block-based parsing
    if (!hasFileMarkers) {
      return splitIntoFilesByBlockType()
    }
    
    // Clean up empty files and trim whitespace
    Object.keys(files).forEach(key => {
      files[key] = files[key].trim()
      if (!files[key] || files[key].length === 0) {
        delete files[key]
      }
    })
    
    // If no files were created, put everything in main.tf
    if (Object.keys(files).length === 0 && terraformCode) {
      files['main.tf'] = terraformCode
    }
    
    return files
  }

  // Fallback method: split by block type if no file markers
  const splitIntoFilesByBlockType = () => {
    if (!terraformCode) return {}
    
    const files: Record<string, string> = {}
    const lines = terraformCode.split('\n')
    let currentFile = ''
    let buffer: string[] = []
    let inBlock = false
    let blockDepth = 0
    
    // First pass: detect terraform block
    let hasTerraformBlock = false
    for (const line of lines) {
      if (line.trim().startsWith('terraform {')) {
        hasTerraformBlock = true
        break
      }
    }
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()
      
      // Track block depth
      const openBraces = (line.match(/{/g) || []).length
      const closeBraces = (line.match(/}/g) || []).length
      blockDepth += openBraces - closeBraces
      
      // Determine file based on block type (only when not inside a block)
      if (blockDepth === 0 && !inBlock) {
        let newFile = ''
        
        if (trimmed.startsWith('terraform {')) {
          newFile = 'terraform.tf'
          inBlock = true
        } else if (trimmed.startsWith('provider ')) {
          newFile = 'provider.tf'
          inBlock = true
        } else if (trimmed.startsWith('variable "')) {
          newFile = 'variables.tf'
          inBlock = true
        } else if (trimmed.startsWith('output "')) {
          newFile = 'outputs.tf'
          inBlock = true
        } else if (trimmed.startsWith('data "')) {
          newFile = 'data.tf'
          inBlock = true
        } else if (trimmed.startsWith('locals {')) {
          newFile = 'locals.tf'
          inBlock = true
        } else if (trimmed.startsWith('resource "')) {
          newFile = 'main.tf'
          inBlock = true
        }
        
        // If we're switching files, save the buffer
        if (newFile && newFile !== currentFile) {
          if (buffer.length > 0 && currentFile) {
            const content = buffer.join('\n').trim()
            if (content) {
              files[currentFile] = (files[currentFile] || '') + content + '\n\n'
            }
          }
          buffer = []
          currentFile = newFile
        }
      }
      
      // Add line to buffer if we have a current file
      if (currentFile) {
        buffer.push(line)
      }
      
      // Check if block ended
      if (blockDepth === 0 && inBlock) {
        inBlock = false
      }
    }
    
    // Add remaining buffer
    if (buffer.length > 0 && currentFile) {
      const content = buffer.join('\n').trim()
      if (content) {
        files[currentFile] = (files[currentFile] || '') + content
      }
    }
    
    // Clean up empty files and trim whitespace
    Object.keys(files).forEach(key => {
      files[key] = files[key].trim()
      if (!files[key] || files[key].length === 0) {
        delete files[key]
      }
    })
    
    // If no files were created, put everything in main.tf
    if (Object.keys(files).length === 0 && terraformCode) {
      files['main.tf'] = terraformCode
    }
    
    return files
  }

  const getCurrentFileContent = () => {
    const files = splitIntoFiles()
    return files[selectedFile] || terraformCode || ''
  }

  // Reset to first available file when dialog opens
  useEffect(() => {
    if (open && terraformCode) {
      const files = Object.keys(splitIntoFiles())
      if (files.length > 0) {
        // Prefer these files in order when opening dialog
        const preferredOrder = [
          'terraform.tf',
          'versions.tf', 
          'provider.tf',
          'main.tf',
          'variables.tf',
          'data.tf',
          'outputs.tf'
        ]
        const firstFile = preferredOrder.find(f => files.includes(f)) || files[0]
        setSelectedFile(firstFile)
      }
      setCopied(false)
    }
  }, [open, terraformCode])

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
      'terraform.tf': 'Terraform & provider versions',
      'provider.tf': 'Provider configuration',
      'main.tf': 'Main infrastructure resources',
      'variables.tf': 'Input variables & defaults',
      'outputs.tf': 'Output values & exports',
      'data.tf': 'Data sources & lookups',
      'locals.tf': 'Local values & calculations',
      'network.tf': 'Network & VPC resources',
      'security.tf': 'Security groups & IAM',
      'compute.tf': 'EC2, Lambda, ECS resources',
      'storage.tf': 'S3, EBS, EFS resources',
      'database.tf': 'RDS, DynamoDB resources',
      'monitoring.tf': 'CloudWatch & monitoring',
      'dns.tf': 'Route53 & DNS resources',
      'loadbalancer.tf': 'ALB, NLB, ELB resources',
      'kubernetes.tf': 'EKS & K8s resources',
      'backend.tf': 'Terraform backend config',
      'versions.tf': 'Version constraints',
    }
    
    return Object.keys(splitFiles)
      .filter(fileName => splitFiles[fileName]?.trim())
      .sort((a, b) => {
        // Sort files in a logical order for Terraform projects
        const order = [
          'terraform.tf',
          'versions.tf',
          'provider.tf',
          'backend.tf',
          'variables.tf',
          'locals.tf',
          'data.tf',
          'main.tf',
          'network.tf',
          'security.tf',
          'compute.tf',
          'storage.tf',
          'database.tf',
          'loadbalancer.tf',
          'dns.tf',
          'monitoring.tf',
          'kubernetes.tf',
          'outputs.tf'
        ]
        const aIndex = order.indexOf(a)
        const bIndex = order.indexOf(b)
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
        if (aIndex !== -1) return -1
        if (bIndex !== -1) return 1
        return a.localeCompare(b)
      })
      .map(fileName => ({
        name: fileName,
        description: fileDescriptions[fileName] || 'Terraform configuration file',
        content: splitFiles[fileName]
      }))
  }

  const formatTerraformCode = (code: string) => {
    const lines = code.split('\n')
    return lines.map((line, index) => {
      let className = "font-mono text-sm"
      
      // Syntax highlighting for Terraform
      const trimmed = line.trim()
      
      if (trimmed.startsWith('#')) {
        // Comments (including file markers)
        className += " text-gray-500 dark:text-gray-400 italic"
      } else if (trimmed.match(/^(terraform|provider|resource|data|variable|output|locals|module)\s*["{]/)) {
        // Block declarations
        className += " text-purple-600 dark:text-purple-400 font-semibold"
      } else if (trimmed.match(/^[a-z_][a-z0-9_]*\s*=/)) {
        // Attribute assignments
        className += " text-blue-600 dark:text-blue-400"
      } else if (trimmed.match(/^(required_providers|required_version|source|version|backend|depends_on|count|for_each)\s/)) {
        // Special keywords
        className += " text-orange-600 dark:text-orange-400 font-medium"
      } else if (line.includes('"') && !trimmed.startsWith('#')) {
        // Strings
        className += " text-green-600 dark:text-green-400"
      } else if (trimmed === '{' || trimmed === '}') {
        // Braces
        className += " text-gray-400"
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
