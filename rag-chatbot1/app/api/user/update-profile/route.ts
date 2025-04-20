import { connectToDatabase, User } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function PUT(request: Request) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { firstName, lastName, email } = await request.json()

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 })
    }

    await connectToDatabase()

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    if (email !== session.user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase(), _id: { $ne: session.user.id } })
      if (existingUser) {
        return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 400 })
      }
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      {
        firstName,
        lastName,
        email: email.toLowerCase(),
      },
      { new: true },
    )

    if (!updatedUser) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })
    }

    // Créer un nouvel objet de session avec les informations mises à jour
    const updatedSession = {
      ...session,
      user: {
        ...session.user,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
      },
    }

    // Créer la réponse
    const response = NextResponse.json({
      success: true,
      user: {
        id: updatedUser._id.toString(),
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
      },
    })

    // Définir explicitement le cookie de session avec les nouvelles informations
    // Assurez-vous que le cookie est correctement encodé
    const sessionStr = JSON.stringify(updatedSession)
    
    response.cookies.set({
      name: "session",
      value: sessionStr,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 semaine
      sameSite: "lax",
    })

    return response
  } catch (error) {
    console.error("Erreur lors de la mise à jour du profil:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
