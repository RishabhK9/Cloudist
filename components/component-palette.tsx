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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { Block, BlockTemplate } from "@/types/infrastructure"

// Map block types to AWS icon paths
const awsIconMap: Record<string, string> = {
  // Compute
  ec2: "/aws/Arch_Amazon-EC2_64.svg",
  lambda: "/aws/Arch_AWS-Lambda_64.svg",
  fargate: "/aws/Arch_AWS-Fargate_64.svg",
  kubernetes: "/aws/Arcg_AWS_Elastic_Kubernetes_Service.svg",
  container: "/aws/Arch_Amazon-ECS-Anywhere_64.svg",
  
  // Storage
  s3: "/aws/Arch_Amazon-S3-on-Outposts_64.svg",
  ebs: "/aws/Arch_Amazon-Elastic-Block-Store_64.svg",
  
  // Database
  rds: "/aws/Arch_Amazon-RDS_64.svg",
  dynamodb: "/aws/Arch_Amazon-DynamoDB_64.svg",
  redis: "/aws/Arch_Amazon-ElastiCache_64.svg",
  
  // Networking
  vpc: "/aws/vpc.svg",
  subnet: "🔗",
  internet_gateway: "🌍",
  api_gateway: "/aws/Arch_Amazon-API-Gateway_64.svg",
  apigateway: "/aws/Arch_Amazon-API-Gateway_64.svg",
  loadbalancer: "/aws/Arch_Amazon-EC2-Auto-Scaling_64.svg",
  cloudfront: "/aws/Arch_Amazon-CloudWatch_64.svg",
  
  // Security
  security_group: "/aws/ec2.svg",
  securitygroup: "/aws/ec2.svg",
  cognito: "/aws/Arch_Amazon-Cognito_64.svg",
  secrets_manager: "/aws/Arch_AWS-Secrets-Manager_64.svg",
  secrets: "/aws/Arch_AWS-Secrets-Manager_64.svg",
  iam: "/aws/Arch_AWS-IAM-Identity-Center_64.svg",
  waf: "/aws/Arch_AWS-IAM-Identity-Center_64.svg",
  
  // Integration & Orchestration
  sqs: "/aws/Arch_Amazon-Simple-Queue-Service_64.svg",
  step_functions: "/aws/Arch_AWS-Step-Functions_64.svg",
  
  // Monitoring
  cloudwatch: "/aws/Arch_Amazon-CloudWatch_64.svg",
  costmonitor: "/aws/Arch_Amazon-CloudWatch_64.svg",
  
  // Other
  securityscanner: "/aws/Arch_AWS-IAM-Identity-Center_64.svg",
  autoscaler: "/aws/Arch_Amazon-EC2-Auto-Scaling_64.svg",
  backupmanager: "/aws/Arch_Amazon-S3-on-Outposts_64.svg",
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
    name: "EKS Cluster",
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
  {
    type: "fargate",
    name: "Fargate",
    icon: awsIconMap.fargate,
    category: "compute",
    defaultConfig: { cpu: 256, memory: 512 },
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
    type: "dynamodb",
    name: "DynamoDB",
    icon: awsIconMap.dynamodb,
    category: "storage",
    defaultConfig: { billingMode: "PAY_PER_REQUEST" },
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
  { type: "iam", name: "IAM Role", icon: awsIconMap.iam, category: "security", defaultConfig: { policies: [] } },
  { type: "secrets", name: "Secrets Manager", icon: awsIconMap.secrets, category: "security", defaultConfig: { rotation: true } },
  { type: "waf", name: "WAF Rule", icon: awsIconMap.waf, category: "security", defaultConfig: { rules: [] } },
  {
    type: "cognito",
    name: "Cognito",
    icon: awsIconMap.cognito,
    category: "security",
    defaultConfig: { mfa: false },
  },
  {
    type: "sqs",
    name: "SQS Queue",
    icon: awsIconMap.sqs,
    category: "networking",
    defaultConfig: { delaySeconds: 0 },
  },
  {
    type: "cloudwatch",
    name: "CloudWatch",
    icon: awsIconMap.cloudwatch,
    category: "networking",
    defaultConfig: { retentionDays: 7 },
  },
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
  const handleDragStart = (e: React.DragEvent, template: BlockTemplate) => {
    e.dataTransfer.setData("blockTemplate", JSON.stringify(template))
  }

  const categories = [
    { id: "compute", name: "Compute", icon: Server },
    { id: "storage", name: "Storage & Database", icon: Database },
    { id: "networking", name: "Networking", icon: Network },
    { id: "security", name: "Security & Identity", icon: Shield },
  ]

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-sm font-semibold text-sidebar-foreground">Components</h2>
      </div>

      <ScrollArea className="flex-1 h-0 [&_[data-slot=scroll-area-scrollbar]]:hidden">
        <div className="p-2">
          <Accordion type="multiple" defaultValue={["aws"]} className="w-full">
            {/* AWS Provider */}
            <AccordionItem value="aws" className="border-b-0">
              <AccordionTrigger className="py-2 px-2 hover:bg-accent rounded-md text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <img src="/aws/logo.png" alt="AWS" className="w-5 h-5 object-contain" />
                  <span>AWS</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-2">
                <Accordion type="multiple" defaultValue={[]} className="w-full ml-2">
                  {categories.map((category) => {
                    const CategoryIcon = category.icon
                    const categoryBlocks = blockTemplates.filter((b) => b.category === category.id)

                    return (
                      <AccordionItem key={category.id} value={category.id} className="border-b-0">
                        <AccordionTrigger className="py-2 px-2 hover:bg-accent rounded-md text-xs font-medium">
                          <div className="flex items-center gap-2">
                            <CategoryIcon className="w-3 h-3" />
                            <span>{category.name}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-2">
                          <div className="ml-2 space-y-1">
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
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              </AccordionContent>
            </AccordionItem>

            {/* Future providers can be added here */}
            {/* 
            <AccordionItem value="gcp" className="border-b-0">
              <AccordionTrigger className="py-2 px-2 hover:bg-accent rounded-md text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <Cloud className="w-5 h-5" />
                  <span>GCP (Coming Soon)</span>
                </div>
              </AccordionTrigger>
            </AccordionItem>

            <AccordionItem value="azure" className="border-b-0">
              <AccordionTrigger className="py-2 px-2 hover:bg-accent rounded-md text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <Cloud className="w-5 h-5" />
                  <span>Azure (Coming Soon)</span>
                </div>
              </AccordionTrigger>
            </AccordionItem>
            */}
          </Accordion>
        </div>
      </ScrollArea>
    </div>
  )
}
