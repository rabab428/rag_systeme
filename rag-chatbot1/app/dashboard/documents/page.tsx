"use client"

import { useEffect, useState } from "react"
import { redirect } from "next/navigation"
import DashboardLayout from "@/components/dashboard/layout"

interface DocumentData {
  filename: string
  file_data: string // Lien ou données du fichier
  timestamp: string
}

export default function DocumentsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string, firstName: string, lastName: string, email: string } | null>(null)
  const [documents, setDocuments] = useState<DocumentData[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedFileContent, setSelectedFileContent] = useState<string>("")

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const res = await fetch("/api/me")
        if (!res.ok) {
          console.warn("Utilisateur non authentifié")
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
            setDocuments(docsData.documents)
          }
        }
      } catch (error) {
        console.error("Erreur lors de la récupération du user_id ou des documents :", error)
      }
    }

    fetchUserId()
  }, [])

  const handlePreviewFile = (fileData: string) => {
    const decodedContent = atob(fileData)
    setSelectedFileContent(decodedContent)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedFileContent("")
  }

  if (!user) {
    return <div>Chargement...</div>
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-semibold text-gray-800 mb-6">
          📁 Mes documents
        </h1>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-medium text-gray-700 mb-4">
            Liste des fichiers
          </h2>

          {documents.length === 0 ? (
            <p className="text-gray-500">Aucun document trouvé.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead className="text-sm text-gray-600 uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-2 bg-gray-50 rounded-tl-lg">Nom du fichier</th>
                    <th className="text-left px-4 py-2 bg-gray-50">Télécharger</th>
                    <th className="text-left px-4 py-2 bg-gray-50 rounded-tr-lg">Date d'upload</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 text-sm">
                  {documents.map((doc, index) => (
                    <tr key={index} className="bg-gray-50 hover:bg-gray-100 transition-all duration-200">
                      <td className="px-4 py-3 rounded-l-lg">{doc.filename}</td>
                      <td className="px-4 py-3">
                        <a
                          href={`data:application/octet-stream;base64,${doc.file_data}`}
                          download={doc.filename}
                          className="text-blue-600 hover:underline"
                        >
                          Télécharger
                        </a>
                      </td>
                      <td className="px-4 py-3 rounded-r-lg">{new Date(doc.timestamp).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-1/2">
            <h3 className="text-xl font-semibold mb-4">Aperçu du fichier</h3>
            <div
              className="max-h-96 overflow-y-auto whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: selectedFileContent }}
            />
            <div className="mt-4 text-right">
              <button onClick={closeModal} className="bg-blue-500 text-white px-4 py-2 rounded">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}