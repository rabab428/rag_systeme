"use client"

import { useState, useRef, useEffect } from "react"
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
  const [userId, setUserId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const res = await fetch("/api/me")
        if (!res.ok) return
        const data = await res.json()
        setUserId(data.user?.id || null)
      } catch (error) {
        console.error("Erreur lors de la récupération du user_id :", error)
      }
    }

    fetchUserId()
  }, [])

  const handleFileChange = (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return

    const file = selectedFiles[0]
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]

    if (!allowedTypes.includes(file.type)) {
      alert("❌ Format non supporté.")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("❌ Fichier trop volumineux (max 10MB).")
      return
    }

    const newFile: UploadedFile = {
      id: Math.random().toString(36).substring(2),
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: "uploading",
    }

    setFiles([newFile])
    uploadFile(file, newFile.id)
  }

  const uploadFile = async (file: File, fileId: string) => {
    if (!userId) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: "error", error: "Utilisateur non authentifié" }
            : f
        )
      )
      return
    }

    const formData = new FormData()
    formData.append("file", file)
    formData.append("user_id", userId)

    const simulateProgress = (percent: number) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, progress: percent } : f
        )
      )
    }

    try {
      simulateProgress(30)

      const response = await fetch("http://127.0.0.1:8000/upload_file/", {
        method: "POST",
        body: formData,
      })

      simulateProgress(100)

      if (!response.ok) throw new Error("Erreur serveur")

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: "complete" } : f
        )
      )
    } catch (error) {
      console.error("Upload error:", error)
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, progress: 100, status: "error", error: "Échec de l’envoi" }
            : f
        )
      )
    }
  }

  const removeFile = (fileId: string) => {
    setFiles([])
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i]
  }

  return (
    <div className="flex h-full flex-col p-4 md:p-6 lg:p-8 bg-white rounded-xl shadow-md">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">Téléversement de documents</h2>
        <p className="text-sm text-slate-500">
          Téléchargez un seul document à la fois. Le nouveau remplacera l'ancien.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-100 border border-slate-300">
        <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="mb-2 px-4">
          Choisir un fichier
        </Button>
        <p className="text-xs text-slate-500">Formats supportés : PDF, DOCX, TXT (max 10MB)</p>
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileChange(e.target.files)}
          className="hidden"
          accept=".pdf,.docx,.txt"
        />
      </div>

      {files.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Fichier en cours</h3>
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-200">
                <File className="h-5 w-5 text-slate-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
                <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                {file.status === "uploading" && (
                  <Progress value={file.progress} className="mt-1 h-2 rounded" />
                )}
                {file.status === "error" && (
                  <p className="mt-1 flex items-center text-xs text-red-600">
                    <AlertCircle className="mr-1 h-4 w-4" />
                    {file.error}
                  </p>
                )}
              </div>
              {file.status === "complete" ? (
                <div className="flex items-center justify-center h-7 w-7 rounded-full bg-green-100">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-500 hover:text-red-500"
                  onClick={() => removeFile(file.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
