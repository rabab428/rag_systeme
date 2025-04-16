import { connectToDatabase, User } from "@/lib/mongodb"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 })
    }

    await connectToDatabase()
    const existingUser = await User.findOne({ email: email.toLowerCase() })

    return NextResponse.json({ exists: !!existingUser })
  } catch (error) {
    console.error("Erreur lors de la vérification de l'email:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
