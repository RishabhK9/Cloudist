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
import { AIReviewDialog } from "@/components/dialogs/ai-review-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CredentialManager } from "@/lib/credential-manager";
import type { Block, Connection } from "@/types/infrastructure";
import { TerraformGenerator } from "@/components/utils/terraform-generator";

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
  const [showAIReview, setShowAIReview] = useState(false);
  const [aiReviewAnalysis, setAiReviewAnalysis] = useState<any>(null);
  const [isAIReviewLoading, setIsAIReviewLoading] = useState(false);
  const [aiReviewError, setAiReviewError] = useState<string | null>(null);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);

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

  const handleDeploy = () => {
    // Clear previous error
    setDeploymentError(null);

    // Check if there are any blocks to deploy
    if (blocks.length === 0) {
      setDeploymentError(
        "No infrastructure defined. Please add some services to deploy."
      );
      return;
    }

    // Check if AWS credentials are configured
    if (!CredentialManager.hasCredentials("aws")) {
      setDeploymentError(
        "No AWS credentials configured. Please configure credentials in settings."
      );
      return;
    }

    // If credentials are configured, proceed with deployment
    toast({
      title: "🚀 Deployment started",
      description: "Your infrastructure deployment has been initiated.",
      duration: 3000,
    });
  };

  const handleCodeReview = async () => {
    console.log('🎯 [handleCodeReview] Starting code review...');
    setShowAIReview(true);
    setIsAIReviewLoading(true);
    setAiReviewError(null);
    setAiReviewAnalysis(null);

    try {
      console.log('📦 [handleCodeReview] Generating Terraform from blocks:', blocks.length);
      
      // Check if there are any blocks to review
      if (blocks.length === 0) {
        console.warn('⚠️ [handleCodeReview] No infrastructure blocks to review');
        setAiReviewError('No infrastructure defined. Please add some services to your canvas first.');
        setIsAIReviewLoading(false);
        return;
      }
      
      // Helper function to get category from block type
      const getCategoryFromType = (blockType: string): string => {
        const typeToCategory: Record<string, string> = {
          'ec2': 'compute',
          'compute': 'compute',
          'vm': 'compute',
          'lambda': 'serverless',
          's3': 'storage',
          'storage': 'storage',
          'blob': 'storage',
          'rds': 'database',
          'sql': 'database',
          'dynamodb': 'database',
          'api_gateway': 'networking',
          'alb': 'networking',
          'vpc': 'networking',
          'sqs': 'messaging',
          'sns': 'messaging',
        };
        return typeToCategory[blockType] || 'other';
      };
      
      // Generate Terraform code from blocks
      const mockNodes = blocks.map(block => ({
        id: block.id,
        type: block.type,
        data: {
          label: block.name,
          // Use category from config if available, otherwise derive from type
          category: block.config?.category || getCategoryFromType(block.type),
          ...block.config
        },
        position: { x: block.x, y: block.y }
      }));
      console.log('✅ [handleCodeReview] Created mock nodes:', mockNodes.length);

      const mockEdges = connections.map(conn => ({
        id: conn.id,
        source: conn.from,
        target: conn.to
      }));
      console.log('✅ [handleCodeReview] Created mock edges:', mockEdges.length);

      console.log('🔧 [handleCodeReview] Creating Terraform generator...');
      const generator = new TerraformGenerator(
        currentProject?.provider || "aws",
        mockNodes,
        mockEdges
      );

      console.log('📝 [handleCodeReview] Generating Terraform code...');
      const terraformCode = generator.generateTerraformCode();
      console.log('✅ [handleCodeReview] Generated main.tf:', terraformCode?.length || 0, 'characters');
      
      // Generate all Terraform files (matching infrastructure-canvas.tsx)
      const output = generator.generate();
      
      // Generate variables.tf
      let variablesTf = "# Variables for your infrastructure\n";
      if (Object.keys(output.variables).length > 0) {
        Object.entries(output.variables).forEach(([name, config]) => {
          variablesTf += `variable "${name}" {\n`;
          Object.entries(config as Record<string, any>).forEach(([key, value]) => {
            if (typeof value === "string") {
              variablesTf += `  ${key} = "${value}"\n`;
            } else {
              variablesTf += `  ${key} = ${JSON.stringify(value)}\n`;
            }
          });
          variablesTf += "}\n\n";
        });
      } else {
        variablesTf += `variable "region" {
  description = "Cloud region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}
`;
      }
      
      // Generate outputs.tf
      let outputsTf = "# Outputs for your infrastructure\n";
      if (Object.keys(output.outputs).length > 0) {
        Object.entries(output.outputs).forEach(([name, config]) => {
          outputsTf += `output "${name}" {\n`;
          Object.entries(config as Record<string, any>).forEach(([key, value]) => {
            if (typeof value === "string") {
              outputsTf += `  ${key} = "${value}"\n`;
            } else {
              outputsTf += `  ${key} = ${JSON.stringify(value)}\n`;
            }
          });
          outputsTf += "}\n\n";
        });
      } else {
        outputsTf += `output "resources_created" {
  description = "Number of resources created"
  value       = ${mockNodes.length}
}
`;
      }
      
      // Generate providers.tf
      const providersTf = generator.generateProviderBlock();
      
      // Create files object for API (all 4 files)
      const terraformFiles = {
        "main.tf": terraformCode,
        "variables.tf": variablesTf,
        "outputs.tf": outputsTf,
        "providers.tf": providersTf
      };
      console.log('📦 [handleCodeReview] Prepared files:', Object.keys(terraformFiles));
      
      // Call the AI review API
      console.log('🌐 [handleCodeReview] Calling /api/ai-review...');
      const response = await fetch('/api/ai-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          terraformFiles,
          provider: currentProject?.provider || "aws"
        }),
      });

      console.log('📥 [handleCodeReview] Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [handleCodeReview] API error response:', errorText);
        throw new Error(`AI review request failed: ${response.status} - ${errorText}`);
      }

      console.log('🔍 [handleCodeReview] Parsing response...');
      const analysis = await response.json();
      console.log('✅ [handleCodeReview] Analysis received:', {
        hasAnalysis: !!analysis,
        score: analysis?.overallScore,
        issueCount: analysis?.issues?.length,
        type: typeof analysis
      });
      
      setAiReviewAnalysis(analysis);
      console.log('🎉 [handleCodeReview] Review complete!');
    } catch (error) {
      console.error('❌ [handleCodeReview] Code review error:', error);
      console.error('❌ [handleCodeReview] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      setAiReviewError(error instanceof Error ? error.message : 'Failed to review code');
    } finally {
      setIsAIReviewLoading(false);
      console.log('🏁 [handleCodeReview] Finished (loading=false)');
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
            onDeploy={handleDeploy}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onCodeReview={handleCodeReview}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
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
            <h3 className="font-semibold">AI Code Review Assistant</h3>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowAIChat(false)}
            >
              ×
            </Button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="text-muted-foreground">
                  Hello! I'm your AI assistant. I can help you review your
                  infrastructure code, suggest improvements, and answer
                  questions about best practices.
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-border">
            <input
              type="text"
              placeholder="Ask about your infrastructure..."
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
            />
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
      <AIReviewDialog
        isOpen={showAIReview}
        onClose={() => setShowAIReview(false)}
        analysis={aiReviewAnalysis}
        isLoading={isAIReviewLoading}
        error={aiReviewError}
      />
    </div>
  );
}
