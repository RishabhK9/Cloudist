import type { Edge, Node } from "@xyflow/react"

export interface TerraformResource {
  type: string
  name: string
  config: Record<string, any>
  dependencies?: string[]
}

export interface TerraformOutput {
  provider: string
  resources: TerraformResource[]
  variables: Record<string, any>
  outputs: Record<string, any>
}

export class TerraformGenerator {
  private provider: string
  private nodes: Node[]
  private edges: Edge[]

  constructor(provider: string, nodes: Node[], edges: Edge[]) {
    this.provider = provider
    this.nodes = nodes
    this.edges = edges
  }

  generate(): TerraformOutput {
    const resources = this.generateResources()
    const variables = this.generateVariables()
    const outputs = this.generateOutputs()

    return {
      provider: this.provider,
      resources,
      variables,
      outputs,
    }
  }

  private generateResources(): TerraformResource[] {
    const resources: TerraformResource[] = []
    
    this.nodes.forEach((node) => {
      const dependencies = this.getDependencies(node.id)
      const config = this.generateResourceConfig(node)

      // Add the main resource
      resources.push({
        type: node.data.terraformType as string,
        name: this.sanitizeName((node.data.name as string) || (node.data.id as string)),
        config,
        dependencies,
      })

      // Add additional resources for specific services
      if (node.data.id === 's3') {
        const resourceName = this.sanitizeName((node.data.name as string) || (node.data.id as string))
        const terraformType = node.data.terraformType as string
        const bucketReference = `${terraformType}.${resourceName}`

        // Add public access block for S3 buckets
        resources.push({
          type: 'aws_s3_bucket_public_access_block',
          name: resourceName,
          config: {
            bucket: `${bucketReference}.id`,
            block_public_acls: true,
            block_public_policy: true,
            ignore_public_acls: true,
            restrict_public_buckets: true,
          },
          dependencies: [bucketReference],
        })

        // Add versioning resource for S3 buckets
        const versioningEnabled = (node.data.config as any)?.versioning === "Enabled"
        if (versioningEnabled !== undefined) {
          resources.push({
            type: 'aws_s3_bucket_versioning',
            name: `${resourceName}_versioning`,
            config: {
              bucket: `${bucketReference}.id`,
              versioning_configuration: {
                status: versioningEnabled ? "Enabled" : "Disabled",
              },
            },
            dependencies: [bucketReference],
          })
        }
      }

      if (node.data.id === 'lambda') {
        // Add IAM role for Lambda function
        const resourceName = this.sanitizeName((node.data.name as string) || (node.data.id as string))
        resources.push({
          type: 'aws_iam_role',
          name: `${resourceName}_role`,
          config: {
            name: `${resourceName}-execution-role`,
            assume_role_policy: `jsonencode({
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
})`,
            tags: {
              Name: `${node.data.name as string}-role`,
              Environment: "terraform-generated",
            },
          },
          dependencies: [],
        })

        // Add basic execution policy to IAM role
        resources.push({
          type: 'aws_iam_role_policy_attachment',
          name: `${resourceName}_basic_execution`,
          config: {
            role: `aws_iam_role.${resourceName}_role.name`,
            policy_arn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
          },
          dependencies: [`aws_iam_role.${resourceName}_role`],
        })

        // Create default Lambda function ZIP file if using inline code
        const config = node.data.config as any
        const useInlineCode = !config?.s3_bucket && !config?.s3_key
        if (useInlineCode) {
          // Create a simple archive resource for the Lambda function
          resources.push({
            type: 'archive_file',
            name: `${resourceName}_lambda_zip`,
            config: {
              type: "zip",
              output_path: `lambda-${resourceName}.zip`,
              source: {
                content: `exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
    },
    body: JSON.stringify({
      message: 'Hello from Lambda!',
      timestamp: new Date().toISOString(),
      requestId: event.requestContext?.requestId || 'local',
      input: event
    })
  };
};`,
                filename: "index.js"
              }
            },
            dependencies: [],
          })

          // Ensure the Lambda function depends on the archive
          const lambdaResource = resources.find(r => r.type === 'aws_lambda_function' && r.name === resourceName)
          if (lambdaResource) {
            lambdaResource.dependencies = lambdaResource.dependencies || []
            lambdaResource.dependencies.push(`archive_file.${resourceName}_lambda_zip`)
          }
        }
      }

      if (node.data.id === 'sqs') {
        const config = node.data.config as any
        const resourceName = this.sanitizeName((node.data.name as string) || (node.data.id as string))
        
        // Add Dead Letter Queue if enabled
        if (config.dead_letter_queue && config.max_receive_count) {
          const dlqName = `${resourceName}-dlq`
          
          // Create the DLQ first
          resources.push({
            type: 'aws_sqs_queue',
            name: `${resourceName}_dlq`,
            config: {
              name: dlqName,
              visibility_timeout_seconds: 30,
              message_retention_seconds: 1209600,
              delay_seconds: 0,
              tags: {
                Name: `${node.data.name as string}-dlq`,
                Environment: "terraform-generated",
                Type: "DeadLetterQueue"
              },
            },
            dependencies: [],
          })

          // Update the main queue to reference the DLQ
          const mainQueueResource = resources.find(r => r.type === 'aws_sqs_queue' && r.name === resourceName)
          if (mainQueueResource) {
            mainQueueResource.config.redrive_policy = `jsonencode({
  "deadLetterTargetArn": aws_sqs_queue.${resourceName}_dlq.arn,
  "maxReceiveCount": ${config.max_receive_count}
})`
            mainQueueResource.dependencies = mainQueueResource.dependencies || []
            mainQueueResource.dependencies.push(`aws_sqs_queue.${resourceName}_dlq`)
          }
        }
      }
    })
    
    return resources
  }

