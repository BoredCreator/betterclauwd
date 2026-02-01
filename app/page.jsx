"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './page.module.css'
import Sidebar from './components/Sidebar'
import ChatMessage from './components/ChatMessage'
import ChatInput from './components/ChatInput'
import ModelSelector from './components/ModelSelector'
import ApiKeyModal from './components/ApiKeyModal'
import Settings from './components/Settings'
import {
  getChats,
  saveChat as saveChatToStorage,
  deleteChat,
  getChatById,
  getSettings,
  getApiKeys,
  hasAnyApiKey,
  generateId,
  getMessageCount,
  incrementMessageCount,
  isPromoHidden,
  getCustomEndpoints,
} from '@/lib/storage'
import PromoMessage from './components/PromoMessage'
import { getProvider, modelSupportsImages, getDefaultModel, PROVIDERS } from '@/lib/providers'
import { generateChatTitle, autoGenerateTitle } from '@/lib/utils'

export default function Home() {
  // State
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [chats, setChats] = useState([])
  const [currentChatId, setCurrentChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [initialized, setInitialized] = useState(false)
  const [showPromo, setShowPromo] = useState(false)
  const [promoHiddenForever, setPromoHiddenForever] = useState(false)

  // Chat settings
  const [provider, setProvider] = useState('anthropic')
  const [model, setModel] = useState('claude-sonnet-4-20250514')
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant.')
  const [temperature, setTemperature] = useState(0.7)
  const [thinkingEnabled, setThinkingEnabled] = useState(false)

  // Refs
  const messagesEndRef = useRef(null)
  const abortControllerRef = useRef(null)

  // Initialize on mount
  useEffect(() => {
    // Load settings
    const settings = getSettings()
    setProvider(settings.defaultProvider)
    setModel(settings.defaultModel)
    setSystemPrompt(settings.defaultSystemPrompt)
    setTemperature(settings.defaultTemperature)

    // Apply theme and appearance
    document.documentElement.setAttribute('data-theme', settings.theme)
    document.documentElement.setAttribute('data-appearance', settings.appearance || 'default')

    // Load chats
    const loadedChats = getChats()
    setChats(loadedChats)

    // Check for API keys
    if (!hasAnyApiKey()) {
      setShowApiKeyModal(true)
    }

    // Check if promo is hidden forever
    setPromoHiddenForever(isPromoHidden())

    setInitialized(true)
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load chat when currentChatId changes
  useEffect(() => {
    if (currentChatId) {
      const chat = getChatById(currentChatId)
      if (chat) {
        setMessages(chat.messages || [])
        setProvider(chat.provider || provider)
        setModel(chat.model || model)
        setSystemPrompt(chat.systemPrompt || systemPrompt)
        setTemperature(chat.temperature ?? temperature)
      }
    } else {
      setMessages([])
    }
  }, [currentChatId])

  // Create new chat
  const handleNewChat = useCallback(() => {
    setCurrentChatId(null)
    setMessages([])
    setError(null)

    // Reset to defaults
    const settings = getSettings()
    setProvider(settings.defaultProvider)
    setModel(settings.defaultModel)
    setSystemPrompt(settings.defaultSystemPrompt)
    setTemperature(settings.defaultTemperature)
  }, [])

  // Select chat
  const handleSelectChat = useCallback((chatId) => {
    setCurrentChatId(chatId)
    setError(null)
  }, [])

  // Delete chat
  const handleDeleteChat = useCallback((chatId) => {
    deleteChat(chatId)
    setChats(getChats())
    if (currentChatId === chatId) {
      handleNewChat()
    }
  }, [currentChatId, handleNewChat])

  // Save current chat
  const saveCurrentChat = useCallback((updatedMessages) => {
    const chatId = currentChatId || generateId()
    const existingChat = currentChatId ? getChatById(currentChatId) : null

    const chat = {
      id: chatId,
      title: existingChat?.title || generateChatTitle(updatedMessages[0]?.content),
      provider,
      model,
      systemPrompt,
      temperature,
      messages: updatedMessages,
    }

    saveChatToStorage(chat)
    setChats(getChats())

    if (!currentChatId) {
      setCurrentChatId(chatId)
    }

    return chatId
  }, [currentChatId, provider, model, systemPrompt, temperature])

  // Send message
  const handleSend = useCallback(async (content, images = []) => {
    const apiKeys = getApiKeys()
    const apiKey = apiKeys[provider]

    if (!apiKey) {
      setError(`No API key configured for ${PROVIDERS[provider]?.name}. Please add one in Settings.`)
      return
    }

    setError(null)
    setIsGenerating(true)

    // Add user message
    const userMessage = {
      id: generateId(),
      role: 'user',
      content,
      images: images.length > 0 ? images : undefined,
      timestamp: new Date().toISOString(),
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)

    // Create placeholder for assistant message
    const assistantMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    }

    setMessages([...updatedMessages, assistantMessage])

    try {
      // Create abort controller
      abortControllerRef.current = new AbortController()

      // Get provider and send message
      const customEndpoints = getCustomEndpoints()
      const providerInstance = getProvider(provider, customEndpoints[provider])
      const stream = providerInstance.sendMessage(
        apiKey,
        updatedMessages.map(m => ({
          role: m.role,
          content: m.content,
          images: m.images,
        })),
        {
          model,
          systemPrompt,
          temperature,
          maxTokens: getSettings().defaultMaxTokens,
          signal: abortControllerRef.current.signal,
          thinking: thinkingEnabled && provider === 'anthropic',
        }
      )

      // Stream response
      let fullContent = ''
      for await (const chunk of stream) {
        fullContent += chunk
        setMessages(prev => {
          const newMessages = [...prev]
          newMessages[newMessages.length - 1] = {
            ...newMessages[newMessages.length - 1],
            content: fullContent,
          }
          return newMessages
        })
      }

      // Save chat with final messages
      const finalMessages = [...updatedMessages, { ...assistantMessage, content: fullContent }]
      const savedChatId = saveCurrentChat(finalMessages)

      // Auto-generate title if enabled and it's a new chat (first exchange)
      const settings = getSettings()
      if (settings.autoGenerateTitle && finalMessages.length === 2 && savedChatId) {
        const apiKeys = getApiKeys()
        const customEndpoints = getCustomEndpoints()
        autoGenerateTitle(finalMessages, provider, apiKeys[provider], customEndpoints[provider])
          .then(title => {
            if (title) {
              const chat = getChatById(savedChatId)
              if (chat) {
                saveChat({ ...chat, title })
                setChats(getChats())
              }
            }
          })
      }

      // Increment message count and check if we should show promo
      const newCount = incrementMessageCount()
      if (!promoHiddenForever && newCount > 0 && newCount % 100 === 0) {
        setShowPromo(true)
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        // User stopped generation
        const currentMessages = [...updatedMessages]
        // Keep the partial response if any
        setMessages(prev => {
          if (prev[prev.length - 1]?.content) {
            return prev
          }
          return currentMessages
        })
      } else {
        setError(err.message || 'An error occurred while generating the response.')
        // Remove the empty assistant message on error
        setMessages(updatedMessages)
      }
    } finally {
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }, [messages, provider, model, systemPrompt, temperature, saveCurrentChat, promoHiddenForever, thinkingEnabled])

  // Stop generation
  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  // Regenerate last response
  const handleRegenerate = useCallback(() => {
    if (messages.length < 2) return

    // Remove last assistant message and resend
    const messagesWithoutLast = messages.slice(0, -1)
    const lastUserMessage = messagesWithoutLast[messagesWithoutLast.length - 1]

    if (lastUserMessage?.role === 'user') {
      setMessages(messagesWithoutLast.slice(0, -1))
      handleSend(lastUserMessage.content, lastUserMessage.images)
    }
  }, [messages, handleSend])

  // Edit message
  const handleEditMessage = useCallback((messageId, newContent) => {
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex === -1) return

    const editedMessage = messages[messageIndex]

    // Update the message content
    const updatedMessages = messages.map((m, idx) => {
      if (idx === messageIndex) {
        return { ...m, content: newContent }
      }
      return m
    })

    // If it's a user message, remove all messages after it and regenerate
    if (editedMessage.role === 'user') {
      const messagesUpToEdit = updatedMessages.slice(0, messageIndex + 1)
      setMessages(messagesUpToEdit)
      saveCurrentChat(messagesUpToEdit)

      // Regenerate response
      handleSend(newContent, editedMessage.images)
    } else {
      // For assistant messages, just update the content
      setMessages(updatedMessages)
      saveCurrentChat(updatedMessages)
    }
  }, [messages, saveCurrentChat, handleSend])

  // Check if current model supports images
  const supportsImages = modelSupportsImages(provider, model)

  // Promo message handlers
  const handleDismissPromo = useCallback(() => {
    setShowPromo(false)
  }, [])

  const handleHidePromoForever = useCallback(() => {
    setShowPromo(false)
    setPromoHiddenForever(true)
  }, [])

  // Don't render until initialized
  if (!initialized) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* API Key Modal */}
      {showApiKeyModal && (
        <ApiKeyModal
          onClose={hasAnyApiKey() ? () => setShowApiKeyModal(false) : undefined}
          onSave={() => {
            setShowApiKeyModal(false)
            // Refresh available providers
            const keys = getApiKeys()
            if (!keys[provider]) {
              // Switch to a provider that has a key
              const availableProvider = Object.keys(keys).find(k => keys[k])
              if (availableProvider) {
                setProvider(availableProvider)
                setModel(getDefaultModel(availableProvider))
              }
            }
          }}
        />
      )}

      {/* Settings Modal */}
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Sidebar */}
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onOpenSettings={() => setShowSettings(true)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Chat Area */}
      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <button
            onClick={() => setSidebarOpen(true)}
            className={styles.menuButton}
            title="Open sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          <ModelSelector
            provider={provider}
            model={model}
            onProviderChange={setProvider}
            onModelChange={setModel}
          />

          {/* Thinking Toggle - Only for Claude */}
          {provider === 'anthropic' && (
            <label className={styles.thinkingToggle} title="Enable extended thinking">
              <input
                type="checkbox"
                checked={thinkingEnabled}
                onChange={(e) => setThinkingEnabled(e.target.checked)}
                className={styles.thinkingCheckbox}
              />
              <span className={styles.thinkingSlider}></span>
              <span className={styles.thinkingLabel}>Thinking</span>
            </label>
          )}

          <button
            onClick={() => setShowApiKeyModal(true)}
            className={styles.keysButton}
            title="API Keys"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
            </svg>
          </button>
        </header>

        {/* Messages */}
        <div className={styles.messages}>
          {messages.length === 0 ? (
            <div className={styles.empty}>
              <h2>betterclauwd</h2>
              <p>Start a conversation with any AI model</p>
              <div className={styles.hints}>
                <span>Supports: Claude, GPT, Gemini, Grok, DeepSeek</span>
                <span>All data stored locally</span>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isLast={idx === messages.length - 1}
                isGenerating={isGenerating}
                onRegenerate={idx === messages.length - 1 ? handleRegenerate : undefined}
                onEdit={handleEditMessage}
              />
            ))
          )}
          {showPromo && (
            <PromoMessage
              onDismiss={handleDismissPromo}
              onHideForever={handleHidePromoForever}
            />
          )}
          <div ref={messagesEndRef} />

          {/* Floating stop button */}
          {isGenerating && (
            <button
              onClick={handleStop}
              className={styles.stopOverlay}
              title="Stop generating"
            >
              Stop
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className={styles.error}>
            <span>{error}</span>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          onStop={handleStop}
          isGenerating={isGenerating}
          disabled={!hasAnyApiKey()}
          supportsImages={supportsImages}
        />

        {/* Footer */}
        <footer className={styles.footer}>
          Made with ❤️ by{' '}
          <a href="https://flippedbyneel.com" target="_blank" rel="noopener noreferrer">
            Neel Anshu
          </a>
        </footer>
      </main>
    </div>
  )
}

