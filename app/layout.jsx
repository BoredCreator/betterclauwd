"use client"

import { JetBrains_Mono, Inter, Merriweather, Source_Sans_3 } from "next/font/google"
import "./globals.css"

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
})

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
})

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
})

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <title>betterclauwd - Multi-Provider AI Chat</title>
        <meta name="description" content="Chat with AI models from multiple providers - Claude, GPT, Gemini, Grok, DeepSeek" />
        {/* viewport-fit=cover exposes safe-area-inset-* for iPhone notch/home bar */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* Prevent double-tap zoom on iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" href="/icon-light.png" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/icon-dark.png" media="(prefers-color-scheme: dark)" />
        <link rel="apple-touch-icon" href="/icon-dark.png" />
      </head>
      <body className={`${jetbrainsMono.variable} ${inter.variable} ${merriweather.variable} ${sourceSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}