  private generateResourceConfig(node: Node): Record<string, any> {
    const baseConfig = { ...(node.data.config as Record<string, any>) }
    const serviceId = node.data.id as string

    // Apply provider-specific configurations
    switch (this.provider) {
      case "aws":
        return this.generateAWSConfig(serviceId, baseConfig, node)
      case "gcp":
        return this.generateGCPConfig(serviceId, baseConfig, node)
      case "azure":
        return this.generateAzureConfig(serviceId, baseConfig, node)
      case "supabase":
        return this.generateSupabaseConfig(serviceId, baseConfig, node)
      default:
        return baseConfig
    }
  }

  private generateSupabaseConfig(serviceId: string, config: Record<string, any>, node: Node): Record<string, any> {
    switch (serviceId) {
      case "database":
        return {
          name: config.project_name || `${this.sanitizeName(node.data.name as string)}-project-${Date.now()}`,
          organization_id: config.organization_id || "var.supabase_organization_id",
          db_pass: config.db_password || "var.supabase_db_password",
          region: config.region || "us-east-1",
          plan: config.plan || "free",
          tags: {
            Name: config.project_name || node.data.name,
            Environment: "terraform-generated",
          },
        }

      default:
        return config
    }
  }

  private generateAWSConfig(serviceId: string, config: Record<string, any>, node: Node): Record<string, any> {
    const resourceConfig: Record<string, any> = { ...config }

    switch (serviceId) {
      case "ec2":
        return {
          ami: config.ami || "ami-0abcdef1234567890",
          instance_type: config.instance_type || "t3.micro",
          key_name: config.key_name || null,
          tags: {
            Name: config.name || `${node.data.name}-instance-${Date.now()}`,
            Environment: "terraform-generated",
          },
        }

      case "api_gateway":
        return {
          name: config.name || `api-${Date.now()}`,
          description: config.description || "REST API",
          endpoint_configuration: config.endpoint_configuration ? {
            types: [config.endpoint_configuration],
          } : {
            types: ["REGIONAL"],
          },
        }

      case "dynamodb":
        return {
          name: config.table_name || `${this.sanitizeName(node.data.name as string)}-table-${Date.now()}`,
          billing_mode: config.billing_mode || "PAY_PER_REQUEST",
          hash_key: config.hash_key || "id",
          ...(config.range_key && { range_key: config.range_key }),
          ...(config.billing_mode === "PROVISIONED" && {
            read_capacity: Number.parseInt(config.read_capacity) || 5,
            write_capacity: Number.parseInt(config.write_capacity) || 5,
          }),
          ...(config.point_in_time_recovery && {
            point_in_time_recovery: {
              enabled: config.point_in_time_recovery,
            },
          }),
          ...(config.stream_enabled && {
            stream_enabled: config.stream_enabled,
            stream_view_type: "NEW_AND_OLD_IMAGES",
          }),
          tags: {
            Name: config.name || node.data.name,
            Environment: "terraform-generated",
          },
        }

      case "s3":
        return {
          bucket: config.bucket_name || `${this.sanitizeName(node.data.name as string)}-bucket-${Date.now()}`,
          tags: {
            Name: config.name || node.data.name,
            Environment: "terraform-generated",
          },
        }

      case "rds":
        return {
          identifier: config.db_name || `${this.sanitizeName(node.data.name as string)}-db-${Date.now()}`,
          engine: config.engine || "mysql",
          engine_version: this.getEngineVersion(config.engine || "mysql"),
          instance_class: config.instance_class || "db.t3.micro",
          allocated_storage: Number.parseInt(config.allocated_storage) || 20,
          db_name: config.db_name || `mydb_${Date.now()}`,
          username: "admin",
          password: config.password || "password123",
          skip_final_snapshot: true,
          tags: {
            Name: config.name || node.data.name,
            Environment: "terraform-generated",
          },
        }

      case "lambda":
        const resourceName = this.sanitizeName((node.data.name as string) || (node.data.id as string))
        const useInlineCode = !config.s3_bucket && !config.s3_key

        return {
          function_name: config.function_name || `${resourceName}-function-${Date.now()}`,
          runtime: config.runtime || "nodejs18.x",
          handler: "index.handler",
          ...(useInlineCode ? {
            filename: `lambda-${resourceName}.zip`,
          } : {
            s3_bucket: config.s3_bucket || `var.lambda_s3_bucket`,
            s3_key: config.s3_key || `var.lambda_s3_key`,
          }),
          memory_size: Number.parseInt(config.memory_size) || 128,
          timeout: Number.parseInt(config.timeout) || 30,
          role: `aws_iam_role.${resourceName}_role.arn`,
          tags: {
            Name: config.name || node.data.name,
            Environment: "terraform-generated",
          },
        }

      case "vpc":
        return {
          cidr_block: config.cidr_block || "10.0.0.0/16",
          enable_dns_hostnames: config.enable_dns_hostnames !== false,
          enable_dns_support: config.enable_dns_support !== false,
          tags: {
            Name: config.name || `${node.data.name}-vpc`,
            Environment: "terraform-generated",
          },
        }

      case "alb":
        return {
          name: config.name || `${this.sanitizeName(node.data.name as string)}-alb-${Date.now()}`,
          load_balancer_type: config.load_balancer_type || "application",
          scheme: config.scheme || "internet-facing",
          subnets: [this.getSubnetReference(node.id)],
          security_groups: this.getSecurityGroupReferences(node.id),
          tags: {
            Name: config.name || node.data.name,
            Environment: "terraform-generated",
          },
        }

      case "sqs":
        const sqsConfig: Record<string, any> = {
          name: config.name || `${this.sanitizeName(node.data.name as string)}-queue-${Date.now()}`,
          visibility_timeout_seconds: config.visibility_timeout_seconds || 30,
          message_retention_seconds: config.message_retention_seconds || 1209600,
          delay_seconds: config.delay_seconds || 0,
          tags: {
            Name: config.name || node.data.name,
            Environment: "terraform-generated",
          },
        }

        // Add FIFO queue configuration if enabled
        if (config.fifo_queue) {
          sqsConfig.name = `${sqsConfig.name}.fifo`
          sqsConfig.fifo_queue = true
          if (config.content_based_deduplication) {
            sqsConfig.content_based_deduplication = true
          }
        }

        // Add KMS encryption if configured
        if (config.kms_master_key_id) {
          sqsConfig.kms_master_key_id = config.kms_master_key_id
          if (config.kms_data_key_reuse_period_seconds) {
            sqsConfig.kms_data_key_reuse_period_seconds = config.kms_data_key_reuse_period_seconds
          }
        }

        return sqsConfig

      default:
        return resourceConfig
    }
  }

