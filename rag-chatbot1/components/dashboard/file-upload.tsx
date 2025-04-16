"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, File, X, Check, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  progress: number
  status: "uploading" | "complete" | "error"
  error?: string
}

export default function FileUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const newFiles: UploadedFile[] = Array.from(selectedFiles).map((file) => ({
      id: Math.random().toString(36).substring(2, 15),
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: "uploading",
    }))

    setFiles((prev) => [...prev, ...newFiles])

    // Simulate file upload for each file
    newFiles.forEach((newFile) => {
      simulateFileUpload(newFile.id)
    })
  }

  const simulateFileUpload = (fileId: string) => {
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 10
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        setFiles((prev) =>
          prev.map((file) =>
            file.id === fileId
              ? {
                  ...file,
                  progress: 100,
                  status: Math.random() > 0.9 ? "error" : "complete",
                  error: Math.random() > 0.9 ? "Erreur lors du traitement du fichier" : undefined,
                }
              : file,
          ),
        )
      } else {
        setFiles((prev) => prev.map((file) => (file.id === fileId ? { ...file, progress } : file)))
      }
    }, 300)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileChange(e.dataTransfer.files)
  }

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== fileId))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Téléchargement de documents</h2>
        <p className="text-sm text-slate-500">
          Téléchargez vos documents pour permettre au chatbot de les utiliser comme source d'information.
        </p>
      </div>

      {/* Upload area */}
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 transition-colors",
          isDragging && "border-blue-500 bg-blue-50",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Upload className="h-6 w-6 text-slate-600" />
        </div>
        <p className="mb-2 text-sm font-medium">Glissez-déposez vos fichiers ici</p>
        <p className="mb-4 text-xs text-slate-500">ou</p>
        <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="mb-2">
          Sélectionner des fichiers
        </Button>
        <p className="text-xs text-slate-500">Formats supportés: PDF, DOCX, TXT, CSV, XLSX (max 10MB)</p>
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileChange(e.target.files)}
          className="hidden"
          multiple
          accept=".pdf,.docx,.txt,.csv,.xlsx"
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-medium">Fichiers ({files.length})</h3>
          <div className="space-y-3">
            {files.map((file) => (
              <div key={file.id} className="flex items-center rounded-lg border border-slate-200 bg-white p-3">
                <div className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-100">
                  <File className="h-5 w-5 text-slate-600" />
                </div>
                <div className="mr-auto min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                  {file.status === "uploading" && <Progress value={file.progress} className="mt-1 h-1" />}
                  {file.status === "error" && (
                    <p className="mt-1 flex items-center text-xs text-red-500">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      {file.error}
                    </p>
                  )}
                </div>
                {file.status === "complete" ? (
                  <div className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                ) : (
                  <Button variant="ghost" size="icon" className="ml-2 h-6 w-6" onClick={() => removeFile(file.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
