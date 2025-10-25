export type BlockType =
  | "ec2"
  | "lambda"
  | "kubernetes"
  | "container"
  | "s3"
  | "rds"
  | "redis"
  | "ebs"
  | "vpc"
  | "loadbalancer"
  | "apigateway"
  | "cloudfront"
  | "securitygroup"
  | "iam"
  | "secrets"
  | "waf"
  | "costmonitor"
  | "securityscanner"
  | "autoscaler"
  | "backupmanager"

export interface Block {
  id: string
  type: BlockType
  name: string
  x: number
  y: number
  config: Record<string, any>
}

export interface Connection {
  id: string
  from: string
  to: string
}

export interface BlockTemplate {
  type: BlockType
  name: string
  icon: string
  category: "compute" | "storage" | "networking" | "security" | "ai-agents"
  defaultConfig: Record<string, any>
}