  private generateGCPConfig(serviceId: string, config: Record<string, any>, node: Node): Record<string, any> {
    switch (serviceId) {
      case "compute":
        return {
          name: config.name || `${this.sanitizeName(node.data.name as string)}-instance-${Date.now()}`,
          machine_type: config.machine_type || "e2-micro",
          zone: config.zone || "us-central1-a",
          boot_disk: {
            initialize_params: {
              image: config.image || "debian-cloud/debian-11",
            },
          },
          network_interface: {
            network: "default",
            access_config: {},
          },
          labels: {
            environment: "terraform-generated",
          },
        }

      case "storage":
        return {
          name: config.name || `${this.sanitizeName(node.data.name as string)}-bucket-${Date.now()}`,
          location: config.location || "US",
          storage_class: config.storage_class || "STANDARD",
          labels: {
            environment: "terraform-generated",
          },
        }

      case "sql":
        return {
          name: config.name || `${this.sanitizeName(node.data.name as string)}-db-${Date.now()}`,
          database_version: config.database_version || "MYSQL_8_0",
          tier: config.tier || "db-f1-micro",
          settings: {
            disk_size: 10,
            disk_type: "PD_SSD",
          },
        }

      default:
        return config
    }
  }

  private generateAzureConfig(serviceId: string, config: Record<string, any>, node: Node): Record<string, any> {
    switch (serviceId) {
      case "vm":
        return {
          name: config.name || `${this.sanitizeName(node.data.name as string)}-vm-${Date.now()}`,
          resource_group_name: "azurerm_resource_group.main.name",
          location: config.location || "East US",
          size: config.vm_size || "Standard_B1s",
          admin_username: "adminuser",
          disable_password_authentication: true,
          network_interface_ids: ["azurerm_network_interface.main.id"],
          os_disk: {
            caching: "ReadWrite",
            storage_account_type: config.os_disk_type || "Standard_LRS",
          },
          source_image_reference: {
            publisher: "Canonical",
            offer: "0001-com-ubuntu-server-focal",
            sku: "20_04-lts-gen2",
            version: "latest",
          },
          tags: {
            environment: "terraform-generated",
          },
        }

      case "blob":
        return {
          name: config.name || `${this.sanitizeName(node.data.name as string)}storage-${Date.now()}`,
          resource_group_name: "azurerm_resource_group.main.name",
          location: config.location || "East US",
          account_tier: config.account_tier || "Standard",
          account_replication_type: config.replication_type || "LRS",
          tags: {
            environment: "terraform-generated",
          },
        }

      default:
        return config
    }
  }

