"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Folder, Search, Calendar, Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export interface Project {
  id: string
  name: string
  description: string
  createdAt: string
  lastModified: string
  blocks: any[]
  connections: any[]
}

interface OpenProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projects: Project[]
  currentProjectId: string | null
  onOpenProject: (project: Project) => void
  onDeleteProject: (projectId: string) => void
}

export function OpenProjectDialog({
  open,
  onOpenChange,
  projects,
  currentProjectId,
  onOpenProject,
  onDeleteProject,
}: OpenProjectDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpenProject = (project: Project) => {
    onOpenProject(project)
    onOpenChange(false)
  }

  const handleDeleteProject = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation()
    if (confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      onDeleteProject(projectId)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Open Project</DialogTitle>
          <DialogDescription>
            Select a project to open and continue working on it.
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Projects List */}
        <ScrollArea className="h-[400px] pr-4">
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Folder className="w-12 h-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No projects found matching your search." : "No projects yet. Create your first project to get started!"}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredProjects.map((project) => (
                <Card
                  key={project.id}
                  className={`cursor-pointer transition-all hover:shadow-md hover:border-purple-300 ${
                    project.id === currentProjectId ? "border-purple-500 bg-purple-50/50" : ""
                  }`}
                  onClick={() => handleOpenProject(project)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {project.name}
                          {project.id === currentProjectId && (
                            <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          )}
                        </CardTitle>
                        {project.description && (
                          <CardDescription className="mt-1 text-sm">
                            {project.description}
                          </CardDescription>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-red-100 hover:text-red-600 -mr-2"
                        onClick={(e) => handleDeleteProject(e, project.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {project.lastModified === "Just now"
                            ? "Just now"
                            : formatDistanceToNow(new Date(project.lastModified), { addSuffix: true })}
                        </span>
                      </div>
                      <div>
                        {project.blocks?.length || 0} blocks, {project.connections?.length || 0} connections
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

