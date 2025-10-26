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
  | "supabase_database"
  | "supabase_auth"
  | "stripe_payment"

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
  sourceHandle?: string | null  // Which handle on the source node (left, right, top, bottom)
  targetHandle?: string | null  // Which handle on the target node (left, right, top, bottom)
}

export interface BlockTemplate {
  type: BlockType
  name: string
  icon: string
  category: "compute" | "storage" | "networking" | "security" | "ai-agents" | "supabase" | "stripe"
  defaultConfig: Record<string, any>
}