  private getDependencies(nodeId: string): string[] {
    const dependencies: string[] = []

    this.edges.forEach((edge) => {
      if (edge.target === nodeId) {
        const sourceNode = this.nodes.find((n) => n.id === edge.source)
        if (sourceNode) {
          dependencies.push(
            `${sourceNode.data.terraformType as string}.${this.sanitizeName((sourceNode.data.name as string) || (sourceNode.data.id as string))}`,
          )
        }
      }
    })

    return dependencies
  }

  private generateVariables(): Record<string, any> {
    const variables: Record<string, any> = {}

    // Add common variables
    variables.environment = {
      description: "Environment name",
      type: "string",
      default: "dev",
    }

    variables.region = {
      description: "Cloud provider region",
      type: "string",
      default: this.getDefaultRegion(),
    }

    // Add Supabase-specific variables if there are Supabase nodes
    const hasSupabase = this.nodes.some(node => node.data.provider === 'supabase')
    if (this.provider === "supabase" && hasSupabase) {
      variables.supabase_organization_id = {
        description: "Supabase organization ID",
        type: "string",
        default: "var.supabase_organization_id",
      }
      variables.supabase_db_password = {
        description: "Supabase database password",
        type: "string",
        default: "TheCloudist$Project",
        sensitive: true,
      }
    }

    // Add Lambda S3 variables if there are Lambda nodes
    const hasLambda = this.nodes.some(node => node.data.id === 'lambda')
    if (this.provider === "aws" && hasLambda) {
      variables.lambda_s3_bucket = {
        description: "S3 bucket containing the Lambda function code",
        type: "string",
        default: "my-lambda-bucket",
      }
      variables.lambda_s3_key = {
        description: "S3 key (path) to the Lambda function ZIP file",
        type: "string",
        default: "lambda-function.zip",
      }
    }

    return variables
  }

