export type BlockType =
  | "ec2"
  | "lambda"
  | "fargate"
  | "kubernetes"
  | "container"
  | "s3"
  | "rds"
  | "dynamodb"
  | "redis"
  | "ebs"
  | "vpc"
  | "subnet"
  | "internet_gateway"
  | "security_group"
  | "loadbalancer"
  | "apigateway"
  | "api_gateway"
  | "cloudfront"
  | "securitygroup"
  | "iam"
  | "secrets"
  | "secrets_manager"
  | "cognito"
  | "waf"
  | "sqs"
  | "step_functions"
  | "cloudwatch"
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
