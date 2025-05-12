"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createHash } from "crypto"
import { connectToDatabase, User } from "@/lib/mongodb"

interface Session {
  id: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
  }
}

// Fonction pour hacher un mot de passe
function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex")
}

// Fonction pour créer un ID unique
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Fonction d'inscription
export async function signup(formData: FormData) {
  try {
    await connectToDatabase()

    const email = (formData.get("email") as string).toLowerCase()
    const password = formData.get("password") as string
    const firstName = formData.get("firstName") as string
    const lastName = formData.get("lastName") as string

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return { success: false, error: "Cet email est déjà utilisé" }
    }

    // Créer un nouvel utilisateur
    const newUser = await User.create({
      email,
      firstName,
      lastName,
      passwordHash: hashPassword(password),
    })

    // Créer une session
    const session: Session = {
      id: generateId(),
      user: {
        id: newUser._id.toString(),
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      },
    }

    // Attendre la résolution de cookies()
    const cookieStore = await cookies()

    // Stocker la session dans un cookie
    cookieStore.set({
      name: "session",
      value: JSON.stringify(session),
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 semaine
    })

    return { success: true }
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error)
    return { success: false, error: "Une erreur s'est produite lors de l'inscription" }
  }
}

// Fonction de connexion
export async function login(formData: FormData) {
  try {
    await connectToDatabase()

    const email = (formData.get("email") as string).toLowerCase()
    const password = formData.get("password") as string

    // Trouver l'utilisateur
    const user = await User.findOne({ email })

    // Vérifier si l'utilisateur existe et si le mot de passe est correct
    if (!user || user.passwordHash !== hashPassword(password)) {
      return { success: false, error: "Email ou mot de passe incorrect" }
    }

    // Créer une session
    const session: Session = {
      id: generateId(),
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    }

    // Attendre la résolution de cookies()
    const cookieStore = await cookies()

    // Stocker la session dans un cookie
    cookieStore.set({
      name: "session",
      value: JSON.stringify(session),
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 semaine
    })

    return { success: true }
  } catch (error) {
    console.error("Erreur lors de la connexion:", error)
    return { success: false, error: "Une erreur s'est produite lors de la connexion" }
  }
}

// Fonction de déconnexion
export async function logout() {
  // Attendre la résolution de cookies()
  const cookieStore = await cookies()
  cookieStore.delete("session")
  redirect("/")
}


