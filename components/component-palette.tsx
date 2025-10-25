"use client"

import type React from "react"

import { useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  Server,
  Zap,
  Database,
  HardDrive,
  Network,
  Scale,
  Globe,
  Shield,
  Key,
  Lock,
  Container,
  Layers,
  Cloud,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Block, BlockTemplate } from "@/types/infrastructure"

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
}

const blockTemplates: BlockTemplate[] = [
  // Compute
  {
    type: "ec2",
    name: "EC2 Instance",
    icon: awsIconMap.ec2,
    category: "compute",
    defaultConfig: { instanceType: "t3.micro", region: "us-east-1" },
  },
  {
    type: "lambda",
    name: "Lambda Function",
    icon: awsIconMap.lambda,
    category: "compute",
    defaultConfig: { runtime: "nodejs20.x", memory: 128 },
  },
  {
    type: "kubernetes",
    name: "Kubernetes Cluster",
    icon: awsIconMap.kubernetes,
    category: "compute",
    defaultConfig: { nodes: 3, version: "1.28" },
  },
  {
    type: "container",
    name: "Container",
    icon: awsIconMap.container,
    category: "compute",
    defaultConfig: { image: "nginx:latest" },
  },

  // Storage
  {
    type: "s3",
    name: "S3 Bucket",
    icon: awsIconMap.s3,
    category: "storage",
    defaultConfig: { versioning: true, encryption: true },
  },
  {
    type: "rds",
    name: "RDS Database",
    icon: awsIconMap.rds,
    category: "storage",
    defaultConfig: { engine: "postgres", size: "db.t3.micro" },
  },
  {
    type: "redis",
    name: "Redis Cache",
    icon: awsIconMap.redis,
    category: "storage",
    defaultConfig: { nodeType: "cache.t3.micro" },
  },
  {
    type: "ebs",
    name: "EBS Volume",
    icon: awsIconMap.ebs,
    category: "storage",
    defaultConfig: { size: 100, type: "gp3" },
  },

  // Networking
  { type: "vpc", name: "VPC", icon: awsIconMap.vpc, category: "networking", defaultConfig: { cidr: "10.0.0.0/16" } },
  {
    type: "loadbalancer",
    name: "Load Balancer",
    icon: awsIconMap.loadbalancer,
    category: "networking",
    defaultConfig: { type: "application" },
  },
  { type: "apigateway", name: "API Gateway", icon: awsIconMap.apigateway, category: "networking", defaultConfig: { type: "REST" } },
  {
    type: "cloudfront",
    name: "CloudFront CDN",
    icon: awsIconMap.cloudfront,
    category: "networking",
    defaultConfig: { priceClass: "PriceClass_100" },
  },

  // Security
  {
    type: "securitygroup",
    name: "Security Group",
    icon: awsIconMap.securitygroup,
    category: "security",
    defaultConfig: { inbound: [], outbound: [] },
  },
  { type: "iam", name: "IAM Role", icon: awsIconMap.iam, category: "security", defaultConfig: { policies: [] } },
  { type: "secrets", name: "Secrets Manager", icon: awsIconMap.secrets, category: "security", defaultConfig: { rotation: true } },
  { type: "waf", name: "WAF Rule", icon: awsIconMap.waf, category: "security", defaultConfig: { rules: [] } },
]

const iconMap: Record<string, any> = {
  Server,
  Zap,
  Database,
  HardDrive,
  Network,
  Scale,
  Globe,
  Shield,
  Key,
  Lock,
  Container,
  Layers,
  Cloud,
}

interface ComponentPaletteProps {
  onAddBlock: (block: Block) => void
}

export function ComponentPalette({ onAddBlock }: ComponentPaletteProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    "compute",
    "storage",
    "networking",
    "security",
  ])

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    )
  }

  const handleDragStart = (e: React.DragEvent, template: BlockTemplate) => {
    e.dataTransfer.setData("blockTemplate", JSON.stringify(template))
  }

  const categories = [
    { id: "compute", name: "COMPUTE", icon: Server },
    { id: "storage", name: "STORAGE", icon: Database },
    { id: "networking", name: "NETWORKING", icon: Network },
    { id: "security", name: "SECURITY", icon: Shield },
  ]

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-sm font-semibold text-sidebar-foreground">Components</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {categories.map((category) => {
            const CategoryIcon = category.icon
            const isExpanded = expandedCategories.includes(category.id)
            const categoryBlocks = blockTemplates.filter((b) => b.category === category.id)

            return (
              <div key={category.id} className="mb-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-xs font-semibold text-muted-foreground hover:text-foreground"
                  onClick={() => toggleCategory(category.id)}
                >
                  {isExpanded ? <ChevronDown className="w-3 h-3 mr-2" /> : <ChevronRight className="w-3 h-3 mr-2" />}
                  <CategoryIcon className="w-3 h-3 mr-2" />
                  {category.name}
                </Button>

                {isExpanded && (
                  <div className="ml-2 mt-1 space-y-1">
                    {categoryBlocks.map((template) => {
                      // Check if icon is an image path (starts with /)
                      const isImageIcon = template.icon.startsWith('/')

                      return (
                        <div
                          key={template.type}
                          draggable
                          onDragStart={(e) => handleDragStart(e, template)}
                          className="flex items-center gap-2 p-2 rounded-md bg-card hover:bg-accent cursor-move transition-colors group"
                        >
                          {isImageIcon ? (
                            <img 
                              src={template.icon} 
                              alt={template.name}
                              className="w-4 h-4 object-contain"
                            />
                          ) : (
                            (() => {
                              const Icon = iconMap[template.icon]
                              return <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                            })()
                          )}
                          <span className="text-xs text-card-foreground flex-1">{template.name}</span>
                          <div className="w-1 h-4 bg-muted-foreground/20 rounded group-hover:bg-primary/50" />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
