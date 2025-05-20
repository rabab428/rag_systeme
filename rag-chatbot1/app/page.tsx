import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"
import Link from "next/link"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function Home() {
  const session = await getSession()

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="container mx-auto py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-slate-800" />
            <span className="text-xl font-bold text-slate-800">RAGBot</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Se connecter</Button>
            </Link>
            <Link href="/signup">
              <Button>S'inscrire</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <div className="max-w-3xl">
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
            Bienvenue sur votre assistant RAG intelligent
          </h1>
          <p className="mb-10 text-xl text-slate-600">
            Posez vos questions et obtenez des réponses précises grâce à notre système de Retrieval-Augmented
            Generation. Notre chatbot analyse vos documents et vous fournit des informations pertinentes.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button size="lg" className="px-8">
                Commencer
              </Button>
            </Link>
            <Link href="/about">
              <Button size="lg" variant="outline" className="px-8">
                En savoir plus
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <footer className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row">
          <p>© 2025 RAGBot. Tous droits réservés.</p>
         
        </div>
      </footer>
    </div>
  )
}
