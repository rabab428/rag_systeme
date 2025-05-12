"use client"

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
  Info,
  Trash2,
  RefreshCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  progress: number
  status: "uploading" | "complete" | "error"
  error?: string
}

// New interface to match the backend's response
interface FileInfo {
  filename: string
  size: string
}

export default function FileUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [serverFiles, setServerFiles] = useState<FileInfo[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const MAX_FILES = 3

  // Fetch user ID once on component mount
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const res = await fetch("/api/me")
        if (!res.ok) return
        const data = await res.json()
        setUserId(data.user?.id || "test-user") // Providing a default user ID for testing
      } catch (error) {
        console.error("Erreur user_id:", error)
        setUserId("test-user") // Fallback user ID for testing
      }
    }
    fetchUserId()
  }, [])

  // Fetch already uploaded files whenever userId changes
  useEffect(() => {
    if (userId) {
      fetchUploadedFiles()
    }
  }, [userId])

const fetchUploadedFiles = async () => {
  if (!userId) return

  setIsLoading(true)
  setErrorMessage("") // Reset l'erreur avant d'appeler
  try {
    const response = await fetch(`http://127.0.0.1:8000/get_uploaded_filenames/${userId}`)

    if (!response.ok) {
      if (response.status === 404) {
        setFiles([])
        setErrorMessage("Aucun fichier n’a été téléchargé.")
        return
      }
      throw new Error(`Erreur HTTP: ${response.status}`)
    }

    const data = await response.json()

    if (!data || data.length === 0) {
      setFiles([])
      setErrorMessage("Aucun fichier n’a été téléchargé.")
      return
    }

    setServerFiles(data)

    const convertedFiles: UploadedFile[] = data.map((file: FileInfo) => ({
      id: Math.random().toString(36).substring(2),
      name: file.filename,
      size: parseFileSize(file.size),
      type: getFileTypeFromName(file.filename),
      progress: 100,
      status: "complete"
    }))

    setFiles(convertedFiles)
  } catch (error) {
    console.error("Erreur lors de la récupération des fichiers:", error)
    setErrorMessage("Impossible de récupérer vos fichiers.")
  } finally {
    setIsLoading(false)
  }
}

  
  // Helper function to parse file size string back to number
  const parseFileSize = (sizeStr: string): number => {
    const [value, unit] = sizeStr.split(" ")
    const numValue = parseFloat(value)
    
    switch(unit) {
      case "B": return numValue
      case "KB": return numValue * 1024
      case "MB": return numValue * 1024 * 1024
      default: return 0
    }
  }
  
  // Helper function to determine file type from name
  const getFileTypeFromName = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase() || ""
    
    if (extension === "pdf") return "application/pdf"
    if (extension === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if (extension === "txt") return "text/plain"
    
    return "application/octet-stream"
  }

  const handleFileChange = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return
    if (files.length + selectedFiles.length > MAX_FILES) {
      setErrorMessage(`Maximum ${MAX_FILES} fichiers.`)
      return
    }
    setErrorMessage(null)
    setIsUploading(true)

    const uploadQueue = Array.from(selectedFiles)
    uploadQueue.forEach((file) => {
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ]
      if (!allowedTypes.includes(file.type)) {
        setErrorMessage("Formats autorisés : PDF, DOCX, TXT.")
        setIsUploading(false)
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage("Max 10MB par fichier.")
        setIsUploading(false)
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

      setFiles((prev) => [...prev, newFile])
      uploadFile(file, newFile.id)
    })
  }

  const uploadFile = async (file: File, fileId: string) => {
    if (!userId) {
      updateFileStatus(fileId, "error", "Utilisateur non authentifié")
      return
    }

    const formData = new FormData()
    formData.append("files", file) // Must match `files: List[UploadFile] = File(...)`
    formData.append("user_id", userId)

    const progressInterval = simulateProgress(fileId)

    try {
      const response = await fetch("http://127.0.0.1:8000/upload_files/", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) throw new Error("Échec de l'envoi")

      updateFileStatus(fileId, "complete")
      // Refresh the file list after successful upload
      fetchUploadedFiles()
    } catch (error) {
      console.error("Upload error:", error)
      updateFileStatus(fileId, "error", "Échec de l'envoi")
    } finally {
      setIsUploading(false)
    }
  }

  const simulateProgress = (fileId: string) => {
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 10) + 5
      if (progress >= 90) {
        clearInterval(interval)
        progress = 90
      }
      setFiles((prev) => {
        return prev.map((f) =>
          f.id === fileId ? { ...f, progress } : f
        )
      })
    }, 300)
    return interval
  }

  const updateFileStatus = (fileId: string, status: UploadedFile["status"], error?: string) => {
    setFiles((prev) => {
      return prev.map((f) =>
        f.id === fileId ? { ...f, progress: 100, status, error } : f
      )
    })
  }

