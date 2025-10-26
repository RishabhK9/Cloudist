"use client"

import { Trash2, FileCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Block, Connection } from "@/types/infrastructure"
import { useState } from "react"

interface PropertiesPanelProps {
  block: Block | undefined
  blocks?: Block[]
  connections?: Connection[]
  onUpdateBlock: (id: string, updates: Partial<Block>) => void
  onDeleteBlock: (id: string) => void
}

function generateTerraformCode(block: Block): string {
  switch (block.type) {
    case "ec2":
      return `resource "aws_instance" "${block.id}" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "${block.config.instanceType || "t3.micro"}"
  
  tags = {
    Name = "${block.name}"
  }
}`
    case "lambda":
      return `resource "aws_lambda_function" "${block.id}" {
  function_name = "${block.name}"
  runtime       = "${block.config.runtime || "nodejs20.x"}"
  memory_size   = ${block.config.memory || 128}
  
  handler = "index.handler"
  role    = aws_iam_role.lambda_role.arn
}`
    case "rds":
      return `resource "aws_db_instance" "${block.id}" {
  identifier     = "${block.id}"
  engine         = "${block.config.engine || "postgres"}"
  instance_class = "${block.config.size || "db.t3.micro"}"
  
  allocated_storage = 20
  
  tags = {
    Name = "${block.name}"
  }
}`
    case "s3":
      return `resource "aws_s3_bucket" "${block.id}" {
  bucket = "${block.id}"
  
  tags = {
    Name = "${block.name}"
  }
}`
    default:
      return `# Terraform configuration for ${block.name}
# Type: ${block.type}
# Configuration: ${JSON.stringify(block.config, null, 2)}`
  }
}

function generateTerraformProject(blocks: Block[], connections: Connection[]) {
  const mainTf = `terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

${blocks.map((block) => generateTerraformCode(block)).join("\n\n")}
`

  const variablesTf = `variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "development"
}

${blocks
  .map((block) => {
    if (block.type === "ec2") {
      return `variable "${block.id}_instance_type" {
  description = "Instance type for ${block.name}"
  type        = string
  default     = "${block.config.instanceType || "t3.micro"}"
}`
    }
    if (block.type === "lambda") {
      return `variable "${block.id}_memory" {
  description = "Memory for ${block.name}"
  type        = number
  default     = ${block.config.memory || 128}
}`
    }
    return ""
  })
  .filter(Boolean)
  .join("\n\n")}
`

  const outputsTf = `${blocks
    .map((block) => {
      if (block.type === "ec2") {
        return `output "${block.id}_public_ip" {
  description = "Public IP of ${block.name}"
  value       = aws_instance.${block.id}.public_ip
}`
      }
      if (block.type === "lambda") {
        return `output "${block.id}_arn" {
  description = "ARN of ${block.name}"
  value       = aws_lambda_function.${block.id}.arn
}`
      }
      if (block.type === "rds") {
        return `output "${block.id}_endpoint" {
  description = "Endpoint of ${block.name}"
  value       = aws_db_instance.${block.id}.endpoint
}`
      }
      if (block.type === "s3") {
        return `output "${block.id}_bucket_name" {
  description = "Name of ${block.name}"
  value       = aws_s3_bucket.${block.id}.id
}`
      }
      return ""
    })
    .filter(Boolean)
    .join("\n\n")}
`

  const tfvars = `aws_region  = "us-east-1"
environment = "development"

${blocks
  .map((block) => {
    if (block.type === "ec2") {
      return `${block.id}_instance_type = "${block.config.instanceType || "t3.micro"}"`
    }
    if (block.type === "lambda") {
      return `${block.id}_memory = ${block.config.memory || 128}`
    }
    return ""
  })
  .filter(Boolean)
  .join("\n")}
`

  return {
    "main.tf": mainTf,
    "variables.tf": variablesTf,
    "outputs.tf": outputsTf,
    "terraform.tfvars": tfvars,
  }
}

