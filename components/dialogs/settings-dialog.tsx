"use client"

import { useEffect, useState } from "react"
import { Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CredentialManager, type AWSCredentials, type AzureCredentials, type GCPCredentials, type SupabaseCredentials } from "@/lib/credential-manager"
import { testCredentials } from "@/lib/api-service"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  // Credential states
  const [awsCredentials, setAwsCredentials] = useState<Partial<AWSCredentials>>({})
  const [gcpCredentials, setGcpCredentials] = useState<Partial<GCPCredentials>>({})
  const [azureCredentials, setAzureCredentials] = useState<Partial<AzureCredentials>>({})
  const [supabaseCredentials, setSupabaseCredentials] = useState<Partial<SupabaseCredentials>>({})
  const [credentialErrors, setCredentialErrors] = useState<{[key: string]: string[]}>({})
  const [credentialStatus, setCredentialStatus] = useState<{[key: string]: 'idle' | 'saving' | 'testing' | 'success' | 'error'}>({
    aws: 'idle',
    gcp: 'idle', 
    azure: 'idle',
    supabase: 'idle'
  })

  // Load credentials when dialog opens
  useEffect(() => {
    if (open) {
      const loadCredentials = () => {
        const aws = CredentialManager.getCredentials('aws')
        const gcp = CredentialManager.getCredentials('gcp')
        const azure = CredentialManager.getCredentials('azure')
        const supabase = CredentialManager.getCredentials('supabase')
        
        if (aws) setAwsCredentials(aws)
        if (gcp) setGcpCredentials(gcp)
        if (azure) setAzureCredentials(azure)
        if (supabase) setSupabaseCredentials(supabase)
      }
      
      loadCredentials()
    }
  }, [open])

  // AWS credential handlers
  const handleSaveAWSCredentials = async () => {
    setCredentialStatus(prev => ({ ...prev, aws: 'saving' }))
    
    try {
      const errors = CredentialManager.validateAWSCredentials(awsCredentials)
      if (errors.length > 0) {
        setCredentialErrors(prev => ({ ...prev, aws: errors }))
        setCredentialStatus(prev => ({ ...prev, aws: 'error' }))
        return
      }

      CredentialManager.saveCredentials('aws', awsCredentials)
      setCredentialErrors(prev => ({ ...prev, aws: [] }))
      setCredentialStatus(prev => ({ ...prev, aws: 'success' }))
      
      // Test credentials
      setCredentialStatus(prev => ({ ...prev, aws: 'testing' }))
      const testResult = await testCredentials('aws')
      
      if (testResult.valid) {
        setCredentialStatus(prev => ({ ...prev, aws: 'success' }))
      } else {
        setCredentialStatus(prev => ({ ...prev, aws: 'error' }))
        setCredentialErrors(prev => ({ ...prev, aws: [testResult.message] }))
      }
    } catch (error) {
      setCredentialStatus(prev => ({ ...prev, aws: 'error' }))
      setCredentialErrors(prev => ({ 
        ...prev, 
        aws: [error instanceof Error ? error.message : 'Failed to save credentials'] 
      }))
    }
  }

  // GCP credential handlers
  const handleSaveGCPCredentials = async () => {
    setCredentialStatus(prev => ({ ...prev, gcp: 'saving' }))
    
    try {
      const errors = CredentialManager.validateGCPCredentials(gcpCredentials)
      if (errors.length > 0) {
        setCredentialErrors(prev => ({ ...prev, gcp: errors }))
        setCredentialStatus(prev => ({ ...prev, gcp: 'error' }))
        return
      }

      CredentialManager.saveCredentials('gcp', gcpCredentials)
      setCredentialErrors(prev => ({ ...prev, gcp: [] }))
      setCredentialStatus(prev => ({ ...prev, gcp: 'success' }))
    } catch (error) {
      setCredentialStatus(prev => ({ ...prev, gcp: 'error' }))
      setCredentialErrors(prev => ({ 
        ...prev, 
        gcp: [error instanceof Error ? error.message : 'Failed to save credentials'] 
      }))
    }
  }

  // Azure credential handlers
  const handleSaveAzureCredentials = async () => {
    setCredentialStatus(prev => ({ ...prev, azure: 'saving' }))
    
    try {
      const errors = CredentialManager.validateAzureCredentials(azureCredentials)
      if (errors.length > 0) {
        setCredentialErrors(prev => ({ ...prev, azure: errors }))
        setCredentialStatus(prev => ({ ...prev, azure: 'error' }))
        return
      }

      CredentialManager.saveCredentials('azure', azureCredentials)
      setCredentialErrors(prev => ({ ...prev, azure: [] }))
      setCredentialStatus(prev => ({ ...prev, azure: 'success' }))
    } catch (error) {
      setCredentialStatus(prev => ({ ...prev, azure: 'error' }))
      setCredentialErrors(prev => ({ 
        ...prev, 
        azure: [error instanceof Error ? error.message : 'Failed to save credentials'] 
      }))
    }
  }

  // Supabase credential handlers
  const handleSaveSupabaseCredentials = async () => {
    setCredentialStatus(prev => ({ ...prev, supabase: 'saving' }))
    
    try {
      const errors = CredentialManager.validateSupabaseCredentials(supabaseCredentials)
      if (errors.length > 0) {
        setCredentialErrors(prev => ({ ...prev, supabase: errors }))
        setCredentialStatus(prev => ({ ...prev, supabase: 'error' }))
        return
      }

      CredentialManager.saveCredentials('supabase', supabaseCredentials)
      setCredentialErrors(prev => ({ ...prev, supabase: [] }))
      setCredentialStatus(prev => ({ ...prev, supabase: 'success' }))
    } catch (error) {
      setCredentialStatus(prev => ({ ...prev, supabase: 'error' }))
      setCredentialErrors(prev => ({ 
        ...prev, 
        supabase: [error instanceof Error ? error.message : 'Failed to save credentials'] 
      }))
    }
  }

  const handleTestSupabaseCredentials = async () => {
    setCredentialStatus(prev => ({ ...prev, supabase: 'testing' }))
    
    try {
      const result = await testCredentials('supabase', supabaseCredentials)
      if (result.success) {
        setCredentialStatus(prev => ({ ...prev, supabase: 'success' }))
        setCredentialErrors(prev => ({ ...prev, supabase: [] }))
      } else {
        setCredentialStatus(prev => ({ ...prev, supabase: 'error' }))
        setCredentialErrors(prev => ({ ...prev, supabase: [result.error || 'Test failed'] }))
      }
    } catch (error) {
      setCredentialStatus(prev => ({ ...prev, supabase: 'error' }))
      setCredentialErrors(prev => ({ 
        ...prev, 
        supabase: [error instanceof Error ? error.message : 'Test failed'] 
      }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure your cloud provider credentials to deploy components.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-4">
            {/* AWS Credentials */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="w-6 h-6 bg-orange-100 rounded flex items-center justify-center">
                    <span className="text-orange-600 font-bold text-xs">A</span>
                  </div>
                  AWS
                </CardTitle>
                <CardDescription>Amazon Web Services credentials</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Access Key ID</label>
                    <Input 
                      placeholder="AKIA..." 
                      className="mt-1" 
                      value={awsCredentials.accessKeyId || ''}
                      onChange={(e) => setAwsCredentials(prev => ({ ...prev, accessKeyId: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Secret Access Key</label>
                    <Input 
                      type="password" 
                      placeholder="••••••••••••••••" 
                      className="mt-1"
                      value={awsCredentials.secretAccessKey || ''}
                      onChange={(e) => setAwsCredentials(prev => ({ ...prev, secretAccessKey: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Region</label>
                  <Select 
                    value={awsCredentials.region || 'us-east-1'} 
                    onValueChange={(value) => setAwsCredentials(prev => ({ ...prev, region: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us-east-1">US East (N. Virginia) - us-east-1</SelectItem>
                      <SelectItem value="us-east-2">US East (Ohio) - us-east-2</SelectItem>
                      <SelectItem value="us-west-1">US West (N. California) - us-west-1</SelectItem>
                      <SelectItem value="us-west-2">US West (Oregon) - us-west-2</SelectItem>
                      <SelectItem value="eu-west-1">Europe (Ireland) - eu-west-1</SelectItem>
                      <SelectItem value="eu-west-2">Europe (London) - eu-west-2</SelectItem>
                      <SelectItem value="eu-west-3">Europe (Paris) - eu-west-3</SelectItem>
                      <SelectItem value="eu-central-1">Europe (Frankfurt) - eu-central-1</SelectItem>
                      <SelectItem value="ap-southeast-1">Asia Pacific (Singapore) - ap-southeast-1</SelectItem>
                      <SelectItem value="ap-southeast-2">Asia Pacific (Sydney) - ap-southeast-2</SelectItem>
                      <SelectItem value="ap-northeast-1">Asia Pacific (Tokyo) - ap-northeast-1</SelectItem>
                      <SelectItem value="ap-northeast-2">Asia Pacific (Seoul) - ap-northeast-2</SelectItem>
                      <SelectItem value="ca-central-1">Canada (Central) - ca-central-1</SelectItem>
                      <SelectItem value="sa-east-1">South America (São Paulo) - sa-east-1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Error messages */}
                {credentialErrors.aws && credentialErrors.aws.length > 0 && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                    {credentialErrors.aws.map((error, index) => (
                      <div key={index}>• {error}</div>
                    ))}
                  </div>
                )}
                
                {/* Success message */}
                {credentialStatus.aws === 'success' && (
                  <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md border border-green-200">
                    ✓ AWS credentials saved and validated successfully!
                  </div>
                )}
                
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700" 
                  onClick={handleSaveAWSCredentials}
                  disabled={credentialStatus.aws === 'saving' || credentialStatus.aws === 'testing'}
                >
                  {credentialStatus.aws === 'saving' && 'Saving...'}
                  {credentialStatus.aws === 'testing' && 'Testing credentials...'}
                  {credentialStatus.aws === 'success' && 'Credentials Saved ✓'}
                  {credentialStatus.aws === 'error' && 'Save AWS Credentials'}
                  {(credentialStatus.aws === 'idle') && 'Save AWS Credentials'}
                </Button>
              </CardContent>
            </Card>

            {/* GCP Credentials */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-xs">G</span>
                  </div>
                  Google Cloud Platform
                </CardTitle>
                <CardDescription>Google Cloud Platform credentials (Coming Soon)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Service Account Key (JSON)</label>
                  <Input 
                    type="file" 
                    accept=".json" 
                    className="mt-1"
                    disabled 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Project ID</label>
                  <Input 
                    placeholder="my-gcp-project" 
                    className="mt-1"
                    disabled 
                  />
                </div>
                <Button className="w-full" disabled>Save GCP Credentials</Button>
              </CardContent>
            </Card>

            {/* Azure Credentials */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-xs">A</span>
                  </div>
                  Microsoft Azure
                </CardTitle>
                <CardDescription>Microsoft Azure credentials (Coming Soon)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Client ID</label>
                    <Input 
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" 
                      className="mt-1"
                      disabled 
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Client Secret</label>
                    <Input 
                      type="password" 
                      placeholder="••••••••••••••••" 
                      className="mt-1"
                      disabled 
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tenant ID</label>
                  <Input 
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" 
                    className="mt-1"
                    disabled 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Subscription ID</label>
                  <Input 
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" 
                    className="mt-1"
                    disabled 
                  />
                </div>
                <Button className="w-full" disabled>Save Azure Credentials</Button>
              </CardContent>
            </Card>

            {/* Supabase Credentials */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
                    <span className="text-green-600 font-bold text-xs">S</span>
                  </div>
                  Supabase
                </CardTitle>
                <CardDescription>Supabase Management API access token</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Access Token</label>
                  <Input 
                    type="password" 
                    placeholder="sbp_..." 
                    className="mt-1"
                    value={supabaseCredentials.accessToken || ''}
                    onChange={(e) => setSupabaseCredentials(prev => ({ ...prev, accessToken: e.target.value }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Get your access token from <a href="https://supabase.com/dashboard/account/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Supabase Dashboard</a>
                  </p>
                </div>
                
                {credentialErrors.supabase && credentialErrors.supabase.length > 0 && (
                  <div className="text-sm text-red-600">
                    {credentialErrors.supabase.map((error, index) => (
                      <div key={index}>{error}</div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={handleSaveSupabaseCredentials}
                    disabled={credentialStatus.supabase === 'saving'}
                    className="flex-1"
                  >
                    {credentialStatus.supabase === 'saving' ? 'Saving...' : 'Save Supabase Credentials'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleTestSupabaseCredentials}
                    disabled={credentialStatus.supabase === 'testing' || !supabaseCredentials.accessToken}
                  >
                    {credentialStatus.supabase === 'testing' ? 'Testing...' : 'Test'}
                  </Button>
                </div>

                {credentialStatus.supabase === 'success' && (
                  <div className="text-sm text-green-600">
                    ✅ Credentials saved successfully!
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

