"use client";

import { useState, useCallback, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { ReactFlowProvider } from "@xyflow/react";
import { ComponentPalette } from "@/components/panels/component-palette";
import { Canvas } from "@/components/canvas/canvas";
import { PropertiesPanel } from "@/components/panels/properties-panel";
import { ProvidersPane } from "@/components/panels/providers-pane";
import { Toolbar } from "@/components/layout/toolbar";
import { ProjectTitleBar } from "@/components/layout/project-title-bar";
import { CreateNewProjectDialog } from "@/components/dialogs/create-new-project-dialog";
import { OpenProjectDialog, type Project } from "@/components/dialogs/open-project-dialog";
import { SettingsDialog } from "@/components/dialogs/settings-dialog";
import { PlanPreviewDialog } from "@/components/dialogs/plan-preview-dialog";
import { TerraformPreviewDialog } from "@/components/dialogs/terraform-preview";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CredentialManager } from "@/lib/credential-manager";
import type { Block, Connection } from "@/types/infrastructure";

interface HistoryState {
  blocks: Block[];
  connections: Connection[];
}

export default function InfrastructureBuilder() {
  const { toast } = useToast();
  
  // Project Management State
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [showOpenProject, setShowOpenProject] = useState(false);

  // Canvas State
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPlanPreview, setShowPlanPreview] = useState(false);
  const [showTerraformCode, setShowTerraformCode] = useState(false);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  
  // AI Chat state (Fetch.ai ASI:One)
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([
    {
      role: 'assistant',
      content: 'Hello! I\'m powered by Fetch.ai\'s ASI:One. I can help you design cloud infrastructure, review your architecture, and answer questions about best practices. What would you like to build?'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Deployment State (Claude Terraform Generation)
  const [terraformCode, setTerraformCode] = useState<string | null>(null);
  const [deploymentStage, setDeploymentStage] = useState<'none' | 'generated' | 'planned' | 'applying' | 'applied'>('none');
  const [planOutput, setPlanOutput] = useState<string | null>(null);
  const [isGeneratingTerraform, setIsGeneratingTerraform] = useState(false);

  const [history, setHistory] = useState<HistoryState[]>([
    { blocks: [], connections: [] },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Load projects on mount
  useEffect(() => {
    try {
      const savedProjects = localStorage.getItem("infrastructure-projects");
      const savedCurrentProjectId = localStorage.getItem("current-project-id");

      if (savedProjects) {
        const parsedProjects = JSON.parse(savedProjects);
        setProjects(parsedProjects);

        // Load current project if exists
        if (savedCurrentProjectId) {
          const project = parsedProjects.find(
            (p: Project) => p.id === savedCurrentProjectId
          );
          if (project) {
            setCurrentProject(project);
            setBlocks(project.blocks || []);
            setConnections(project.connections || []);
            setHistory([
              {
                blocks: project.blocks || [],
                connections: project.connections || [],
              },
            ]);
            console.log("✅ Project loaded:", project.name);
          }
        }
      }

      // If no projects exist, create a default one
      if (!savedProjects || JSON.parse(savedProjects).length === 0) {
        const defaultProject: Project = {
          id: `project-${Date.now()}`,
          name: "Untitled Project",
          description: "",
          provider: "aws",
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          blocks: [],
          connections: [],
        };
        setProjects([defaultProject]);
        setCurrentProject(defaultProject);
        localStorage.setItem(
          "infrastructure-projects",
          JSON.stringify([defaultProject])
        );
        localStorage.setItem("current-project-id", defaultProject.id);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  }, []);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  const saveToHistory = useCallback(
    (newBlocks: Block[], newConnections: Connection[]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({ blocks: newBlocks, connections: newConnections });
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [history, historyIndex]
  );

  const handleAddBlock = (block: Block) => {
    const newBlocks = [...blocks, block];
    setBlocks(newBlocks);
    saveToHistory(newBlocks, connections);
  };

  const handleUpdateBlock = (id: string, updates: Partial<Block>) => {
    const newBlocks = blocks.map((b) =>
      b.id === id ? { ...b, ...updates } : b
    );
    setBlocks(newBlocks);
    saveToHistory(newBlocks, connections);
  };

  const handleDeleteBlock = (id: string) => {
    const newBlocks = blocks.filter((b) => b.id !== id);
    const newConnections = connections.filter(
      (c) => c.from !== id && c.to !== id
    );
    setBlocks(newBlocks);
    setConnections(newConnections);
    saveToHistory(newBlocks, newConnections);
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  };

  const handleAddConnection = (connection: Connection) => {
    const newConnections = [...connections, connection];
    setConnections(newConnections);
    saveToHistory(blocks, newConnections);
  };

  const handleDeleteConnection = (id: string) => {
    const newConnections = connections.filter((c) => c.id !== id);
    setConnections(newConnections);
    saveToHistory(blocks, newConnections);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setBlocks(history[newIndex].blocks);
      setConnections(history[newIndex].connections);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setBlocks(history[newIndex].blocks);
      setConnections(history[newIndex].connections);
    }
  };

  // Project Management Functions
  const saveCurrentProject = useCallback(() => {
    if (!currentProject) return;

    const updatedProject: Project = {
      ...currentProject,
      blocks,
      connections,
      lastModified: new Date().toISOString(),
    };

    const updatedProjects = projects.map((p) =>
      p.id === currentProject.id ? updatedProject : p
    );

    setProjects(updatedProjects);
    setCurrentProject(updatedProject);
    localStorage.setItem(
      "infrastructure-projects",
      JSON.stringify(updatedProjects)
    );
    console.log("✅ Project saved:", updatedProject.name);
  }, [currentProject, blocks, connections, projects]);

  const handleCreateProject = (name: string, description: string, provider: "aws" | "gcp" | "azure") => {
    // Save current project first
    if (currentProject) {
      saveCurrentProject();
    }

    const newProject: Project = {
      id: `project-${Date.now()}`,
      name,
      description,
      provider,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      blocks: [],
      connections: [],
    };

    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    setCurrentProject(newProject);
    setBlocks([]);
    setConnections([]);
    setSelectedBlockId(null);
    setZoom(1);
    setHistory([{ blocks: [], connections: [] }]);
    setHistoryIndex(0);

    localStorage.setItem(
      "infrastructure-projects",
      JSON.stringify(updatedProjects)
    );
    localStorage.setItem("current-project-id", newProject.id);
    console.log("✅ New project created:", name, "with provider:", provider);
  };

  const handleNewProject = () => {
    setShowCreateProject(true);
  };

  const handleOpenProject = (project: Project) => {
    // Save current project first
    if (currentProject) {
      saveCurrentProject();
    }

    setCurrentProject(project);
    setBlocks(project.blocks || []);
    setConnections(project.connections || []);
    setSelectedBlockId(null);
    setHistory([
      { blocks: project.blocks || [], connections: project.connections || [] },
    ]);
    setHistoryIndex(0);
    localStorage.setItem("current-project-id", project.id);
    console.log("✅ Project opened:", project.name);
  };

  const handleDeleteProject = (projectId: string) => {
    const updatedProjects = projects.filter((p) => p.id !== projectId);
    setProjects(updatedProjects);
    localStorage.setItem(
      "infrastructure-projects",
      JSON.stringify(updatedProjects)
    );

    // If deleting current project, switch to another or create new
    if (currentProject?.id === projectId) {
      if (updatedProjects.length > 0) {
        handleOpenProject(updatedProjects[0]);
      } else {
        handleCreateProject("Untitled Project", "", "aws");
      }
    }
  };

  const handleSave = () => {
    try {
      saveCurrentProject();
      const toastInstance = toast({
        title: "✓ Project saved",
        description: "Your infrastructure design has been saved successfully.",
        duration: 2500,
      });
      
      // Auto-dismiss after duration
      setTimeout(() => {
        toastInstance.dismiss();
      }, 2500);
    } catch (error) {
      console.error("Failed to save project:", error);
      toast({
        title: "✗ Save failed",
        description: "Failed to save project. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Handle AI Chat Messages (Fetch.ai ASI:One)
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    
    // Add user message to chat
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      console.log('💬 Sending message to ASI:One...');
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();
      console.log('✅ ASI:One response:', data);

      // Add assistant response to chat
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || data.content || 'I apologize, I had trouble processing that request.'
      }]);
    } catch (error) {
      console.error('❌ Chat error:', error);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleGenerateTerraform = async () => {
    // Clear previous error and plan output
    setDeploymentError(null);
    setPlanOutput(null);

    // Check if there are any blocks to deploy
    if (blocks.length === 0) {
      setDeploymentError(
        "No infrastructure defined. Please add some services to generate Terraform code."
      );
      return;
    }

    const isRegeneration = terraformCode !== null;

    try {
      setIsGeneratingTerraform(true);
      
      toast({
        title: isRegeneration ? "🔄 Regenerating Terraform" : "⚙️ Generating Terraform",
        description: "Claude is generating your infrastructure code...",
        duration: 2000,
      });

      // Call the API to generate Terraform code using Claude
      const response = await fetch('/api/terraform/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blocks,
          connections,
          provider: currentProject?.provider || 'aws'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate Terraform code');
      }

      const data = await response.json();
      
      if (!data.success || !data.terraformCode) {
        throw new Error('Invalid response from Terraform generation API');
      }

      setTerraformCode(data.terraformCode);
      setDeploymentStage('generated');
      
      toast({
        title: isRegeneration ? "✅ Terraform Regenerated" : "✅ Terraform Generated",
        description: `${isRegeneration ? 'Regenerated' : 'Generated'} code for ${data.metadata.blocksCount} services. Ready to plan.`,
        duration: 3000,
      });
      
      console.log(isRegeneration ? '✅ Terraform code regenerated successfully' : '✅ Terraform code generated successfully');
    } catch (error) {
      console.error("Failed to generate Terraform:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setDeploymentError(`Failed to generate Terraform code: ${errorMessage}`);
      
      toast({
        title: "❌ Generation Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsGeneratingTerraform(false);
    }
  };

  const handlePlan = async () => {
    if (deploymentStage !== 'generated') return;

    // Check if AWS credentials are configured
    if (!CredentialManager.hasCredentials("aws")) {
      setDeploymentError(
        "No AWS credentials configured. Please configure credentials in settings."
      );
      return;
    }

    try {
      toast({
        title: "📋 Running terraform plan",
        description: "Analyzing infrastructure changes...",
        duration: 2000,
      });

      // TODO: Call API to run terraform plan
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock plan output
      const mockPlan = `Terraform will perform the following actions:

  # aws_dynamodb_table.example will be created
  + resource "aws_dynamodb_table" "example" {
      + arn              = (known after apply)
      + billing_mode     = "PAY_PER_REQUEST"
      + hash_key         = "id"
      + id               = (known after apply)
      + name             = "my-table"
    }

Plan: 1 to add, 0 to change, 0 to destroy.`;

      setPlanOutput(mockPlan);
      setDeploymentStage('planned');
      
      toast({
        title: "✅ Plan Complete",
        description: "Review the changes and click Apply to deploy.",
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to plan:", error);
      setDeploymentError("Failed to run terraform plan. Please check your configuration.");
    }
  };

  const handleApply = async () => {
    if (deploymentStage !== 'planned') return;

    try {
      setDeploymentStage('applying');
      
      toast({
        title: "🚀 Applying changes",
        description: "Deploying infrastructure to AWS...",
        duration: 2000,
      });

      // TODO: Call API to run terraform apply
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setDeploymentStage('applied');
      
      toast({
        title: "✅ Deployment Complete",
        description: "Your infrastructure has been successfully deployed!",
        duration: 4000,
      });
    } catch (error) {
      console.error("Failed to apply:", error);
      setDeploymentError("Failed to deploy infrastructure. Please check the logs.");
      setDeploymentStage('planned'); // Revert to planned state
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden flex-col">
      {/* Project Title Bar */}
      <ProjectTitleBar
        projectName={currentProject?.name || "Untitled Project"}
        onCreateProject={handleNewProject}
        onOpenProject={() => setShowOpenProject(true)}
        onOpenSettings={() => setShowSettings(true)}
        onEditProject={() => {
          // TODO: Implement project editing
          console.log("Edit project clicked");
        }}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        <ComponentPalette onAddBlock={handleAddBlock} />

        <div className="flex-1 flex flex-col">
          <Toolbar
            onSave={handleSave}
            onGenerateTerraform={handleGenerateTerraform}
            onPlanOrApply={deploymentStage === 'generated' ? handlePlan : handleApply}
            onViewPreview={() => setShowPlanPreview(true)}
            onViewCode={() => setShowTerraformCode(true)}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            deploymentStage={deploymentStage}
            isGeneratingTerraform={isGeneratingTerraform}
          />

          <ReactFlowProvider>
            <Canvas
              blocks={blocks}
              connections={connections}
              selectedBlockId={selectedBlockId}
              zoom={zoom}
              onSelectBlock={setSelectedBlockId}
              onUpdateBlock={handleUpdateBlock}
              onAddBlock={handleAddBlock}
              onAddConnection={handleAddConnection}
              onDeleteConnection={handleDeleteConnection}
              onDeleteBlock={handleDeleteBlock}
              onZoomChange={setZoom}
            />
          </ReactFlowProvider>
        </div>

        <div className="flex flex-col w-80 border-l border-sidebar-border bg-sidebar overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden">
            <PropertiesPanel
              block={selectedBlock}
              blocks={blocks}
              connections={connections}
              onUpdateBlock={handleUpdateBlock}
              onDeleteBlock={handleDeleteBlock}
            />
          </div>
          <div className="h-[40vh] border-t border-sidebar-border overflow-hidden">
            <ProvidersPane currentProvider={currentProject?.provider} nodes={blocks} />
          </div>
        </div>
      </div>

      {/* Deployment Error Notification */}
      {deploymentError && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 w-96 bg-destructive/10 border border-destructive/50 rounded-lg shadow-lg z-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="font-semibold text-destructive mb-1">
                Deployment Error:
              </div>
              <div className="text-sm text-destructive/90">
                {deploymentError}
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-destructive hover:text-destructive/80"
              onClick={() => setDeploymentError(null)}
            >
              ×
            </Button>
          </div>
        </div>
      )}

      <Button
        size="icon"
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full shadow-lg hover:scale-110 transition-transform z-50"
        onClick={() => setShowAIChat(!showAIChat)}
      >
        <MessageSquare className="w-5 h-5" />
      </Button>

      {showAIChat && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-card border border-border rounded-lg shadow-2xl z-50 flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold">AI Infrastructure Assistant</h3>
              <p className="text-xs text-muted-foreground">Powered by Fetch.ai ASI:One</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowAIChat(false)}
            >
              ×
            </Button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`rounded-lg p-3 text-sm ${
                  msg.role === 'assistant'
                    ? 'bg-muted/50 text-foreground'
                    : 'bg-primary/10 text-foreground ml-8'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
            {isChatLoading && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="text-muted-foreground animate-pulse">ASI:One is thinking...</p>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChatMessage();
                  }
                }}
                placeholder="Ask about your infrastructure..."
                className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background"
                disabled={isChatLoading}
              />
              <Button
                size="sm"
                onClick={handleSendChatMessage}
                disabled={isChatLoading || !chatInput.trim()}
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateNewProjectDialog
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onCreateProject={handleCreateProject}
      />
      <OpenProjectDialog
        open={showOpenProject}
        onOpenChange={setShowOpenProject}
        projects={projects}
        currentProjectId={currentProject?.id || null}
        onOpenProject={handleOpenProject}
        onDeleteProject={handleDeleteProject}
      />
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      <PlanPreviewDialog
        open={showPlanPreview}
        onOpenChange={setShowPlanPreview}
        planOutput={planOutput}
        onApply={handleApply}
      />
      <TerraformPreviewDialog
        open={showTerraformCode}
        onOpenChange={setShowTerraformCode}
        terraformCode={terraformCode}
      />
    </div>
  );
}
