import mongoose from "mongoose"

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ragbot"

// Étend la déclaration de `global` pour y ajouter un cache proprement typé
declare global {
  // Cela évite l’erreur TS lorsqu’on ajoute une propriété custom à `global`
  var _mongoose: {
    conn: typeof mongoose | null
    promise: Promise<typeof mongoose> | null
  }
}

// Initialisation du cache si absent
if (!global._mongoose) {
  global._mongoose = { conn: null, promise: null }
}

let cached = global._mongoose

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts)
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}


const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Vérifie si le modèle existe déjà (évite l'erreur de redéfinition)
export const User = mongoose.models.User || mongoose.model("User", userSchema)
