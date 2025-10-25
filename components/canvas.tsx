"use client"

import React, { useCallback, useRef, useState, useEffect } from "react"
import { Plus, Minus, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CloudServiceNode } from "@/components/cloud-service-node"
import type { Block, Connection, BlockTemplate } from "@/types/infrastructure"
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  ConnectionMode,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection as FlowConnection,
  type OnConnect,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

// Map block types to AWS icon paths
const awsIconMap: Record<string, string> = {
  ec2: "/aws/Arch_Amazon-EC2_64.svg",
  lambda: "/aws/Arch_AWS-Lambda_64.svg",
  kubernetes: "/aws/Arch_Amazon-EKS-Cloud_64.svg",
  container: "/aws/Arch_Amazon-ECS-Anywhere_64.svg",
  s3: "/aws/Arch_Amazon-S3-on-Outposts_64.svg",
  rds: "/aws/Arch_Amazon-RDS_64.svg",
  redis: "/aws/Arch_Amazon-ElastiCache_64.svg",
  ebs: "/aws/Arch_Amazon-EC2_64.svg",
  vpc: "/aws/vpc.svg",
  loadbalancer: "/aws/Arch_Amazon-EC2-Auto-Scaling_64.svg",
  apigateway: "/aws/Arch_Amazon-API-Gateway_64.svg",
  cloudfront: "/aws/Arch_Amazon-CloudWatch_64.svg",
  securitygroup: "/aws/vpc.svg",
  iam: "/aws/Arch_AWS-IAM-Identity-Center_64.svg",
  secrets: "/aws/Arch_AWS-Secrets-Manager_64.svg",
  waf: "/aws/Arch_AWS-IAM-Identity-Center_64.svg",
  costmonitor: "/aws/Arch_Amazon-CloudWatch_64.svg",
  securityscanner: "/aws/Arch_AWS-IAM-Identity-Center_64.svg",
  autoscaler: "/aws/Arch_Amazon-EC2-Auto-Scaling_64.svg",
  backupmanager: "/aws/Arch_Amazon-S3-on-Outposts_64.svg",
}

// Create node types for React Flow
const createNodeTypes = (onNodeDoubleClick?: (nodeData: any) => void) => ({
  cloudService: (props: any) => <CloudServiceNode {...props} onDoubleClick={onNodeDoubleClick} />,
})

const defaultEdgeOptions = {
  style: { strokeWidth: 3, stroke: 'hsl(var(--primary))' },
  type: 'smoothstep',
  animated: false,
}

interface CanvasProps {
  blocks: Block[]
  connections: Connection[]
  selectedBlockId: string | null
  zoom: number
  onSelectBlock: (id: string | null) => void
  onUpdateBlock: (id: string, updates: Partial<Block>) => void
  onAddBlock: (block: Block) => void
  onAddConnection: (connection: Connection) => void
  onDeleteConnection: (id: string) => void
  onZoomChange: (zoom: number) => void
}