  private generateOutputs(): Record<string, any> {
    const outputs: Record<string, any> = {}

    this.nodes.forEach((node) => {
      const resourceName = this.sanitizeName((node.data.name as string) || (node.data.id as string))
      const resourceType = node.data.terraformType as string

      switch (node.data.id) {
        case "ec2":
        case "compute":
        case "vm":
          outputs[`${resourceName}_public_ip`] = {
            description: `Public IP of ${node.data.name as string}`,
            value: `${resourceType}.${resourceName}.public_ip`,
          }
          break

        case "api_gateway":
        case "gateway":
          outputs[`${resourceName}_id`] = {
            description: `ID of ${node.data.name as string} API Gateway`,
            value: `${resourceType}.${resourceName}.id`,
          }
          outputs[`${resourceName}_arn`] = {
            description: `ARN of ${node.data.name as string} API Gateway`,
            value: `${resourceType}.${resourceName}.arn`,
          }
          outputs[`${resourceName}_execution_arn`] = {
            description: `Execution ARN of ${node.data.name as string} API Gateway`,
            value: `${resourceType}.${resourceName}.execution_arn`,
          }
          break

        case "s3":
        case "storage":
        case "blob":
          outputs[`${resourceName}_bucket_name`] = {
            description: `Name of ${node.data.name as string} bucket`,
            value: `${resourceType}.${resourceName}.bucket`,
          }
          break

        case "dynamodb":
        case "database":
          outputs[`${resourceName}_table_name`] = {
            description: `Name of ${node.data.name as string} DynamoDB table`,
            value: `${resourceType}.${resourceName}.name`,
          }
          outputs[`${resourceName}_table_arn`] = {
            description: `ARN of ${node.data.name as string} DynamoDB table`,
            value: `${resourceType}.${resourceName}.arn`,
          }
          break

        case "rds":
        case "sql":
          outputs[`${resourceName}_endpoint`] = {
            description: `Database endpoint for ${node.data.name as string}`,
            value: `${resourceType}.${resourceName}.endpoint`,
          }
          break

        case "alb":
        case "lb":
          outputs[`${resourceName}_dns_name`] = {
            description: `DNS name of ${node.data.name as string}`,
            value: `${resourceType}.${resourceName}.dns_name`,
          }
          break

        case "lambda":
          outputs[`${resourceName}_function_name`] = {
            description: `Name of ${node.data.name as string} Lambda function`,
            value: `${resourceType}.${resourceName}.function_name`,
          }
          outputs[`${resourceName}_arn`] = {
            description: `ARN of ${node.data.name as string} Lambda function`,
            value: `${resourceType}.${resourceName}.arn`,
          }
          outputs[`${resourceName}_s3_bucket`] = {
            description: `S3 bucket containing ${node.data.name as string} Lambda code`,
            value: `${resourceType}.${resourceName}.s3_bucket`,
          }
          outputs[`${resourceName}_s3_key`] = {
            description: `S3 key for ${node.data.name as string} Lambda code`,
            value: `${resourceType}.${resourceName}.s3_key`,
          }
          break

        case "database":
          if (node.data.provider === 'supabase') {
            outputs[`${resourceName}_project_id`] = {
              description: `Supabase project ID for ${node.data.name as string}`,
              value: `${resourceType}.${resourceName}.id`,
            }
            outputs[`${resourceName}_project_url`] = {
              description: `Supabase project URL for ${node.data.name as string}`,
              value: `${resourceType}.${resourceName}.project_url`,
            }
            outputs[`${resourceName}_db_host`] = {
              description: `Database host for ${node.data.name as string}`,
              value: `${resourceType}.${resourceName}.db_host`,
            }
            outputs[`${resourceName}_anon_key`] = {
              description: `Anonymous key for ${node.data.name as string}`,
              value: `${resourceType}.${resourceName}.anon_key`,
              sensitive: true,
            }
            outputs[`${resourceName}_service_role_key`] = {
              description: `Service role key for ${node.data.name as string}`,
              value: `${resourceType}.${resourceName}.service_role_key`,
              sensitive: true,
            }
          }
          break
      }
    })

    return outputs
  }

