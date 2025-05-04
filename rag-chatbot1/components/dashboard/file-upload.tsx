"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Upload,
  File,
  Check,
  AlertCircle,
  FileText,
  FileIcon as FilePdf,
  FileType,
  RefreshCw,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fonction pour charger le fichier depuis localStorage
  const loadFileFromLocalStorage = () => {
    const storedFileName = localStorage.getItem("File")
    const storedFileSize = localStorage.getItem("FileSize")
    const storedFileType = localStorage.getItem("FileType") || ""

    if (storedFileName && storedFileSize) {
      setFiles([
        {
          id: "local",
          name: storedFileName,
          size: Number(storedFileSize),
          type: storedFileType,
          progress: 100,
          status: "complete",
        },
      ])
    }
  }

  // Charger au démarrage
  useEffect(() => {
    loadFileFromLocalStorage()
  }, [])

  // Charger aussi si la page revient sur ce composant
  useEffect(() => {
    window.addEventListener("storage", loadFileFromLocalStorage)
    return () => {
      window.removeEventListener("storage", loadFileFromLocalStorage)
    }
  }, [])

  // Récupérer user ID
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

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) {
      return <FilePdf className="h-6 w-6 text-red-500" />
    } else if (fileType.includes("document")) {
      return <FileText className="h-6 w-6 text-blue-500" />
    } else if (fileType.includes("text")) {
      return <FileType className="h-6 w-6 text-purple-500" />
    } else {
      return <File className="h-6 w-6 text-slate-500" />
    }
  }

  const handleFileChange = (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return

    const file = selectedFiles[0]
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ]

    if (!allowedTypes.includes(file.type)) {
      setErrorMessage("Format non supporté. Seuls PDF, DOCX et TXT sont autorisés.")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("Fichier trop volumineux (max 10MB).")
      return
    }

    setErrorMessage(null)
    setIsUploading(true)

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
        prev.map((f) => (f.id === fileId ? { ...f, status: "error", error: "Utilisateur non authentifié" } : f)),
      )
      setIsUploading(false)
      return
    }

    const formData = new FormData()
    formData.append("file", file)
    formData.append("user_id", userId)

    // Simuler une progression plus réaliste
    const simulateProgress = () => {
      let progress = 0
      const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 10) + 1
        if (progress >= 90) {
          clearInterval(interval)
          progress = 90
        }
        setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, progress } : f)))
      }, 300)
      return interval
    }

    const progressInterval = simulateProgress()

    try {
      const response = await fetch("http://127.0.0.1:8000/upload_file/", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) throw new Error("Erreur serveur")

      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, progress: 100, status: "complete" } : f)))

      // Sauvegarder dans localStorage
      localStorage.setItem("File", file.name)
      localStorage.setItem("FileSize", file.size.toString())
      localStorage.setItem("FileType", file.type)
    } catch (error) {
      console.error("Upload error:", error)
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, progress: 100, status: "error", error: "Échec de l'envoi" } : f)),
      )
    } finally {
      setIsUploading(false)
    }
  }

  // Fonction supprimée car non utilisée
  // const removeFile = () => {
  //   setFiles([])
  //   localStorage.removeItem("File")
  //   localStorage.removeItem("FileSize")
  //   localStorage.removeItem("FileType")
  // }

  const formatFileSize = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i]
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files)
    }
  }

  return (
    <Card className="w-full shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-slate-800">Document de référence</CardTitle>
            <CardDescription className="text-slate-500">
              Le document sera utilisé comme source de connaissances pour le chatbot
            </CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Info className="h-5 w-5 text-slate-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Un seul document peut être utilisé à la fois. Le nouveau document remplacera l'ancien.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Zone de glisser-déposer */}
        <div
          className={cn(
            "flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all",
            isDragging
              ? "border-blue-400 bg-blue-50"
              : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400",
            isUploading && "opacity-50 cursor-not-allowed",
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-3">
              <Upload className="h-6 w-6 text-slate-600" />
            </div>
            <h3 className="mb-1 text-lg font-medium text-slate-700">Glissez-déposez votre fichier ici</h3>
            <p className="mb-4 text-sm text-slate-500">ou</p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="default"
              className="mb-2"
              disabled={isUploading}
            >
              Sélectionner un fichier
            </Button>
            <p className="text-xs text-slate-500">Formats supportés : PDF, DOCX, TXT (max 10MB)</p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileChange(e.target.files)}
              className="hidden"
              accept=".pdf,.docx,.txt"
              disabled={isUploading}
            />
          </div>
        </div>

        {/* Message d'erreur */}
        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Affichage des fichiers */}
        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Document actuel</h3>
              <Badge variant={files[0].status === "complete" ? "success" : "default"}>
                {files[0].status === "uploading"
                  ? "Téléchargement..."
                  : files[0].status === "complete"
                    ? "Prêt à utiliser"
                    : "Erreur"}
              </Badge>
            </div>

            <div className="relative overflow-hidden rounded-lg border bg-white shadow-sm">
              <div className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-100">
                  {getFileIcon(files[0].type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="truncate font-medium text-slate-900">{files[0].name}</h4>
                    <span className="ml-2 shrink-0 text-xs text-slate-500">{formatFileSize(files[0].size)}</span>
                  </div>

                  {files[0].status === "uploading" && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Téléchargement en cours...</span>
                        <span>{files[0].progress}%</span>
                      </div>
                      <Progress value={files[0].progress} className="mt-1 h-1.5" />
                    </div>
                  )}

                  {files[0].status === "error" && (
                    <div className="mt-1 flex items-center text-sm text-red-600">
                      <AlertCircle className="mr-1 h-4 w-4" />
                      <span>{files[0].error || "Une erreur est survenue"}</span>
                    </div>
                  )}

                  {files[0].status === "complete" && (
                    <div className="mt-1 flex items-center text-sm text-green-600">
                      <Check className="mr-1 h-4 w-4" />
                      <span>Document prêt à être utilisé par le chatbot</span>
                    </div>
                  )}
                </div>
              </div>

              {files[0].status === "complete" && (
                <div className="flex items-center justify-end gap-2 border-t bg-slate-50 px-4 py-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Remplacer</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="border-t bg-slate-50 px-6 py-4">
        <div className="flex items-center text-sm text-slate-600">
          <Info className="mr-2 h-4 w-4 text-slate-500" />
          <p>Le document téléchargé sera utilisé comme source de connaissances pour répondre aux questions.</p>
        </div>
      </CardFooter>
    </Card>
  )
}