export function Canvas({
  blocks,
  connections,
  selectedBlockId,
  zoom,
  onSelectBlock,
  onUpdateBlock,
  onAddBlock,
  onAddConnection,
  onDeleteConnection,
  onZoomChange,
}: CanvasProps) {
  // Convert blocks to React Flow nodes
  const initialNodes: Node[] = blocks.map((block) => ({
    id: block.id,
    type: 'cloudService',
    position: { x: block.x, y: block.y },
    data: {
      id: block.type,
      name: block.name,
      provider: 'aws',
      icon: awsIconMap[block.type] || '☁️',
      config: block.config,
    },
  }))

  // Convert connections to React Flow edges
  const initialEdges: Edge[] = connections.map((conn) => ({
    id: conn.id,
    source: conn.from,
    target: conn.to,
    ...defaultEdgeOptions,
  }))

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const canvasRef = useRef<HTMLDivElement>(null)

  // Sync blocks and connections with React Flow nodes/edges only when they change externally
  useEffect(() => {
    const newNodes: Node[] = blocks.map((block) => ({
      id: block.id,
      type: 'cloudService',
      position: { x: block.x, y: block.y },
      data: {
        id: block.type,
        name: block.name,
        provider: 'aws',
        icon: awsIconMap[block.type] || '☁️',
        config: block.config,
      },
    }))
    
    setNodes(newNodes)
  }, [blocks, setNodes])

  useEffect(() => {
    const newEdges: Edge[] = connections.map((conn) => ({
      id: conn.id,
      source: conn.from,
      target: conn.to,
      ...defaultEdgeOptions,
    }))
    
    setEdges(newEdges)
  }, [connections, setEdges])

  // Handle node position changes
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes)
    
    // Update block positions when nodes are dragged (only on drag end)
    changes.forEach((change: any) => {
      if (change.type === 'position' && change.position && change.dragging === false) {
        onUpdateBlock(change.id, { x: change.position.x, y: change.position.y })
      }
    })
  }, [onNodesChange, onUpdateBlock])

  // Handle new connections
  const onConnect: OnConnect = useCallback((connection: FlowConnection) => {
    if (connection.source && connection.target) {
      const newConnection: Connection = {
        id: `conn-${Date.now()}`,
        from: connection.source,
        to: connection.target,
      }
      onAddConnection(newConnection)
    }
  }, [onAddConnection])

  // Handle drop events for adding new blocks
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const templateData = e.dataTransfer.getData("blockTemplate")

    if (templateData) {
      const template: BlockTemplate = JSON.parse(templateData)
      const rect = canvasRef.current?.getBoundingClientRect()
      if (rect) {
        const x = (e.clientX - rect.left)
        const y = (e.clientY - rect.top)

        const newBlock: Block = {
          id: `${template.type}-${Date.now()}`,
          type: template.type,
          name: template.name,
          x,
          y,
          config: template.defaultConfig,
        }

        console.log("[Canvas] Adding new block:", newBlock)
        onAddBlock(newBlock)
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // Handle edge deletion
  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation()
    if (confirm("Delete this connection?")) {
      onDeleteConnection(edge.id)
    }
  }, [onDeleteConnection])

  const handleZoomIn = () => {
    onZoomChange(Math.min(zoom + 0.1, 2))
  }

  const handleZoomOut = () => {
    onZoomChange(Math.max(zoom - 0.1, 0.5))
  }

  const handleZoomReset = () => {
    onZoomChange(1)
  }

  const nodeTypes = createNodeTypes()

  return (
    <div 
      ref={canvasRef}
      className="relative flex-1 overflow-hidden"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={handleEdgeClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        className="canvas-grid w-full h-full"
        onPaneClick={() => onSelectBlock(null)}
        minZoom={0.5}
        maxZoom={2}
        connectionMode={ConnectionMode.Loose}
        connectOnClick={false}
        elementsSelectable={true}
        nodesConnectable={true}
        nodesDraggable={true}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
      </ReactFlow>

      {/* Custom Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex gap-2 bg-card border border-border rounded-lg p-1 shadow-lg z-10">
        <Button size="icon" variant="ghost" onClick={handleZoomOut} className="hover:bg-accent">
          <Minus className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={handleZoomReset} className="hover:bg-accent">
          <Maximize2 className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={handleZoomIn} className="hover:bg-accent">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Mini Map */}
      <div className="absolute bottom-4 left-4 w-48 h-32 bg-card/80 border border-border rounded-lg backdrop-blur-sm shadow-lg z-10">
        <div className="w-full h-full relative overflow-hidden p-2">
          {blocks.map((block) => (
            <div
              key={block.id}
              className="absolute w-2 h-2 bg-primary rounded-sm"
              style={{
                left: `${(block.x / 2000) * 100}%`,
                top: `${(block.y / 2000) * 100}%`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
