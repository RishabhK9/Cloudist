"use client"

import { FolderOpen, Plus, Settings, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ProjectTitleBarProps {
  projectName: string
  onCreateProject: () => void
  onOpenProject: () => void
  onOpenSettings: () => void
  onEditProject: () => void
}

export function ProjectTitleBar({
  projectName,
  onCreateProject,
  onOpenProject,
  onOpenSettings,
  onEditProject,
}: ProjectTitleBarProps) {
  return (
    <div className="h-12 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4">
      {/* Left: Back Arrow + App Title */}
      <div className="flex items-center gap-2 w-[220px]">
        <Link href="/" title="Back to Home">
          <Button variant="ghost" size="sm" className="hover:bg-accent">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" title="Go to Home">
          <img src="/logo/image.png" alt="Cloudist" className="w-6 h-6 object-contain" />
          <span className="text-lg font-bold text-foreground">Cloudist</span>
        </Link>
      </div>

      {/* Center: Project Name (Clickable to Edit) - Shifted Right */}
      <div className="flex-1 flex items-center justify-center ml-12">
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 hover:bg-accent font-semibold text-base"
          onClick={onEditProject}
          title="Click to edit project"
        >
          <span className="text-foreground">{projectName}</span>
        </Button>
      </div>

      {/* Right: Quick Actions */}
      <div className="flex items-center gap-2 w-[250px] justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateProject}
          className="hover:bg-accent"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenProject}
          className="hover:bg-accent"
        >
          <FolderOpen className="w-4 h-4 mr-2" />
          Open Project
        </Button>
        <div className="h-4 w-px bg-border mx-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenSettings}
          className="hover:bg-accent"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