const removeFile = async (fileId: string, filename: string) => {
  if (!userId) {
    setErrorMessage("Utilisateur non authentifié")
    return
  }

  try {
    const response = await fetch(
      `http://127.0.0.1:8000/delete_file_vector/?user_id=${encodeURIComponent(userId)}&filename=${encodeURIComponent(filename)}`,
      {
        method: "DELETE",
      }
    )

    if (!response.ok) {
      const data = await response.json()
      throw new Error(`Erreur lors de la suppression: ${data.detail || response.statusText}`)
    }

    setFiles((prev) => prev.filter((f) => f.id !== fileId))
    fetchUploadedFiles()
  } catch (error) {
    console.error("Delete error:", error)
    setErrorMessage(`Impossible de supprimer ${filename}`)
  }
}


  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) return <FilePdf className="h-6 w-6 text-red-500" />
    if (fileType.includes("document")) return <FileText className="h-6 w-6 text-blue-500" />
    if (fileType.includes("text")) return <FileType className="h-6 w-6 text-purple-500" />
    return <File className="h-6 w-6 text-slate-500" />
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i]
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileChange(e.dataTransfer.files)
  }

  return (
    <Card className="w-full shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-slate-800">Documents de référence</CardTitle>
            <CardDescription className="text-slate-500">
              Les documents seront utilisés comme source de connaissances pour le chatbot (max {MAX_FILES} fichiers)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={fetchUploadedFiles} 
              disabled={isLoading || !userId}
              title="Rafraîchir la liste"
            >
              <RefreshCcw className="h-4 w-4 text-slate-500" />
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Info className="h-5 w-5 text-slate-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Vous pouvez télécharger jusqu'à {MAX_FILES} documents. Le système utilisera automatiquement les documents les plus pertinents pour répondre à vos questions.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className={cn(
            "flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all",
            isDragging ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400",
            isUploading && "opacity-50 cursor-not-allowed",
            files.length >= MAX_FILES && "opacity-50 cursor-not-allowed"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-3">
              <Upload className="h-6 w-6 text-slate-600" />
            </div>
            <h3 className="mb-1 text-lg font-medium text-slate-700">Glissez-déposez vos fichiers ici</h3>
            <p className="mb-4 text-sm text-slate-500">ou</p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="default"
              className="mb-2"
              disabled={isUploading || files.length >= MAX_FILES}
            >
              Sélectionner des fichiers
            </Button>
            <p className="text-xs text-slate-500">Formats supportés : PDF, DOCX, TXT (max 10MB)</p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileChange(e.target.files)}
              className="hidden"
              accept=".pdf,.docx,.txt"
              disabled={isUploading || files.length >= MAX_FILES}
              multiple
            />
          </div>
        </div>

        {errorMessage && (
  <p style={{ color: "gray", fontStyle: "italic" }}>{errorMessage}</p>
)}



        {isLoading && (
          <div className="flex justify-center py-4">
            <p className="text-slate-500 flex items-center">
              <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
              Chargement des fichiers...
            </p>
          </div>
        )}

        {files.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">
              Documents actuels ({files.length}/{MAX_FILES})
            </h3>
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="relative overflow-hidden rounded-lg border bg-white shadow-sm transition-all"
                >
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-100">
                      {getFileIcon(file.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="truncate font-medium text-slate-900">{file.name}</h4>
                        <span className="ml-2 shrink-0 text-xs text-slate-500">{formatFileSize(file.size)}</span>
                      </div>
                      {file.status === "uploading" && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>Téléchargement en cours...</span>
                            <span>{file.progress}%</span>
                          </div>
                          <Progress value={file.progress} className="mt-1 h-1.5" />
                        </div>
                      )}
                      {file.status === "error" && (
                        <div className="mt-1 flex items-center text-sm text-red-600">
                          <AlertCircle className="mr-1 h-4 w-4" />
                          <span>{file.error || "Une erreur est survenue"}</span>
                        </div>
                      )}
                      {file.status === "complete" && (
                        <div className="mt-1 flex items-center text-sm text-green-600">
                          <Check className="mr-1 h-4 w-4" />
                          <span>Document prêt</span>
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-red-500"
                        onClick={() => removeFile(file.id, file.name)}
                        disabled={file.status === "uploading"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t bg-slate-50 px-6 py-4">
        <div className="flex items-center text-sm text-slate-600">
          <Info className="mr-2 h-4 w-4 text-slate-500" />
          <p>Les documents seront utilisés pour répondre aux questions. Le système choisira automatiquement les plus pertinents.</p>
        </div>
      </CardFooter>
    </Card>
  )
}


