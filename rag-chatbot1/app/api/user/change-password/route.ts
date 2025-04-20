import { connectToDatabase, User } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"
import { NextResponse } from "next/server"
import { createHash } from "crypto"

// Fonction pour hacher un mot de passe
function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex")
}

// Fonction pour valider la complexité du mot de passe
function validatePassword(password: string): boolean {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/
  return regex.test(password)
}

export async function POST(request: Request) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 })
    }

    //  Vérification de la complexité du nouveau mot de passe
    if (!validatePassword(newPassword)) {
      return NextResponse.json({
        error: "Le nouveau mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial"
      }, { status: 400 })
    }

    await connectToDatabase()

    const user = await User.findById(session.user.id)

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })
    }

    if (user.passwordHash !== hashPassword(currentPassword)) {
      return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 400 })
    }

    user.passwordHash = hashPassword(newPassword)
    await user.save()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur lors du changement de mot de passe:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
