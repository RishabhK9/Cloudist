"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FolderPlus, Loader2 } from "lucide-react"
import { useState } from "react"

interface Project {
  id: string
  name: string
  description?: string
  provider?: "aws" | "gcp" | "azure"
  architectures: number
  lastModified: string
  status: "active" | "archived"
  createdAt: string
}

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateProject: (project: Omit<Project, "id" | "lastModified" | "createdAt">) => void
}

export function CreateProjectDialog({ open, onOpenChange, onCreateProject }: CreateProjectDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) return

    setIsCreating(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const newProject = {
      name: name.trim(),
      description: description.trim() || undefined,
      architectures: 0,
      status: "active" as const,
    }

    onCreateProject(newProject)

    // Reset form
    setName("")
    setDescription("")
    setIsCreating(false)
    onOpenChange(false)
  }

  const handleCancel = () => {
    setName("")
    setDescription("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border shadow-lg">
        <DialogHeader className="pb-6">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <FolderPlus className="w-4 h-4 text-primary-foreground" />
            </div>
            Create New Project
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a new infrastructure project to start designing your cloud architecture.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            <div className="grid gap-3">
              <Label htmlFor="name" className="text-foreground font-medium">Project Name *</Label>
              <Input
                id="name"
                placeholder="Enter project name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isCreating}
                required
                className="bg-input text-foreground border-border focus:border-primary focus:ring-primary"
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="description" className="text-foreground font-medium">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of your project (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isCreating}
                rows={3}
                className="resize-none bg-input text-foreground border-border focus:border-primary focus:ring-primary"
              />
            </div>
          </div>
          <DialogFooter className="pt-6 border-t border-border">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel} 
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!name.trim() || isCreating}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
