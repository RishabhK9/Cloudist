# Code Process Flow: Node Definitions → Generated Terraform Files

This diagram shows the exact method-to-method process from your codebase that transforms node and block definitions into Terraform files.

```mermaid
graph TD
    %% 1. Service Configuration Loading
    A[JSON Config Files<br/>config/aws/s3.json<br/>config/aws/lambda.json] --> B[ConfigLoader.loadServiceConfig<br/>lib/config-loader.ts:59-78]
    B --> C[CloudServiceNode.useEffect<br/>components/canvas/cloud-service-node.tsx:32-48]
    
    %% 2. Node Creation & Configuration
    D[User Drags Service] --> E[InfrastructureCanvas.onDrop<br/>components/canvas/infrastructure-canvas.tsx:303-352]
    E --> F[InfrastructureCanvas.setNodes<br/>Creates Node object with:<br/>- id: getId()<br/>- type: "cloudService"<br/>- data: service + provider + config + terraformType]
    
    %% 3. Terraform Generation Trigger
    G[User Clicks Generate] --> H[InfrastructureCanvas.generateTerraformCode<br/>components/canvas/infrastructure-canvas.tsx:490-505]
    H --> I[TerraformGenerator Constructor<br/>components/utils/terraform-generator.ts:23-41]
    I --> J[TerraformGenerator.generate<br/>components/utils/terraform-generator.ts:43-54]
    
    %% 4. Resource Generation
    J --> K[TerraformGenerator.generateResources<br/>components/utils/terraform-generator.ts:56-238]
    K --> L[TerraformGenerator.generateResourceConfig<br/>components/utils/terraform-generator.ts:240-262]
    L --> M[TerraformGenerator.generateAWSConfig<br/>components/utils/terraform-generator.ts:318-514]
    
    %% 5. AWS-Specific Configuration
    M --> N[Service-Specific Configs<br/>Lambda: lines 423-451<br/>S3: lines 390-397<br/>DynamoDB: lines 352-388<br/>EC2: lines 322-339]
    
    %% 6. Additional Resource Creation
    K --> O[Additional Resources Logic<br/>S3: lines 76-110<br/>Lambda: lines 112-195<br/>SQS: lines 197-234]
    O --> P[S3: aws_s3_bucket_public_access_block<br/>aws_s3_bucket_versioning]
    O --> Q[Lambda: aws_iam_role<br/>aws_iam_role_policy_attachment<br/>archive_file]
    
    %% 7. Variables & Outputs Generation
    J --> R[TerraformGenerator.generateVariables<br/>components/utils/terraform-generator.ts:670-704]
    J --> S[TerraformGenerator.generateOutputs<br/>components/utils/terraform-generator.ts:706-800]
    
    %% 8. Workspace API Processing
    T[POST /api/workspaces<br/>app/api/workspaces/route.ts:32-72] --> U[generateTerraformFiles<br/>app/api/workspaces/route.ts:95-138]
    U --> V[TerraformGenerator.generate<br/>Creates TerraformOutput object]
    
    %% 9. File Generation
    U --> W[generateMainTfOnly<br/>app/api/workspaces/route.ts:143-219]
    U --> X[generateVariablesFile<br/>app/api/workspaces/route.ts:265-285]
    U --> Y[generateOutputsFile<br/>app/api/workspaces/route.ts:290-306]
    U --> Z[generateTerraformConfigFile<br/>app/api/workspaces/route.ts:311-370]
    
    %% 10. Resource Formatting
    W --> AA[formatResourceConfig<br/>components/utils/terraform-generator.ts:1012-1069]
    AA --> BB[Handles Data Types:<br/>- Strings: var.region, aws_s3_bucket.name<br/>- Numbers: 128, 30<br/>- Objects: tags, versioning<br/>- Arrays: attribute blocks]
    
    %% 11. Final Terraform Files
    W --> CC[main.tf<br/>Resource definitions only]
    X --> DD[variables.tf<br/>Variable definitions]
    Y --> EE[outputs.tf<br/>Output definitions]
    Z --> FF[terraform.tf<br/>Provider configuration]
    
    %% Styling
    classDef configFile fill:#e1f5fe
    classDef method fill:#f3e5f5
    classDef terraformFile fill:#e8f5e8
    classDef process fill:#fff3e0
    
    class A configFile
    class B,C,E,F,H,I,J,K,L,M,N,O,P,Q,R,S,U,V,W,X,Y,Z,AA,BB method
    class CC,DD,EE,FF terraformFile
    class G,T process
```

## Key Data Flow Summary:

### **1. Configuration Loading**
- **JSON Config Files** → `ConfigLoader.loadServiceConfig()` → `CloudServiceNode.useEffect()`
- Loads service definitions with `terraformType`, `defaultConfig`, `configSchema`

### **2. Node Creation**
- **User Drag** → `InfrastructureCanvas.onDrop()` → `InfrastructureCanvas.setNodes()`
- Creates `Node` object with service data, provider, config, and terraformType

### **3. Terraform Generation**
- **Generate Trigger** → `TerraformGenerator.generate()` → `generateResources()` → `generateAWSConfig()`
- Maps node data to Terraform resource configurations

### **4. Additional Resources**
- **S3**: Creates `aws_s3_bucket_public_access_block` and `aws_s3_bucket_versioning`
- **Lambda**: Creates `aws_iam_role`, `aws_iam_role_policy_attachment`, `archive_file`

### **5. File Generation**
- **Workspace API** → `generateTerraformFiles()` → Separate file generation methods
- **main.tf**: Resource definitions only
- **variables.tf**: Variable definitions  
- **outputs.tf**: Output definitions
- **terraform.tf**: Provider configuration

### **6. Resource Formatting**
- **formatResourceConfig()**: Handles strings, numbers, objects, arrays
- Creates proper Terraform syntax with references like `var.region`, `aws_s3_bucket.name`

This process transforms visual node definitions into complete Terraform configuration files, including all provider blocks, variables, resources, and outputs.
