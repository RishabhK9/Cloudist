"use client"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { deployInfrastructure, getDeploymentStatus } from "@/lib/api-service"
import { ConfigLoader } from "@/lib/config-loader"
import { CredentialManager } from "@/lib/credential-manager"
import { InfrastructureCanvasProps } from "@/types"
import type { DeploymentStatus } from "@/types/deployment"
import {
  addEdge,
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type OnConnect,
  type ReactFlowInstance,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import {
  ArrowLeft,
  Code,
  Download,
  Play,
  Pin,
  Brain,
  Save,
  Clock
} from "lucide-react"
import GlassyPaneContainer from '@/src/cedar/components/containers/GlassyPaneContainer'
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react"
import { CloudServiceNode } from "./cloud-service-node"
import { ConfigurationPanel } from "./configuration-panel"
import { getConnectionSuggestions, validateConnection } from "./connection-validator"
import { TerraformGenerator } from "./terraform-generator"
import { UndoRedoControls } from "./undo-redo-controls"
import { useCanvasHistory } from "@/hooks/use-canvas-history"
import { ProjectCanvasUtils } from "@/lib/project-canvas-utils"
import { registerCanvasFunctions, unregisterCanvasFunctions } from "@/lib/infrastructure-manager"
import { AgentChat } from "@/components/agent-chat"

import { AIReviewDialog } from "./ai-review-dialog"
import { SaveStatusIndicator } from "./save-status-indicator"


const createNodeTypes = (onNodeDoubleClick: (nodeData: any) => void) => ({
  cloudService: (props: any) => <CloudServiceNode {...props} onDoubleClick={onNodeDoubleClick} />,
})

const createEdgeTypes = () => {
  console.log('Creating edge types - using default edges for now')
  return {
    // Temporarily removing custom edge to test
    // custom: ConnectionEdge,
  }
}

// Use smoothstep edge type for testing
const defaultEdgeOptions = {
  style: { strokeWidth: 3, stroke: '#ef4444' },
  type: 'smoothstep',
  animated: false,
}

let nodeId = 0
const getId = () => `node_${nodeId++}`

export function InfrastructureCanvas({ provider, onBack, projectId }: InfrastructureCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([])
  
  // Initialize undo/redo functionality
  const { canUndo, canRedo, undo, redo, saveState, getCurrentState, historyLength, currentIndex, initializeHistory } = useCanvasHistory()
  
  // Canvas state management
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  // Save current canvas state to project
  const saveCurrentState = useCallback(() => {
    if (projectId) {
      setIsSaving(true)
      ProjectCanvasUtils.saveCanvasState(projectId, nodes, edges)
      setLastSaved(new Date().toISOString())
      
      setTimeout(() => setIsSaving(false), 1000) // Show saving indicator briefly
      console.log('💾 Canvas state saved to project')
    }
  }, [projectId, nodes, edges])

  // Check for unsaved changes
  const hasUnsavedChanges = useCallback((): boolean => {
    if (!projectId) return false
    return ProjectCanvasUtils.hasUnsavedChanges(projectId, nodes, edges)
  }, [projectId, nodes, edges])
  
  // Track if we're syncing from history to prevent conflicts
  const isSyncingFromHistory = useRef(false)

  // Load saved state when project opens
  useEffect(() => {
    if (projectId) {
      const savedState = ProjectCanvasUtils.loadCanvasState(projectId)
      if (savedState) {
        console.log('Loading saved canvas state for project:', projectId)
        setNodes(savedState.nodes)
        setEdges(savedState.edges)
        // Initialize history with the loaded state as the initial state
        initializeHistory(savedState.nodes, savedState.edges)
        setLastSaved(new Date().toISOString())
      }
    }
  }, [projectId, initializeHistory])

  // Sync state with history when undo/redo is performed
  useEffect(() => {
    const currentState = getCurrentState()
    if (currentState && !isSyncingFromHistory.current) {
      console.log('Syncing state from history:', currentState)
      isSyncingFromHistory.current = true
      setNodes(currentState.nodes)
      setEdges(currentState.edges)
      // Reset the flag after state is synced
      setTimeout(() => {
        isSyncingFromHistory.current = false
      }, 100)
    }
  }, [currentIndex]) // Only depend on currentIndex, not the function

  // Canvas add functions for AI infrastructure creation
  const addNodesToCanvas = useCallback((newNodes: Node[]) => {
    console.log('🎯 Canvas: AI adding nodes directly to canvas:', newNodes.length)

    setNodes((currentNodes) => {
      console.log('📊 Canvas: Current nodes:', currentNodes.length, 'Adding:', newNodes.length)
      const updatedNodes = [...currentNodes, ...newNodes]
      console.log('📊 Canvas: New total nodes:', updatedNodes.length)
      return updatedNodes
    })
  }, [])

  const addEdgesToCanvas = useCallback((newEdges: Edge[]) => {
    console.log('🔗 Canvas: AI adding edges directly to canvas:', newEdges.length)
    setEdges((currentEdges) => {
      console.log('📊 Canvas: Current edges:', currentEdges.length, 'Adding:', newEdges.length)
      const updatedEdges = [...currentEdges, ...newEdges]
      console.log('📊 Canvas: New total edges:', updatedEdges.length)
      return updatedEdges
    })
  }, [])

  // Get canvas state function
  const getCanvasState = useCallback(() => {
    return { nodes, edges }
  }, [nodes, edges])

  // Register canvas functions for AI infrastructure creation
  useEffect(() => {
    console.log('🎨 Infrastructure Canvas: Registering functions for AI')
    registerCanvasFunctions(addNodesToCanvas, addEdgesToCanvas, getCanvasState)

    return () => {
      console.log('🎨 Infrastructure Canvas: Unregistering functions')
      unregisterCanvasFunctions()
    }
  }, [addNodesToCanvas, addEdgesToCanvas, getCanvasState])

  // Debug: Log edges changes
  useEffect(() => {
    console.log('Edges updated:', edges)
    console.log('Edges length:', edges.length)
    if (edges.length > 0) {
      console.log('First edge details:', edges[0])
    }
  }, [edges])

  // Debug: Log nodes changes
  useEffect(() => {
    console.log('Nodes updated:', nodes)
    console.log('Nodes length:', nodes.length)
  }, [nodes])

  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false)
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const [selectedEdges, setSelectedEdges] = useState<string[]>([])
  const [activeFile, setActiveFile] = useState("main.tf")
  const [terraformFiles, setTerraformFiles] = useState<Record<string, string>>({
    "main.tf": "",
    "variables.tf": "",
    "outputs.tf": "",
    "providers.tf": ""
  })

  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentError, setDeploymentError] = useState<string | null>(null)
  // Local fake progress to give the user visual feedback while deployment is running
  const [fakeProgress, setFakeProgress] = useState<number>(0)
  const [isProgressVisible, setIsProgressVisible] = useState<boolean>(true)
  const [isAIReviewOpen, setIsAIReviewOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [isAIReviewLoading, setIsAIReviewLoading] = useState(false)
  const [aiReviewError, setAiReviewError] = useState<string | null>(null)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  const providerConfig = {
    aws: {
      name: "AWS",
      color: "text-orange-500",
    },
    gcp: {
      name: "Google Cloud",
      color: "text-blue-500",
    },
    azure: {
      name: "Microsoft Azure",
      color: "text-cyan-500",
    },
  }

  const [services, setServices] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [servicesLoaded, setServicesLoaded] = useState(false)

  const config = providerConfig[provider as keyof typeof providerConfig]

  // Load services from config files
  useEffect(() => {
    const loadServices = async () => {
      try {
        const serviceConfigs = await ConfigLoader.loadAllConfigs()
        const providerServices = Object.values(serviceConfigs[provider] || {})
        setServices(providerServices)
        setCategories([...new Set(providerServices.map((s) => s.category))])
        setServicesLoaded(true)
      } catch (error) {
        console.error('Failed to load services:', error)
        setServices([])
        setCategories([])
        setServicesLoaded(true)
      }
    }

    loadServices()
  }, [provider])

  const onConnect: OnConnect = useCallback(
    (params: Connection | Edge) => {
      console.log('onConnect called with params:', params)
      
      const sourceNode = nodes.find((n) => n.id === params.source)
      const targetNode = nodes.find((n) => n.id === params.target)

      if (!sourceNode || !targetNode) {
        console.log('Source or target node not found')
        return
      }

      const sourceType = (sourceNode.data as any).id
      const targetType = (targetNode.data as any).id

      console.log('Connecting:', sourceType, 'to', targetType)

      // Validate the connection
      const rule = validateConnection(sourceType, targetType, provider)
      
      const newEdge = {
        ...params,
        type: 'smoothstep',
        animated: false,
        style: { strokeWidth: 4, stroke: '#10b981' }, // Green color
        data: {
          relationship: rule?.relationship || "connects_to",
          description: rule?.description || "Manual connection",
          bidirectional: rule?.bidirectional || false,
        },
      }
      
      console.log('Creating new edge:', newEdge)
      
      // Calculate the new state before applying it
      const updatedEdges = addEdge(newEdge, edges)
      
      // Set flag to prevent history sync from overwriting this change
      isSyncingFromHistory.current = true
      
      // Update edges state first
      setEdges(updatedEdges)
      
      // Save state with the complete new state
      saveState(nodes, updatedEdges, 'connect')
      
      // Reset flag after a short delay to allow state updates to complete
      setTimeout(() => {
        isSyncingFromHistory.current = false
      }, 50)
    },
    [nodes, edges, provider, saveState],
  )

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()

      if (!reactFlowInstance) return

      const serviceData = event.dataTransfer.getData("application/reactflow")

      if (!serviceData) return

      const service = JSON.parse(serviceData)
      
      // Use the ReactFlow instance's screenToFlowPosition method directly
      // This method handles all the internal transforms, zoom, and pan calculations
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const newNode: Node = {
        id: getId(),
        type: "cloudService",
        position,
        data: {
          ...service,
          provider: provider,
          config: service.defaultConfig || {},
          terraformType: service.terraformType,
        },
      }

      // Calculate the new state before applying it
      const updatedNodes = nodes.concat(newNode)
      
      // Set flag to prevent history sync from overwriting this change
      isSyncingFromHistory.current = true
      
      // Update nodes state first
      setNodes(updatedNodes)
      
      // Save state with the complete new state
      saveState(updatedNodes, edges, 'add_node')
      
      // Reset flag after a short delay to allow state updates to complete
      setTimeout(() => {
        isSyncingFromHistory.current = false
      }, 50)
    },
    [reactFlowInstance, nodes, edges, provider, saveState],
  )

  const onDragStart = (event: DragEvent, service: any) => {
    event.dataTransfer.setData("application/reactflow", JSON.stringify(service))
    event.dataTransfer.effectAllowed = "move"
  }

  const clearCanvas = () => {
    setNodes([])
    setEdges([])
  }

  const deleteSelectedElements = useCallback(() => {
    let updatedNodes = nodes
    let updatedEdges = edges
    let hasChanges = false
    
    if (selectedNodes.length > 0) {
      updatedNodes = nodes.filter((node) => !selectedNodes.includes(node.id))
      hasChanges = true
      setSelectedNodes([])
    }
    
    if (selectedEdges.length > 0) {
      updatedEdges = edges.filter((edge) => !selectedEdges.includes(edge.id))
      hasChanges = true
      setSelectedEdges([])
    }
    
    if (hasChanges) {
      // Set flag to prevent history sync from overwriting this change
      isSyncingFromHistory.current = true
      
      // Apply the changes
      if (selectedNodes.length > 0) {
        setNodes(updatedNodes)
      }
      if (selectedEdges.length > 0) {
        setEdges(updatedEdges)
      }
      
      // Save state with complete updated state
      saveState(updatedNodes, updatedEdges, 'delete_elements')
      
      // Reset flag after a short delay to allow state updates to complete
      setTimeout(() => {
        isSyncingFromHistory.current = false
      }, 50)
    }
  }, [selectedNodes, selectedEdges, nodes, edges, saveState])

  const handleSelectionChange = useCallback(({ nodes: selectedNodesArray, edges: selectedEdgesArray }: { nodes: any[], edges: any[] }) => {
    setSelectedNodes(selectedNodesArray.map(node => node.id))
    setSelectedEdges(selectedEdgesArray.map(edge => edge.id))
  }, [])


  const suggestions = getConnectionSuggestions(nodes, provider!)

  const handleNodeDoubleClick = (nodeData: any) => {
    setSelectedNode(nodeData)
    setIsConfigPanelOpen(true)
  }

  const handleConfigUpdate = (config: Record<string, any>) => {
    if (selectedNode) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === selectedNode.id
            ? { ...node, data: { ...node.data, config } }
            : node
        )
      )
      // Trigger Terraform file regeneration after config update
      setTimeout(() => {
        updateMainTf()
      }, 100)
    }
  }

  const handleCloseConfigPanel = () => {
    setIsConfigPanelOpen(false)
    setSelectedNode(null)
  }

  const handleSaveConfig = () => {
    // Trigger Terraform file regeneration when save is pressed
    updateAllTerraformFiles()
    console.log('Configuration saved - Terraform files updated')
    
    // Optional: Add visual feedback (could be enhanced with toast notifications)
    // For now, we'll just log the success
    console.log('✅ Configuration saved successfully!')
  }

  const handleAIReview = async () => {
    setIsAIReviewOpen(true)
    setIsAIReviewLoading(true)
    setAiReviewError(null)
    setAiAnalysis(null)

    try {
      // Create an AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const response = await fetch('/api/ai-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          terraformFiles,
          provider,
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const analysis = await response.json()
      setAiAnalysis(analysis)
    } catch (error) {
      console.error('AI Review Error:', error)
      if (error instanceof Error && error.name === 'AbortError') {
        setAiReviewError('AI review timed out. Please try again with a smaller configuration.')
      } else {
        setAiReviewError(error instanceof Error ? error.message : 'Failed to analyze infrastructure')
      }
    } finally {
      setIsAIReviewLoading(false)
    }
  }

  // Generate Terraform code from nodes
  const generateTerraformCode = async () => {
    if (nodes.length === 0) {
      return `# No resources defined yet
# Drag and drop services from the sidebar to generate Terraform code`
    }

    try {
      const terraformGenerator = new TerraformGenerator(provider, nodes, edges)
      return await terraformGenerator.generateTerraformCode()
    } catch (error) {
      console.error('Error generating Terraform code:', error)
      return `# Error generating Terraform code: ${error}`
    }
  }

  const handleDownloadTerraformCode = (activeFile: string) => {
    const content = terraformFiles[activeFile];
    if (!content) {
      console.error("No content found for this file:", activeFile);
      return;
    }

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = activeFile; // use filename
    link.click();

    // cleanup
    URL.revokeObjectURL(url);

  }

  // Helper function to generate Terraform files
  const generateTerraformFiles = async () => {
    const mainTf = await generateTerraformCode()
    
    // Generate separate files using TerraformGenerator
    let variablesTf: string = ""
    let outputsTf: string = ""
    let providersTf: string = ""
    
    if (nodes.length > 0) {
      try {
        const terraformGenerator = new TerraformGenerator(provider, nodes, edges)
        const output = await terraformGenerator.generate()
        
        // Generate variables.tf
        if (Object.keys(output.variables).length > 0) {
          variablesTf = "# Variables\n"
          Object.entries(output.variables).forEach(([name, config]) => {
            variablesTf += `variable "${name}" {\n`
            Object.entries(config as Record<string, any>).forEach(([key, value]) => {
              if (key === "type" && value === "string") {
                variablesTf += `  ${key} = ${value}\n`
              } else if (typeof value === "string") {
                variablesTf += `  ${key} = "${value}"\n`
              } else if (typeof value === "boolean") {
                variablesTf += `  ${key} = ${value}\n`
              } else {
                variablesTf += `  ${key} = ${JSON.stringify(value)}\n`
              }
            })
            variablesTf += "}\n\n"
          })
        } else {
          variablesTf = `# Variables for your infrastructure
variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}
`
        }
        
        // Generate outputs.tf
        const terraformOutput = terraformGenerator.generate()
        if (Object.keys(terraformOutput.outputs).length > 0) {
          outputsTf = "# Outputs\n"
          Object.entries(terraformOutput.outputs).forEach(([name, config]) => {
            outputsTf += `output "${name}" {\n`
            Object.entries(config as Record<string, any>).forEach(([key, value]) => {
              if (typeof value === "string") {
                outputsTf += `  ${key} = "${value}"\n`
              } else if (typeof value === "boolean") {
                outputsTf += `  ${key} = ${value}\n`
              } else {
                outputsTf += `  ${key} = ${JSON.stringify(value)}\n`
              }
            })
            outputsTf += "}\n\n"
          })
        } else {
          outputsTf = `# Outputs for your infrastructure
output "resources_created" {
  description = "Number of resources created"
  value       = ${nodes.length}
}
`
        }
        
        // Generate providers.tf
        providersTf = terraformGenerator.generateProviderBlock()
        
      } catch (error) {
        console.error('Error generating Terraform files:', error)
        // Fallback to default content
        variablesTf = `# Variables for your infrastructure
variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}
`

        outputsTf = `# Outputs for your infrastructure
output "resources_created" {
  description = "Number of resources created"
  value       = ${nodes.length}
}
`

        providersTf = `# Provider configuration
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}
`
      }
    } else {
      // Default content when no nodes
      variablesTf = `# Variables for your infrastructure
variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}
`

      outputsTf = `# Outputs for your infrastructure
output "resources_created" {
  description = "Number of resources created"
  value       = ${nodes.length}
}
`

      providersTf = `# Provider configuration
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}
`
    }

    setTerraformFiles({
      "main.tf": mainTf,
      "variables.tf": variablesTf,
      "outputs.tf": outputsTf,
      "providers.tf": providersTf
    })
  }

  // Handle file content changes
  const handleFileContentChange = (content: string) => {
    setTerraformFiles(prev => ({
      ...prev,
      [activeFile]: content
    }))
  }

  // Handle file switching
  const handleFileChange = (fileName: string) => {
    setActiveFile(fileName)
  }

  // Handle Terraform deployment
  const handleDeploy = async () => {
    if (nodes.length === 0) {
      setDeploymentError("No infrastructure defined. Please add some services to deploy.")
      return
    }

    // Check if credentials are configured
    if (!CredentialManager.hasCredentials(provider as 'aws' | 'gcp' | 'azure')) {
      setDeploymentError(`No ${provider.toUpperCase()} credentials configured. Please configure credentials in settings.`)
      return
    }

  // Reset progress UI when starting a new deployment
  setFakeProgress(0)
  setIsProgressVisible(true)
  setDeploymentError(null)
  setDeploymentStatus(null)
  setIsDeploying(true)

    try {
      const deploymentRequest = {
        name: `Infrastructure Deployment ${new Date().toLocaleString()}`,
        provider: provider as 'aws' | 'gcp' | 'azure',
        nodes: nodes,
        edges: edges,
        autoApprove: false
      }

      const result = await deployInfrastructure(deploymentRequest)
      
      if (result.success) {
        // Start polling for deployment status
        startDeploymentPolling(result.deploymentId)
      } else {
        setDeploymentError(result.error || 'Deployment failed')
        setIsDeploying(false)
      }
    } catch (error) {
      setDeploymentError(error instanceof Error ? error.message : 'Unknown error occurred')
      setIsDeploying(false)
    }
  }

  // Poll deployment status
  const startDeploymentPolling = (deploymentId: string) => {
    const pollInterval = setInterval(() => {
      const status = getDeploymentStatus(deploymentId)
      
      if (status) {
        setDeploymentStatus(status)
        
        if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
          clearInterval(pollInterval)
          setIsDeploying(false)
          
          if (status.status === 'failed') {
            setDeploymentError(status.error || 'Deployment failed')
          }
        }
      } else {
        clearInterval(pollInterval)
        setIsDeploying(false)
        setDeploymentError('Deployment status not found')
      }
    }, 2000) // Poll every 2 seconds

    // Cleanup interval after 10 minutes
    setTimeout(() => {
      clearInterval(pollInterval)
    }, 600000)
  }

  // Fake progress updater: slowly increases a local progress value while deploying so
  // user sees activity even before we have real status updates. When real progress
  // is available it will sync to the real value.
  useEffect(() => {
    let timer: number | undefined

    if (isDeploying) {
      // start with a small visible amount
      setFakeProgress((p) => (p > 0 ? p : 5))

      timer = window.setInterval(() => {
        setFakeProgress((prev) => {
          // don't jump past 95% while waiting for real status
          const next = prev + Math.random() * 6
          return Math.min(95, next)
        })
      }, 1200)
    } else {
      // reset when not deploying
      setFakeProgress(0)
    }

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isDeploying])

  // Sync fakeProgress to real deployment progress when available
  useEffect(() => {
    if (!deploymentStatus) return

    if (typeof deploymentStatus.progress === 'number') {
      setFakeProgress(deploymentStatus.progress)
    }

    // When deployment finishes, clear the progress and hide the bar after a short delay
    if (deploymentStatus.status === 'completed' || deploymentStatus.status === 'failed' || deploymentStatus.status === 'cancelled') {
      const t = window.setTimeout(() => {
        setFakeProgress(0)
        setIsProgressVisible(false)
      }, 800)
      return () => clearTimeout(t)
    }
  }, [deploymentStatus])

  // Update all Terraform files when nodes change
  const updateAllTerraformFiles = async () => {
    await generateTerraformFiles()
  }

  // Update main.tf when nodes change (kept for backward compatibility)
  const updateMainTf = async () => {
    await updateAllTerraformFiles()
  }

  // Initialize files on component mount
  useEffect(() => {
    const initFiles = async () => {
      await generateTerraformFiles()
    }
    initFiles()
  }, [])

  // Update main.tf when nodes change
  useEffect(() => {
    const updateFiles = async () => {
      await updateMainTf()
    }
    updateFiles()
  }, [nodes])

  // Handle keyboard events for delete and undo/redo functionality
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Only prevent default if not typing in an input field
        const target = event.target as HTMLElement
        const isInputField = target.tagName === 'INPUT' || 
                            target.tagName === 'TEXTAREA' || 
                            target.contentEditable === 'true' ||
                            target.getAttribute('role') === 'textbox'
        
        if (!isInputField) {
          event.preventDefault()
          deleteSelectedElements()
        }
      }
      
      // Undo/Redo shortcuts
      if ((event.ctrlKey || event.metaKey) && event.key) {
        if (event.key === 'z' && !event.shiftKey) {
          event.preventDefault()
          undo()
        } else if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
          event.preventDefault()
          redo()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [deleteSelectedElements, undo, redo])

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Top Header */}
      <header className="h-14 border-b border-gray-200 bg-white flex items-center px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h- mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <UndoRedoControls
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              showCounts={true}
              historyLength={historyLength}
              currentIndex={currentIndex}
            />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={saveCurrentState}
              disabled={!hasUnsavedChanges()}
              className="text-gray-600 hover:text-gray-900"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <SaveStatusIndicator
              isAutoSaving={isSaving}
              hasUnsavedChanges={hasUnsavedChanges()}
              lastSaved={lastSaved}
            />
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Left Sidebar */}
        <aside className="w-80 border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-4 space-y-4">
            
            {/* Cloud Services */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">Cloud Services</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                {!servicesLoaded ? (
                  <div className="col-span-3 flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading services...</span>
                  </div>
                ) : services.length === 0 ? (
                  <div className="col-span-3 flex items-center justify-center p-4">
                    <span className="text-sm text-gray-600">No services available</span>
                  </div>
                ) : (
                  services.map((service) => (
                    <div
                      key={service.id}
                      className="flex flex-col items-center p-2 hover:bg-purple-50 rounded cursor-grab active:cursor-grabbing border border-gray-200 hover:border-purple-200 transition-colors"
                      draggable
                      onDragStart={(event) => onDragStart(event, service)}
                    >
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm mb-1">
                        {service.icon.startsWith('/') ? (
                          <img src={service.icon} alt={service.name} className="w-6 h-6" />
                        ) : (
                          <span className="text-lg">{service.icon}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-700 text-center leading-tight">{service.name}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Node and edge summary */}
            <div className="mt-auto pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-500 mb-2">
                Number of nodes: {nodes.length}
              </div>
              <div className="text-xs text-gray-500 mb-2">
                Number of edges: {edges.length}
              </div>
              {(selectedNodes.length > 0 || selectedEdges.length > 0) && (
                <div className="mb-2">
                  <div className="text-xs text-red-600 mb-1">
                    Selected: {selectedNodes.length} node{selectedNodes.length !== 1 ? 's' : ''}, {selectedEdges.length} edge{selectedEdges.length !== 1 ? 's' : ''}
                  </div>
                  <Button 
                    onClick={deleteSelectedElements}
                    size="sm"
                    variant="destructive"
                    className="w-full text-xs"
                  >
                    Delete Selected
                  </Button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Central Canvas */}
        <main className="flex-1 flex flex-col">

          {/* Canvas Area */}
          <div className="flex-1 relative bg-gray-50">
            <div className="h-full">
              <ReactFlowProvider>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onInit={(instance) => {
                    console.log('ReactFlow initialized:', instance)
                    setReactFlowInstance(instance as any)
                  }}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onSelectionChange={handleSelectionChange}
                  nodeTypes={createNodeTypes(handleNodeDoubleClick)}
                  // edgeTypes={createEdgeTypes()}
                  className="bg-gray-50"
                  proOptions={{ hideAttribution: true }}
                  connectionLineStyle={{ 
                    stroke: "#a855f7", 
                    strokeWidth: 4,
                    strokeLinecap: "round",
                    strokeLinejoin: "round"
                  }}
                  connectionLineType={ConnectionLineType.Bezier}
                  connectionMode={ConnectionMode.Loose}
                  defaultEdgeOptions={defaultEdgeOptions}
                  // Increase the connection radius so users don't have to be pixel-perfect when
                  // starting/ending connections on small handles.
                  connectionRadius={40}
                  snapToGrid={true}
                  snapGrid={[20, 20]}
                  panOnDrag={true}
                  panOnScroll={false}
                  panOnScrollSpeed={0}
                  selectNodesOnDrag={false}
                  nodesDraggable={true}
                  nodesConnectable={true}
                  elementsSelectable={true}
                  elevateNodesOnSelect={false}
                  autoPanOnNodeDrag={false}
                  zoomOnScroll={true}
                  minZoom={0.1}
                  maxZoom={4}
                >
                  <Background 
                    variant={BackgroundVariant.Dots} 
                    gap={20} 
                    size={2} 
                    color="#9ca3af"
                    style={{ backgroundColor: '#f9fafb' }}
                  />
                </ReactFlow>
              </ReactFlowProvider>
            </div>
            
            {/* AI Review Button - Bottom Right */}
            <div className="absolute bottom-4 right-4 pointer-events-none z-10">
              <div className="pointer-events-auto">
                <GlassyPaneContainer
                  className="cursor-pointer hover:scale-105 transition-transform duration-200"
                  onClick={handleAIReview}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <button className="px-6 py-3 flex items-center gap-2 text-sm font-medium text-gray-800 hover:text-gray-900">
                    <Brain className="w-5 h-5" />
                    AI Review
                  </button>
                </GlassyPaneContainer>
              </div>
            </div>

          </div>
        </main>

        {/* Right Panel - Configuration or Code Editor */}
        {isConfigPanelOpen ? (
          <ConfigurationPanel
            isOpen={isConfigPanelOpen}
            onClose={handleCloseConfigPanel}
            nodeData={selectedNode}
            serviceConfig={null} // This will be loaded by the configuration panel
            onConfigUpdate={handleConfigUpdate}
            onSave={handleSaveConfig}
          />
        ) : (
          <aside className="w-80 border-l border-gray-200 bg-gray-50 text-gray-900">
            <div className="h-full flex flex-col">
              {/* Code Editor Header */}
              <div className="h-12 border-b border-gray-200 flex items-center justify-between px-4 bg-gray-50">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  <Select value={activeFile} onValueChange={handleFileChange}>
                    <SelectTrigger className="w-44 bg-gray-100 border-gray-300 text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-100 border-gray-300">
                      <SelectItem value="main.tf" className="text-gray-900 hover:bg-gray-200">main.tf</SelectItem>
                      <SelectItem value="variables.tf" className="text-gray-900 hover:bg-gray-200">variables.tf</SelectItem>
                      <SelectItem value="outputs.tf" className="text-gray-900 hover:bg-gray-200">outputs.tf</SelectItem>
                      <SelectItem value="providers.tf" className="text-gray-900 hover:bg-gray-200">providers.tf</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => handleDownloadTerraformCode(activeFile)} variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-600 hover:text-gray-900"
                    onClick={handleDeploy}
                    disabled={isDeploying}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Code Content */}
              <div className="flex-1 overflow-auto p-4 bg-gray-50 flex flex-col">
                {/* Deployment Status */}
                {(isDeploying || deploymentStatus || deploymentError || fakeProgress > 0) && (
                  <div className="mb-4">
                    {/* Progress bar (fake/approximate) placed above the status box */}
                    {(isProgressVisible && (isDeploying || fakeProgress > 0)) && (
                      <div className="mb-2 relative">
                        <div className="absolute top-0 right-0">
                          <button
                            className="text-xs text-gray-500 hover:text-gray-700 p-1"
                            onClick={() => setIsProgressVisible(false)}
                            aria-label="Close progress"
                          >
                            ×
                          </button>
                        </div>
                        <div className="text-xs text-gray-600 mb-1">Deployment progress</div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(100, Math.max(0, Math.round(fakeProgress)))}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{Math.round(fakeProgress)}%</div>
                      </div>
                    )}

                    <div className="p-3 bg-white rounded-lg border">
                    {isDeploying && deploymentStatus && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">
                            {deploymentStatus.message}
                          </span>
                          <span className="text-xs text-gray-500">
                            {deploymentStatus.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${deploymentStatus.progress}%` }}
                          ></div>
                        </div>
                        {deploymentStatus.logs.length > 0 && (
                          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">
                            {deploymentStatus.logs.slice(-3).map((log, index) => (
                              <div key={index} className="mb-1">{log}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {deploymentError && (
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        <div className="font-medium">Deployment Error:</div>
                        <div>{deploymentError}</div>
                      </div>
                    )}
                    
                    {deploymentStatus?.status === 'completed' && (
                      <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                        <div className="font-medium">✓ Deployment Completed Successfully!</div>
                        {deploymentStatus.outputs && (
                          <div className="mt-2 text-xs">
                            <div className="font-medium">Outputs:</div>
                            {Object.entries(deploymentStatus.outputs).map(([key, value]) => (
                              <div key={key}>{key}: {String(value)}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                )}

                <textarea
                  value={terraformFiles[activeFile as keyof typeof terraformFiles]}
                  onChange={(e) => handleFileContentChange(e.target.value)}
                  className="terraform-editor flex-1 bg-gray-50 text-sm text-gray-900 resize-none border-none outline-none"
                  placeholder="Start typing your Terraform configuration..."
                  spellCheck={false}
                />
              </div>
            </div>
            
            {/* Providers Pane - Bottom Section - Takes up flex space */}
            <div className="flex flex-col overflow-auto bg-sidebar" style={{ flex: '2 1 0', minHeight: '200px' }}>
              <ProvidersPane currentProvider={provider} nodes={nodes} />
            </div>
          </aside>
        )}
      </div>

      
      {/* AI Review Dialog */}
      <AIReviewDialog
        isOpen={isAIReviewOpen}
        onClose={() => setIsAIReviewOpen(false)}
        analysis={aiAnalysis}
        isLoading={isAIReviewLoading}
        error={aiReviewError}
      />

      {/* Floating Chat Widget */}
      <div className="fixed bottom-6 right-6 z-50">
        {isChatOpen ? (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 w-[520px] h-[500px] flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">AI Assistant - Rex</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsChatOpen(false)}
                className="h-6 w-6 p-0 hover:bg-gray-100"
              >
                <span className="text-gray-500 text-lg leading-none">×</span>
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AgentChat />
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setIsChatOpen(true)}
            className="w-14 h-14 rounded-full bg-orange-500 hover:bg-orange-600 shadow-lg flex items-center justify-center"
          >
            <Brain className="w-6 h-6 text-white" />
          </Button>
        )}
      </div>
    </div>
  )
}
