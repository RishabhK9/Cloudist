"use client"

import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

export interface TerraformGenerationStep {
  id: string
  name: string
  status: 'pending' | 'in_progress' | 'completed' | 'error'
  message?: string
  duration?: number
  resources?: string[]
}

export interface TerraformLoadingBarProps {
  isVisible: boolean
  steps: TerraformGenerationStep[]
  currentStep: number
  totalSteps: number
  progress: number
  logs: string[]
  onClose?: () => void
}

export function TerraformLoadingBar({
  isVisible,
  steps,
  currentStep,
  totalSteps,
  progress,
  logs,
  onClose
}: TerraformLoadingBarProps) {
  const [expandedLogs, setExpandedLogs] = useState(false)

  if (!isVisible) return null

  const getStepIcon = (step: TerraformGenerationStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'in_progress':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStepStatusColor = (step: TerraformGenerationStep) => {
    switch (step.status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                Generating Terraform Configuration
              </CardTitle>
              <CardDescription>
                Processing {totalSteps} steps for your infrastructure
              </CardDescription>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="space-y-4 overflow-y-auto max-h-[50vh]">
          {/* Steps List */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Generation Steps</h4>
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  index === currentStep - 1 ? 'ring-2 ring-blue-200' : ''
                }`}
              >
                {getStepIcon(step)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{step.name}</span>
                    <Badge variant="outline" className={`text-xs ${getStepStatusColor(step)}`}>
                      {step.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  {step.message && (
                    <p className="text-xs text-muted-foreground mt-1">{step.message}</p>
                  )}
                  {step.resources && step.resources.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {step.resources.map((resource, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {resource}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {step.duration && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Completed in {step.duration}ms
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Logs Section */}
          {logs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm text-muted-foreground">Generation Logs</h4>
                <button
                  onClick={() => setExpandedLogs(!expandedLogs)}
                  className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {expandedLogs ? 'Hide' : 'Show'} Logs
                </button>
              </div>
              
              {expandedLogs && (
                <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <div className="space-y-1">
                    {logs.map((log, index) => (
                      <div key={index} className="text-xs font-mono text-gray-700">
                        <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span> {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
