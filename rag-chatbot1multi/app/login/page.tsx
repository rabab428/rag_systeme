import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import LoginForm from "./login-form"

export default async function Login() {
  const session = await getSession()

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="container mx-auto flex max-w-md flex-1 flex-col justify-center px-4 py-12">
        <div className="mb-4">
          <Link href="/" className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Retour à l'accueil
          </Link>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-900">Connexion</h1>
            <p className="mt-2 text-sm text-slate-600">Connectez-vous pour accéder à votre assistant RAG</p>
          </div>

          <LoginForm />

          <div className="mt-6 text-center text-sm">
            <p className="text-slate-600">
              Vous n'avez pas de compte?{" "}
              <Link href="/signup" className="font-medium text-slate-900 hover:underline">
                S'inscrire
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
