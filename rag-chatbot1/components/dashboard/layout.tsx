"use client"

import type React from "react"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MessageCircle, FileText, Settings, Menu, X } from "lucide-react"
import { logout } from "@/app/actions/auth"
import { cn } from "@/lib/utils"
import ChatHistory from "./chat-history"

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
}

interface DashboardLayoutProps {
  user: User
  children: React.ReactNode
}

export default function DashboardLayout({ user, children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const navItems = [
    {
      name: "Chat",
      href: "/dashboard",
      icon: <MessageCircle className="h-5 w-5" />,
    },
    {
      name: "Documents",
      href: "/dashboard/documents",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      name: "Paramètres",
      href: "/dashboard/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ]

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile sidebar toggle */}
      <div className="fixed left-4 top-4 z-50 block md:hidden">
        <Button variant="outline" size="icon" onClick={toggleSidebar}>
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform bg-white shadow-lg transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo and brand */}
          <div className="flex items-center gap-2 border-b border-slate-200 p-4">
            <MessageCircle className="h-6 w-6 text-slate-800" />
            <span className="text-xl font-bold text-slate-800">RAGBot</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  pathname === item.href
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
                onClick={() => setSidebarOpen(false)}
              >
                {item.icon}
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Chat history */}
          <div className="flex-1 overflow-y-auto border-t border-slate-200 p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Historique des chats</h3>
            <ChatHistory />
          </div>

          {/* User info and logout */}
          <div className="border-t border-slate-200 p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-800">
                {user.firstName.charAt(0)}
                {user.lastName.charAt(0)}
              </div>
              <div className="text-sm">
                <p className="font-medium text-slate-900">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
            <form action={logout}>
              <Button variant="outline" size="sm" className="w-full" type="submit">
                Déconnexion
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}

