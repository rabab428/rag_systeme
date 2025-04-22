import { connectToDatabase, Conversation } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"
import { NextResponse } from "next/server"

// Route pour récupérer une conversation spécifique
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    // Attendre l'objet params complet
    const { id } = await params

    await connectToDatabase()

    const conversation = await Conversation.findOne({
      _id: id,
      userId: session.user.id,
    }).lean()

    if (!conversation) {
      return NextResponse.json({ error: "Conversation non trouvée" }, { status: 404 })
    }

    return NextResponse.json({ conversation })
  } catch (error) {
    console.error("Erreur lors de la récupération de la conversation:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// Route pour ajouter un message à une conversation
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    // Attendre l'objet params complet
    const { id } = await params
    const { message } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message requis" }, { status: 400 })
    }

    await connectToDatabase()

    const conversation = await Conversation.findOne({
      _id: id,
      userId: session.user.id,
    })

    if (!conversation) {
      return NextResponse.json({ error: "Conversation non trouvée" }, { status: 404 })
    }

    conversation.messages.push(message)
    await conversation.save()

    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error("Erreur lors de l'ajout d'un message:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// Route pour supprimer une conversation
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    // Attendre l'objet params complet
    const { id } = await params

    await connectToDatabase()

    const result = await Conversation.deleteOne({
      _id: id,
      userId: session.user.id,
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Conversation non trouvée" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur lors de la suppression de la conversation:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}


