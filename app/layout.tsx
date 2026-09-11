import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { RoboWidget } from "@/components/support/robo-widget"
import "./globals.css"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "RoboReady — Robot & Autonomy Readiness for Commercial Property",
    template: "%s · RoboReady",
  },
  description:
    "RoboReady assesses commercial properties for robot, drone, and autonomous-vehicle readiness. Run AI-powered assessments, get a RoboReady Score, and plan the infrastructure to deploy autonomy.",
  generator: "v0.app",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1f2b" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`bg-background ${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <RoboWidget />
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
