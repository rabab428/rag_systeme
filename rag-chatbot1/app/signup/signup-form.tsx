"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { signup } from "@/app/actions/auth"
import { useRouter } from "next/navigation"

export default function SignupForm() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const router = useRouter()

  async function checkEmailExists(email: string) {
    try {
      const response = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()
      if (data.exists) {
        setEmailError("Cet email est déjà utilisé")
        return true
      } else {
        setEmailError(null)
        return false
      }
    } catch (err) {
      console.error("Erreur lors de la vérification de l'email:", err)
      return false
    }
  }

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)

    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    // Vérifier si les mots de passe correspondent
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      setIsLoading(false)
      return
    }

    // Vérifier si l'email existe déjà
    const emailExists = await checkEmailExists(email)
    if (emailExists) {
      setIsLoading(false)
      return
    }

    try {
      const result = await signup(formData)
      if (result.success) {
        router.push("/dashboard")
        router.refresh()
      } else {
        setError(result.error || "Une erreur s'est produite lors de l'inscription")
      }
    } catch (err) {
      setError("Une erreur s'est produite lors de l'inscription")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Prénom</Label>
          <Input id="firstName" name="firstName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Nom</Label>
          <Input id="lastName" name="lastName" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="votre@email.com"
          required
          onBlur={(e) => checkEmailExists(e.target.value)}
          className={emailError ? "border-red-500" : ""}
        />
        {emailError && <p className="text-xs text-red-500">{emailError}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input id="password" name="password" type="password" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" required />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Inscription en cours..." : "S'inscrire"}
      </Button>
    </form>
  )
}
