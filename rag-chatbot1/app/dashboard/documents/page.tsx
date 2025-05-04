"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard/layout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  FileText,
  FileIcon as FilePdf,
  FileJson,
  FileType,
  Download,
  Calendar,
  Eye,
  Loader2,
  SortAsc,
  SortDesc,
  FileIcon,
  Trash2,
  AlertTriangle,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface DocumentData {
  filename: string
  file_data: string
  timestamp: string
  file_type?: string
  file_size?: number
}

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
}

export default function DocumentsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [documents, setDocuments] = useState<DocumentData[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentData[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedFileContent, setSelectedFileContent] = useState<string>("")
  const [selectedFileName, setSelectedFileName] = useState<string>("")
  const [selectedFileData, setSelectedFileData] = useState<string>("")
  const [selectedFileType, setSelectedFileType] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [activeTab, setActiveTab] = useState("all")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        setIsLoading(true)
        const res = await fetch("/api/me")
        if (!res.ok) {
          console.warn("Utilisateur non authentifié")
          router.push("/login")
          return
        }

        const data = await res.json()
        const userId = data.user?.id
        const firstName = data.user?.firstName || "John"
        const lastName = data.user?.lastName || "Doe"
        const email = data.user?.email || "example@mail.com"

        if (userId) {
          setUserId(userId)
          setUser({ id: userId, firstName, lastName, email })

          const docsRes = await fetch(`http://127.0.0.1:8000/documents/?user_id=${userId}`)
          if (docsRes.ok) {
            const docsData = await docsRes.json()
            // Enrichir les données avec le type de fichier
            const enrichedDocs = docsData.documents.map((doc: DocumentData) => ({
              ...doc,
              file_type: getFileType(doc.filename),
              file_size: calculateFileSize(doc.file_data),
            }))
            setDocuments(enrichedDocs)
            setFilteredDocuments(enrichedDocs)
          }
        }
      } catch (error) {
        console.error("Erreur lors de la récupération du user_id ou des documents :", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserId()
  }, [router])

  useEffect(() => {
    // Filtrer les documents en fonction de la recherche et de l'onglet actif
    let filtered = documents

    // Filtrer par recherche
    if (searchQuery) {
      filtered = filtered.filter((doc) => doc.filename.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    // Filtrer par type
    if (activeTab !== "all") {
      filtered = filtered.filter((doc) => doc.file_type === activeTab)
    }

    // Trier par date
    filtered = [...filtered].sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime()
      const dateB = new Date(b.timestamp).getTime()
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA
    })

    setFilteredDocuments(filtered)
  }, [searchQuery, documents, activeTab, sortOrder])

  const getFileType = (filename: string): string => {
    const extension = filename.split(".").pop()?.toLowerCase() || ""

    if (["pdf"].includes(extension)) return "pdf"
    if (["txt"].includes(extension)) return "txt"
    if (["json"].includes(extension)) return "json"
    if (["doc", "docx", "rtf"].includes(extension)) return "document"

    return "other"
  }

  const calculateFileSize = (fileData: string): number => {
    // Base64 string length * 0.75 gives approximate size in bytes
    return Math.round((fileData.length * 0.75) / 1024) // Size in KB
  }

  const formatFileSize = (sizeInKB: number): string => {
    if (sizeInKB < 1024) {
      return `${sizeInKB} KB`
    } else {
      return `${(sizeInKB / 1024).toFixed(2)} MB`
    }
  }

  const handlePreviewFile = (fileData: string, filename: string, fileType: string) => {
    setSelectedFileName(filename)
    setSelectedFileData(fileData)
    setSelectedFileType(fileType)

    // Pour les fichiers texte, essayer de décoder le contenu
    if (fileType === "txt" || fileType === "json") {
      try {
        const decodedContent = atob(fileData)
        setSelectedFileContent(decodedContent)
      } catch (error) {
        console.error("Erreur lors du décodage du fichier:", error)
        setSelectedFileContent("Impossible de décoder le contenu du fichier.")
      }
    } else {
      // Pour les autres types, ne pas essayer de décoder
      setSelectedFileContent("")
    }

    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedFileContent("")
    setSelectedFileName("")
    setSelectedFileData("")
    setSelectedFileType("")
  }

  const handleDeleteClick = (filename: string) => {
    setDocumentToDelete(filename)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!documentToDelete || !userId) return

    setIsDeleting(true)
    try {
      // Modifier cette URL pour pointer vers votre nouveau backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/delete/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          filename: documentToDelete,
        }),
      })

      if (response.ok) {
        // Mettre à jour la liste des documents
        setDocuments((prev) => prev.filter((doc) => doc.filename !== documentToDelete))

        toast({
          title: "Document supprimé",
          description: `Le document "${documentToDelete}" a été supprimé avec succès.`,
        })
      } else {
        throw new Error("Erreur lors de la suppression")
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du document:", error)
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le document. Veuillez réessayer.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
      setDocumentToDelete(null)
    }
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "pdf":
        return <FilePdf className="h-8 w-8 text-red-500" />
      case "txt":
        return <FileType className="h-8 w-8 text-purple-500" />
      case "document":
        return <FileText className="h-8 w-8 text-blue-500" />
      case "json":
        return <FileJson className="h-8 w-8 text-green-500" />
      default:
        return <FileIcon className="h-8 w-8 text-gray-500" />
    }
  }

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
  }

  // Fonction pour rendre le contenu du fichier en fonction de son type
  const renderFilePreview = () => {
    if (selectedFileType === "pdf") {
      // Pour les PDF, utiliser un objet embed ou iframe
      const pdfDataUri = `data:application/pdf;base64,${selectedFileData}`
      return (
        <div className="h-[70vh] w-full">
          <object data={pdfDataUri} type="application/pdf" className="h-full w-full rounded border border-slate-200">
            <p>
              Votre navigateur ne peut pas afficher les PDF.{" "}
              <a href={pdfDataUri} download={selectedFileName} className="text-blue-500 hover:underline">
                Télécharger le PDF
              </a>
            </p>
          </object>
        </div>
      )
    } else if (selectedFileType === "json") {
      // Pour les JSON, essayer de formater joliment
      try {
        const jsonContent = JSON.parse(selectedFileContent)
        return (
          <pre className="max-h-[70vh] overflow-auto rounded border border-slate-200 bg-slate-50 p-4 font-mono text-sm">
            {JSON.stringify(jsonContent, null, 2)}
          </pre>
        )
      } catch (e) {
        // Si le parsing échoue, afficher le contenu brut
        return (
          <pre className="max-h-[70vh] overflow-auto rounded border border-slate-200 bg-slate-50 p-4 font-mono text-sm">
            {selectedFileContent}
          </pre>
        )
      }
    } else if (selectedFileType === "txt") {
      // Pour les fichiers texte, afficher simplement le contenu
      return (
        <pre className="max-h-[70vh] overflow-auto rounded border border-slate-200 bg-slate-50 p-4 font-mono text-sm whitespace-pre-wrap">
          {selectedFileContent}
        </pre>
      )
    } else {
      // Pour les autres types, afficher un message
      return (
        <div className="flex h-[50vh] items-center justify-center rounded border border-slate-200 bg-slate-50 p-4">
          <div className="text-center">
            <FileIcon className="mx-auto mb-4 h-16 w-16 text-slate-400" />
            <p className="text-lg font-medium text-slate-700">Aperçu non disponible</p>
            <p className="mt-2 text-slate-500">Ce type de fichier ne peut pas être prévisualisé.</p>
            <a
              href={`data:application/octet-stream;base64,${selectedFileData}`}
              download={selectedFileName}
              className="mt-4 inline-block rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Télécharger le fichier
            </a>
          </div>
        </div>
      )
    }
  }

  if (!user && isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
        <span className="ml-2 text-lg font-medium">Chargement...</span>
      </div>
    )
  }

  return (
    <DashboardLayout user={user!}>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8 flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Mes Documents</h1>
            <p className="mt-1 text-slate-500">Consultez tous vos documents disponibles</p>
          </div>

          <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Rechercher un document..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleSortOrder}
              title={sortOrder === "asc" ? "Plus récent en premier" : "Plus ancien en premier"}
            >
              {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <div className="mb-6 flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all" className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>Tous</span>
                <Badge variant="outline" className="ml-1">
                  {documents.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="document" className="flex items-center gap-1">
                <FileText className="h-4 w-4 text-blue-500" />
                <span>Documents</span>
              </TabsTrigger>
              <TabsTrigger value="pdf" className="flex items-center gap-1">
                <FilePdf className="h-4 w-4 text-red-500" />
                <span>PDF</span>
              </TabsTrigger>
              <TabsTrigger value="txt" className="flex items-center gap-1">
                <FileType className="h-4 w-4 text-purple-500" />
                <span>TXT</span>
              </TabsTrigger>
              <TabsTrigger value="json" className="flex items-center gap-1">
                <FileJson className="h-4 w-4 text-green-500" />
                <span>JSON</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="mt-0">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <FileText className="h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-lg font-medium text-slate-700">Aucun document trouvé</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {searchQuery
                    ? "Aucun document ne correspond à votre recherche"
                    : "Aucun document n'est disponible pour le moment"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredDocuments.map((doc, index) => (
                  <div
                    key={index}
                    className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex h-32 items-center justify-center bg-slate-50 p-4">
                      {getFileIcon(doc.file_type || "other")}
                    </div>
                    <div className="p-4">
                      <h3 className="mb-1 truncate font-medium text-slate-800" title={doc.filename}>
                        {doc.filename}
                      </h3>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center">
                          <Calendar className="mr-1 h-3 w-3" />
                          {new Date(doc.timestamp).toLocaleDateString()}
                        </div>
                        <div>{doc.file_size ? formatFileSize(doc.file_size) : "N/A"}</div>
                      </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex h-7 items-center gap-1 px-2 text-xs"
                          onClick={() => handlePreviewFile(doc.file_data, doc.filename, doc.file_type || "other")}
                        >
                          <Eye className="h-3 w-3" />
                          Aperçu
                        </Button>
                        <a href={`data:application/octet-stream;base64,${doc.file_data}`} download={doc.filename}>
                          <Button size="sm" variant="default" className="flex h-7 items-center gap-1 px-2 text-xs">
                            <Download className="h-3 w-3" />
                            Télécharger
                          </Button>
                        </a>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex h-7 w-7 items-center justify-center p-0"
                          onClick={() => handleDeleteClick(doc.filename)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal d'aperçu de fichier */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <span className="mr-2">Aperçu de {selectedFileName}</span>
            </DialogTitle>
            <DialogDescription>Prévisualisation du contenu du fichier</DialogDescription>
          </DialogHeader>

          {renderFilePreview()}

          <div className="mt-4 flex justify-end">
            <a
              href={`data:application/octet-stream;base64,${selectedFileData}`}
              download={selectedFileName}
              className="mr-2"
            >
              <Button variant="outline" className="flex items-center gap-1">
                <Download className="h-4 w-4" />
                Télécharger
              </Button>
            </a>
            <Button onClick={closeModal}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogue de confirmation de suppression */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement ce document ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm font-medium text-slate-700">
              Document à supprimer : <span className="font-bold">{documentToDelete}</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="flex items-center gap-1"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Supprimer définitivement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}


