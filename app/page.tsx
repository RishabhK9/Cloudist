"use client";

import { useState, useCallback, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { ReactFlowProvider } from "@xyflow/react";
import { ComponentPalette } from "@/components/component-palette";
import { Canvas } from "@/components/canvas";
import { PropertiesPanel } from "@/components/properties-panel";
import { Toolbar } from "@/components/toolbar";
import { SettingsDialog } from "@/components/settings-dialog";
import { Button } from "@/components/ui/button";
import { CredentialManager } from "@/lib/credential-manager";
import type { Block, Connection } from "@/types/infrastructure";

interface HistoryState {
  blocks: Block[];
  connections: Connection[];
}

export default function InfrastructureBuilder() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryState[]>([
    { blocks: [], connections: [] },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Load saved canvas state on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem("infrastructure-canvas-state");
      if (savedState) {
        const parsed = JSON.parse(savedState);
        setBlocks(parsed.blocks || []);
        setConnections(parsed.connections || []);
        setHistory([{ blocks: parsed.blocks || [], connections: parsed.connections || [] }]);
        console.log("✅ Canvas state loaded from localStorage");
      }
    } catch (error) {
      console.error("Failed to load canvas state:", error);
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

  const handleNewProject = () => {
    if (
      confirm(
        "Start a new project? This will clear all blocks and connections."
      )
    ) {
      setBlocks([]);
      setConnections([]);
      setSelectedBlockId(null);
      setZoom(1);
      setHistory([{ blocks: [], connections: [] }]);
      setHistoryIndex(0);
    }
  };

  const handleSave = () => {
    try {
      const canvasState = {
        blocks,
        connections,
        lastSaved: new Date().toISOString(),
      };
      localStorage.setItem("infrastructure-canvas-state", JSON.stringify(canvasState));
      console.log("✅ Canvas state saved successfully");
      
      // Show a brief save confirmation (you could add a toast notification here)
      alert("Canvas saved successfully!");
    } catch (error) {
      console.error("Failed to save canvas state:", error);
      alert("Failed to save canvas state. Please try again.");
    }
  };

  const handleDeploy = () => {
    // Clear previous error
    setDeploymentError(null);

    // Check if there are any blocks to deploy
    if (blocks.length === 0) {
      setDeploymentError("No infrastructure defined. Please add some services to deploy.");
      return;
    }

    // Check if AWS credentials are configured
    if (!CredentialManager.hasCredentials('aws')) {
      setDeploymentError("No AWS credentials configured. Please configure credentials in settings.");
      return;
    }

    // If credentials are configured, proceed with deployment
    alert("Deployment would start here! AWS credentials are configured.");
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <ComponentPalette onAddBlock={handleAddBlock} />

      <div className="flex-1 flex flex-col">
        <Toolbar
          onNewProject={handleNewProject}
          onSave={handleSave}
          onDeploy={handleDeploy}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onOpenSettings={() => setShowSettings(true)}
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
            onZoomChange={setZoom}
          />
        </ReactFlowProvider>
      </div>

      <PropertiesPanel
        block={selectedBlock}
        blocks={blocks}
        connections={connections}
        onUpdateBlock={handleUpdateBlock}
        onDeleteBlock={handleDeleteBlock}
      />

      {/* Deployment Error Notification */}
      {deploymentError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 w-96 bg-destructive/10 border border-destructive/50 rounded-lg shadow-lg z-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="font-semibold text-destructive mb-1">Deployment Error:</div>
              <div className="text-sm text-destructive/90">{deploymentError}</div>
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

      {/* Settings Dialog */}
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </div>
  );
}
