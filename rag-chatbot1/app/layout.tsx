import './globals.css'
import type { Metadata } from 'next'
import { MessageCircle } from "lucide-react"

export const metadata: Metadata = {
  title: 'RAGBot',
  description: 'My Blog Description',
  generator: 'Next.js',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Utilisation de opa.jpeg comme icône */}
        <link rel="icon" href="/opa.PNG" />
      </head>
      <body>
      
        {children}
      </body>
    </html>
  )
}