export function PropertiesPanel({
  block,
  blocks = [],
  connections = [],
  onUpdateBlock,
  onDeleteBlock,
}: PropertiesPanelProps) {
  const [selectedFile, setSelectedFile] = useState<string>("main.tf")

  if (!block) {
    const terraformFiles = generateTerraformProject(blocks, connections)

    return (
      <div className="w-80 bg-sidebar border-l border-sidebar-border flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Terraform Project</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {blocks.length} resource{blocks.length !== 1 ? "s" : ""} defined
          </p>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-sidebar-border">
            <Select value={selectedFile} onValueChange={setSelectedFile}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(terraformFiles).map((fileName) => (
                  <SelectItem key={fileName} value={fileName}>
                    {fileName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="flex-1 h-0 [&_[data-slot=scroll-area-scrollbar]]:hidden">
            <div className="p-4">
              <pre className="text-xs bg-muted/50 border border-border rounded-md p-3 overflow-x-auto font-mono">
                <code>{terraformFiles[selectedFile as keyof typeof terraformFiles]}</code>
              </pre>
            </div>
          </ScrollArea>
        </div>
      </div>
    )
  }

  const handleConfigChange = (key: string, value: any) => {
    onUpdateBlock(block.id, {
      config: { ...block.config, [key]: value },
    })
  }

  return (
    <div className="w-80 bg-sidebar border-l border-sidebar-border flex flex-col">
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
            <span className="text-lg">📦</span>
          </div>
          <Input
            value={block.name}
            onChange={(e) => onUpdateBlock(block.id, { name: e.target.value })}
            className="font-medium"
          />
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => onDeleteBlock(block.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <Tabs defaultValue="basic" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="basic" className="flex-1">
            Basic
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex-1">
            Advanced
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 h-0 [&_[data-slot=scroll-area-scrollbar]]:hidden">
          <TabsContent value="basic" className="p-4 space-y-4">
            {block.type === "ec2" && (
              <>
                <div className="space-y-2">
                  <Label>Instance Type</Label>
                  <Select
                    value={block.config.instanceType}
                    onValueChange={(value) => handleConfigChange("instanceType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="t3.micro">t3.micro</SelectItem>
                      <SelectItem value="t3.small">t3.small</SelectItem>
                      <SelectItem value="t3.medium">t3.medium</SelectItem>
                      <SelectItem value="t3.large">t3.large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Select value={block.config.region} onValueChange={(value) => handleConfigChange("region", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                      <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                      <SelectItem value="eu-west-1">EU (Ireland)</SelectItem>
                      <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {block.type === "lambda" && (
              <>
                <div className="space-y-2">
                  <Label>Runtime</Label>
                  <Select value={block.config.runtime} onValueChange={(value) => handleConfigChange("runtime", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nodejs20.x">Node.js 20.x</SelectItem>
                      <SelectItem value="python3.12">Python 3.12</SelectItem>
                      <SelectItem value="java21">Java 21</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Memory (MB)</Label>
                  <Input
                    type="number"
                    value={block.config.memory}
                    onChange={(e) => handleConfigChange("memory", Number.parseInt(e.target.value))}
                  />
                </div>
              </>
            )}

            {block.type === "rds" && (
              <>
                <div className="space-y-2">
                  <Label>Engine</Label>
                  <Select value={block.config.engine} onValueChange={(value) => handleConfigChange("engine", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="postgres">PostgreSQL</SelectItem>
                      <SelectItem value="mysql">MySQL</SelectItem>
                      <SelectItem value="mariadb">MariaDB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Instance Size</Label>
                  <Select value={block.config.size} onValueChange={(value) => handleConfigChange("size", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="db.t3.micro">db.t3.micro</SelectItem>
                      <SelectItem value="db.t3.small">db.t3.small</SelectItem>
                      <SelectItem value="db.t3.medium">db.t3.medium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="pt-4 border-t border-border space-y-2">
              <Label>Terraform Preview</Label>
              <div className="relative">
                <pre className="text-xs bg-muted/50 border border-border rounded-md p-3 overflow-x-auto font-mono">
                  <code>{generateTerraformCode(block)}</code>
                </pre>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Block ID: <span className="font-mono">{block.id}</span>
              </p>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Tags</Label>
              <Input placeholder="Environment: Production" />
            </div>
            <div className="space-y-2">
              <Label>Custom Configuration</Label>
              <textarea
                className="w-full h-32 px-3 py-2 text-sm rounded-md border border-input bg-background"
                placeholder="Enter JSON configuration..."
                defaultValue={JSON.stringify(block.config, null, 2)}
              />
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
