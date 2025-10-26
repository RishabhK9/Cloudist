"use client"

import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CreateNewProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateProject: (name: string, description: string, provider: "aws" | "gcp" | "azure") => void
}

export function CreateNewProjectDialog({
  open,
  onOpenChange,
  onCreateProject,
}: CreateNewProjectDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [provider, setProvider] = useState<"aws" | "gcp" | "azure">("aws")
  const [error, setError] = useState("")

  const handleCreate = () => {
    if (!name.trim()) {
      setError("Project name is required")
      return
    }

    onCreateProject(name.trim(), description.trim(), provider)
    setName("")
    setDescription("")
    setProvider("aws")
    setError("")
    onOpenChange(false)
  }

  const handleCancel = () => {
    setName("")
    setDescription("")
    setProvider("aws")
    setError("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Start a new infrastructure project. Give it a name and description to get started.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name *</Label>
            <Input
              id="project-name"
              placeholder="My Infrastructure Project"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError("")
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) {
                  handleCreate()
                }
              }}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">Description (Optional)</Label>
            <Textarea
              id="project-description"
              placeholder="Describe what this project is for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider">Cloud Provider</Label>
            <Select value={provider} onValueChange={(value) => setProvider(value as "aws" | "gcp" | "azure")}>
              <SelectTrigger id="provider">
                <SelectValue>
                  {provider === "aws" && (
                    <div className="flex items-center gap-2">
                      <img src="/aws/aws.svg" alt="AWS" className="w-4 h-4 object-contain" />
                      <span>Amazon Web Services (AWS)</span>
                    </div>
                  )}
                  {provider === "gcp" && (
                    <div className="flex items-center gap-2">
                      <span>🌩️</span>
                      <span>Google Cloud Platform (GCP)</span>
                    </div>
                  )}
                  {provider === "azure" && (
                    <div className="flex items-center gap-2">
                      <span>☁️</span>
                      <span>Microsoft Azure</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aws">
                  <div className="flex items-center gap-2">
                    <img src="/aws/aws.svg" alt="AWS" className="w-4 h-4 object-contain" />
                    <span>Amazon Web Services (AWS)</span>
                  </div>
                </SelectItem>
                <SelectItem value="gcp">
                  <div className="flex items-center gap-2">
                    <span>🌩️</span>
                    <span>Google Cloud Platform (GCP)</span>
                  </div>
                </SelectItem>
                <SelectItem value="azure">
                  <div className="flex items-center gap-2">
                    <span>☁️</span>
                    <span>Microsoft Azure</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700">
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

