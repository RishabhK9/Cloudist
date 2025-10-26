"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { TerraformLoadingBar, type TerraformGenerationStep } from "@/components/ui/terraform-loading-bar"
import { TerraformGenerator } from "@/components/utils/terraform-generator"
import type { Node, Edge } from "@xyflow/react"

// Mock data for testing
const mockNodes: Node[] = [
  {
    id: "node-1",
    type: "cloudService",
    position: { x: 100, y: 100 },
    data: {
      id: "s3",
      name: "MyBucket",
      terraformType: "aws_s3_bucket",
      config: {
        bucket_name: "my-test-bucket",
        versioning: "Enabled"
      }
    }
  },
  {
    id: "node-2", 
    type: "cloudService",
    position: { x: 300, y: 100 },
    data: {
      id: "lambda",
      name: "MyFunction",
      terraformType: "aws_lambda_function",
      config: {
        function_name: "my-test-function",
        runtime: "nodejs20.x",
        handler: "index.handler"
      }
    }
  },
  {
    id: "node-3",
    type: "cloudService", 
    position: { x: 500, y: 100 },
    data: {
      id: "dynamodb",
      name: "MyTable",
      terraformType: "aws_dynamodb_table",
      config: {
        table_name: "my-test-table",
        hash_key: "id",
        billing_mode: "PAY_PER_REQUEST"
      }
    }
  }
]

const mockEdges: Edge[] = [
  {
    id: "edge-1",
    source: "node-2",
    target: "node-1",
    type: "custom"
  },
  {
    id: "edge-2", 
    source: "node-2",
    target: "node-3",
    type: "custom"
  }
]

export function TerraformLoadingTest() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [steps, setSteps] = useState<TerraformGenerationStep[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [showLoading, setShowLoading] = useState(false)

  const handleProgress = (step: TerraformGenerationStep, stepLogs: string[]) => {
    setSteps(prevSteps => {
      const existingStepIndex = prevSteps.findIndex(s => s.id === step.id)
      if (existingStepIndex !== -1) {
        const updatedSteps = [...prevSteps]
        updatedSteps[existingStepIndex] = step
        return updatedSteps
      } else {
        return [...prevSteps, step]
      }
    })
    setLogs(stepLogs)
    
    // Update current step based on completed steps
    const completedSteps = steps.filter(s => s.status === 'completed').length
    setCurrentStep(completedSteps + 1)
  }

  const testTerraformGeneration = async () => {
    setIsGenerating(true)
    setSteps([])
    setLogs([])
    setCurrentStep(0)
    setShowLoading(true)

    try {
      const generator = new TerraformGenerator("aws", mockNodes, mockEdges, handleProgress)
      const code = await generator.generateTerraformCode()
      
      console.log("Generated Terraform code:", code)
      
      // Hide loading bar after completion
      setTimeout(() => {
        setShowLoading(false)
        setIsGenerating(false)
      }, 2000)
      
    } catch (error) {
      console.error("Error generating Terraform:", error)
      setShowLoading(false)
      setIsGenerating(false)
    }
  }

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Terraform Loading Bar Test</h1>
      <p className="text-gray-600">
        This component demonstrates the Terraform generation loading bar with detailed logging.
        Click the button below to see the loading bar in action.
      </p>
      
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">S3 Bucket</h3>
            <p className="text-sm text-gray-600">MyBucket with versioning enabled</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">Lambda Function</h3>
            <p className="text-sm text-gray-600">MyFunction with Node.js runtime</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">DynamoDB Table</h3>
            <p className="text-sm text-gray-600">MyTable with pay-per-request billing</p>
          </div>
        </div>
        
        <Button 
          onClick={testTerraformGeneration}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? "Generating Terraform..." : "Generate Terraform with Loading Bar"}
        </Button>
        
        {steps.length > 0 && (
          <div className="mt-4 p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Generation Steps:</h3>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-2">
                  <span className="text-sm font-mono">{index + 1}.</span>
                  <span className="text-sm">{step.name}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    step.status === 'completed' ? 'bg-green-100 text-green-800' :
                    step.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    step.status === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {step.status.replace('_', ' ')}
                  </span>
                  {step.duration && (
                    <span className="text-xs text-gray-500">({step.duration}ms)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <TerraformLoadingBar
        isVisible={showLoading}
        steps={steps}
        currentStep={currentStep}
        totalSteps={3}
        progress={steps.length > 0 ? (steps.filter(s => s.status === 'completed').length / 3) * 100 : 0}
        logs={logs}
        onClose={() => setShowLoading(false)}
      />
    </div>
  )
}