  private sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
  }

  private getDefaultRegion(): string {
    switch (this.provider) {
      case "aws":
        return "us-east-1"
      case "gcp":
        return "us-central1"
      case "azure":
        return "East US"
      case "supabase":
        return "us-east-1"
      default:
        return "us-east-1"
    }
  }

  private getEngineVersion(engine: string): string {
    const versions: Record<string, string> = {
      mysql: "8.0",
      postgres: "13.7",
      mariadb: "10.6",
    }
    return versions[engine] || "8.0"
  }

  private getSecurityGroupReferences(nodeId: string): string[] {
    // This would be enhanced to find actual security group connections
    return ["aws_security_group.default.id"]
  }

  private getSubnetReference(nodeId: string): string {
    // This would be enhanced to find actual subnet connections
    return "aws_subnet.main.id"
  }

  private getDBSubnetGroupReference(nodeId: string): string {
    // This would be enhanced to find actual DB subnet group connections
    return "aws_db_subnet_group.main.name"
  }

  generateTerraformCode(): string {
    const output = this.generate()
    let terraformCode = ""

    // Provider configuration
    terraformCode += this.generateProviderBlock()
    terraformCode += "\n"

    // Variables
    if (Object.keys(output.variables).length > 0) {
      terraformCode += "# Variables\n"
      Object.entries(output.variables).forEach(([name, config]) => {
        terraformCode += `variable "${name}" {\n`
        Object.entries(config as Record<string, any>).forEach(([key, value]) => {
          if (key === "type" && value === "string") {
            terraformCode += `  ${key} = ${value}\n`
          } else if (typeof value === "string") {
            terraformCode += `  ${key} = "${value}"\n`
          } else if (typeof value === "boolean") {
            terraformCode += `  ${key} = ${value}\n`
          } else {
            terraformCode += `  ${key} = ${JSON.stringify(value)}\n`
          }
        })
        terraformCode += "}\n\n"
      })
    }

    // Resources
    terraformCode += "# Resources\n"
    output.resources.forEach((resource) => {
      terraformCode += `resource "${resource.type}" "${resource.name}" {\n`
      terraformCode += this.formatResourceConfig(resource.config, 1)

      if (resource.dependencies && resource.dependencies.length > 0) {
        terraformCode += `  depends_on = [${resource.dependencies.map((dep) => `${dep}`).join(", ")}]\n`
      }

      terraformCode += "}\n\n"
    })

    // Outputs
    if (Object.keys(output.outputs).length > 0) {
      terraformCode += "# Outputs\n"
      Object.entries(output.outputs).forEach(([name, config]) => {
        terraformCode += `output "${name}" {\n`
        Object.entries(config as Record<string, any>).forEach(([key, value]) => {
          if (typeof value === "string") {
            terraformCode += `  ${key} = "${value}"\n`
          } else {
            terraformCode += `  ${key} = ${value}\n`
          }
        })
        terraformCode += "}\n\n"
      })
    }

    return terraformCode
  }

  generateProviderBlock(): string {
    switch (this.provider) {
      case "aws":
        return `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.region
}
`

      case "gcp":
        return `terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
`

      case "azure":
        return `terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "main" {
  name     = "rg-\${var.environment}"
  location = var.region
}
`

      case "supabase":
        return `terraform {
  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }
}

provider "supabase" {
  access_token = var.supabase_access_token
}
`

      default:
        return ""
    }
  }

  private formatResourceConfig(config: Record<string, any>, indent: number, parentKey?: string): string {
    let result = ""
    const spaces = "  ".repeat(indent)

    Object.entries(config).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return
      }

      if (typeof value === "string") {
        if (value.includes('\n')) {
          // Use heredoc for multi-line strings
          result += `${spaces}${key} = <<EOT\n${value}\nEOT\n`
        } else {
          // Escape inner double quotes for single-line
          let formattedValue = value.replace(/"/g, '\\"')
          if (value.startsWith("var.") ||
              value.startsWith("aws_") ||
              value.startsWith("google_") ||
              value.startsWith("azurerm_") ||
              value.startsWith("supabase_")) {
            result += `${spaces}${key} = ${formattedValue}\n`
          } else {
            result += `${spaces}${key} = "${formattedValue}"\n`
          }
        }
      } else if (typeof value === "number" || typeof value === "boolean") {
        result += `${spaces}${key} = ${value}\n`
      } else if (Array.isArray(value)) {
        result += `${spaces}${key} = [\n`
        value.forEach((v, i) => {
          if (typeof v === 'object' && v !== null) {
            result += `${spaces}  {\n`
            result += this.formatResourceConfig(v, indent + 2)
            result += `${spaces}  }${i < value.length - 1 ? ',' : ''}\n`
          } else {
            const formatted = typeof v === "string" ? `"${v}"` : v
            result += `${spaces}  ${formatted}${i < value.length - 1 ? ',' : ''}\n`
          }
        })
        result += `${spaces}]\n`
      } else if (typeof value === "object") {
        // Special handling for different types of objects
        if (key === "tags" || parentKey === "tags") {
          // Tags should always be arguments
          result += `${spaces}${key} = {\n`
        } else if (key === "versioning" || key === "lifecycle" || key === "provisioner" || key === "point_in_time_recovery") {
          // These should be blocks
          result += `${spaces}${key} {\n`
        } else {
          result += `${spaces}${key} {\n`
        }
        result += this.formatResourceConfig(value, indent + 1, key)
        result += `${spaces}}\n`
      }
    })

    return result
  }
}
