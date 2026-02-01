"use client"

import { JetBrains_Mono } from "next/font/google"
import "./globals.css"

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <title>betterclauwd - Multi-Provider AI Chat</title>
        <meta name="description" content="Chat with AI models from multiple providers - Claude, GPT, Gemini, Grok, DeepSeek" />
        <link rel="icon" href="/icon-light.png" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/icon-dark.png" media="(prefers-color-scheme: dark)" />
        <link rel="apple-touch-icon" href="/icon-dark.png" />
      </head>
      <body className={`${jetbrainsMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}

