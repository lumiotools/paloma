import type React from "react"
import type { Metadata } from "next"
import { Inter, Playfair_Display } from "next/font/google"
import "./globals.css"
import HeadScripts from "@/components/scripts"

const inter = Inter({ subsets: ["latin"] })
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
})

export const metadata: Metadata = {
  title: "Paloma Realty",
  description: "Paloma Realty Concierge",
    generator: 'v0.dev',
    icons: {
      icon: '/favicon.png',
    }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" media="(prefers-color-scheme: light)" />
      </head>
      <body className={`${inter.className} ${playfair.variable}`}>
        {children}
        {/* Move HeadScripts to the end of body to ensure it runs after hydration */}
      </body>
    </html>
  )
}



