"use client"

import { InfrastructureBuilder } from "@/components/infrastructure-builder"
import { useRouter } from "next/navigation"

export default function EditorPage() {
  const router = useRouter()
  
  const handleBackToHome = () => {
    router.push("/")
  }
  
  return <InfrastructureBuilder onBackToHome={handleBackToHome} />
}

