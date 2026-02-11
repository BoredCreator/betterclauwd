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
  getLastUsedModel,
  setLastUsedModel,
  getCustomProviderConfig,
  getActualModelId,
  deleteOldestChats,
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
  const [storageError, setStorageError] = useState(false)
  const [cleanupCount, setCleanupCount] = useState(5)

  // Chat settings
  const [provider, setProvider] = useState('anthropic')
  const [model, setModel] = useState('claude-sonnet-4-5-20250514')
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant.')
  const [temperature, setTemperature] = useState(0.7)
  const [thinkingEnabled, setThinkingEnabled] = useState(false)
  const [editingSystemPrompt, setEditingSystemPrompt] = useState(false)
  const [tempSystemPrompt, setTempSystemPrompt] = useState('')

  // Refs
  const messagesEndRef = useRef(null)
  const abortControllerRef = useRef(null)

  // Handle URL hash changes for chat routing
  useEffect(() => {
    const handleHashChange = async () => {
      const hash = window.location.hash
      if (hash.startsWith('#/chat/')) {
        const chatId = hash.substring(7) // Remove '#/chat/'
        const chat = await getChatById(chatId)
        if (chat) {
          setCurrentChatId(chatId)
        } else {
          // Chat doesn't exist, redirect to home
          window.location.hash = ''
        }
      } else if (hash === '' || hash === '#') {
        // Home - clear current chat
        if (currentChatId) {
          setCurrentChatId(null)
        }
      }
    }

    // Handle initial load
    handleHashChange()

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Initialize on mount
  useEffect(() => {
    // Load settings
    const settings = getSettings()

    // Check for last used model first, then fall back to defaults
    const lastModel = getLastUsedModel()
    if (lastModel) {
      setProvider(lastModel.provider)
      setModel(lastModel.model)
    } else {
      setProvider(settings.defaultProvider)
      setModel(settings.defaultModel)
    }

    setSystemPrompt(settings.defaultSystemPrompt)
    setTemperature(settings.defaultTemperature)

    // Apply theme, appearance, and font
    document.documentElement.setAttribute('data-theme', settings.theme)
    document.documentElement.setAttribute('data-appearance', settings.appearance || 'default')
    document.documentElement.setAttribute('data-font', settings.font || 'inter')

    // Apply custom appearance settings if in custom mode
    if (settings.appearance === 'custom' && settings.customAppearance) {
      const custom = settings.customAppearance
      const root = document.documentElement
      root.style.setProperty('--custom-font-size', `${custom.fontSize || 14}px`)

      // Calculate line-height, message-gap, and padding from compactness (0-100)
      // compactness 0 = spacious, compactness 100 = ultra-compact
      const compactness = custom.compactness ?? 50
      const lineHeight = 2.0 - (compactness / 100) * 0.9 // 2.0 to 1.1
      const messageGap = 20 - (compactness / 100) * 24 // 20 to -4
      const messagePadding = 16 - (compactness / 100) * 14 // 16 to 2

      root.style.setProperty('--custom-line-height', lineHeight.toFixed(2))
      root.style.setProperty('--custom-message-gap', `${Math.round(messageGap)}px`)
      root.style.setProperty('--custom-message-padding', `${Math.round(messagePadding)}px`)
      root.style.setProperty('--custom-border-radius', `${custom.borderRadius || 4}px`)
      root.style.setProperty('--custom-code-font-size', `${custom.codeBlockFontSize || 13}px`)
      root.setAttribute('data-custom-base', custom.baseStyle || 'default')
      root.setAttribute('data-show-timestamps', custom.showTimestamps !== false ? 'true' : 'false')
      root.setAttribute('data-show-avatars', custom.showAvatars ? 'true' : 'false')
      root.setAttribute('data-compact-headers', custom.compactHeaders ? 'true' : 'false')
    }

    // Load chats (async)
    getChats().then(loadedChats => setChats(loadedChats))

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
    // Use instant scroll during generation to keep up with streaming
    // Use smooth scroll otherwise for better UX
    messagesEndRef.current?.scrollIntoView({
      behavior: isGenerating ? 'auto' : 'smooth'
    })
  }, [messages, isGenerating])

  // Save last used model when it changes
  useEffect(() => {
    if (initialized && provider && model) {
      setLastUsedModel(provider, model)
    }
  }, [provider, model, initialized])

  // Load chat when currentChatId changes
  useEffect(() => {
    if (currentChatId) {
      getChatById(currentChatId).then(chat => {
        if (chat) {
          setMessages(chat.messages || [])
          setProvider(chat.provider || provider)
          setModel(chat.model || model)
          setSystemPrompt(chat.systemPrompt || systemPrompt)
          setTemperature(chat.temperature ?? temperature)
          setThinkingEnabled(chat.thinkingEnabled ?? thinkingEnabled)
        }
      })
    } else {
      setMessages([])
    }
  }, [currentChatId])

  // Update URL when currentChatId changes
  useEffect(() => {
    if (currentChatId) {
      window.location.hash = `#/chat/${currentChatId}`
    } else if (window.location.hash.startsWith('#/chat/')) {
      window.location.hash = ''
    }
  }, [currentChatId])

  // Create new chat - keep current system prompt
  const handleNewChat = useCallback(() => {
    setCurrentChatId(null)
    setMessages([])
    setError(null)

    // Use last used model if available, otherwise defaults
    const lastModel = getLastUsedModel()
    if (lastModel) {
      setProvider(lastModel.provider)
      setModel(lastModel.model)
    }
    // Keep current system prompt - don't reset it
  }, [])

  // Select chat
  const handleSelectChat = useCallback((chatId) => {
    // URL will be updated by the useEffect watching currentChatId
    setCurrentChatId(chatId)
    setError(null)
  }, [])

  // Delete chat
  const handleDeleteChat = useCallback(async (chatId) => {
    await deleteChat(chatId)
    setChats(await getChats())
    if (currentChatId === chatId) {
      handleNewChat()
    }
  }, [currentChatId, handleNewChat])

  // Save current chat
  const saveCurrentChat = useCallback(async (updatedMessages) => {
    const chatId = currentChatId || generateId()
    const existingChat = currentChatId ? await getChatById(currentChatId) : null

    const chat = {
      id: chatId,
      title: existingChat?.title || generateChatTitle(updatedMessages[0]?.content),
      provider,
      model,
      systemPrompt,
      temperature,
      thinkingEnabled,
      messages: updatedMessages,
    }

    try {
      await saveChatToStorage(chat)
      setStorageError(false)
    } catch (err) {
      if (err?.name === 'QuotaExceededError' || err?.message?.includes('quota')) {
        setStorageError(true)
      }
    }
    setChats(await getChats())

    if (!currentChatId) {
      setCurrentChatId(chatId)
    }

    return chatId
  }, [currentChatId, provider, model, systemPrompt, temperature, thinkingEnabled])

  // Handle storage cleanup
  const handleStorageCleanup = useCallback(async () => {
    await deleteOldestChats(cleanupCount)
    setChats(await getChats())
    setStorageError(false)
  }, [cleanupCount])

  // Handle image generation from commands in assistant message
  const handleImageGeneration = useCallback(async (content, currentProvider, currentApiKey) => {
    try {
      const generateMatches = [...content.matchAll(/\[\[GENERATE_IMAGE:\s*(.+?)\]\]/g)]
      const editMatches = [...content.matchAll(/\[\[EDIT_IMAGE:\s*(.+?)\]\]/g)]

      const customEndpoints = getCustomEndpoints()
      const endpointToUse = customEndpoints[currentProvider]
      const providerInstance = getProvider(currentProvider, endpointToUse)

      // Process generate commands
      for (const match of generateMatches) {
        const prompt = match[1].trim()

        try {
          let imageData
          if (currentProvider === 'openai') {
            // Use OpenAI image generation
            const result = await providerInstance.generateImage(currentApiKey, prompt, {
              model: 'gpt-image-1.5',
              size: '1024x1024',
              quality: 'standard',
            })
            imageData = result[0]?.url
          } else if (currentProvider === 'google') {
            // Use Google Nano Banana
            const result = await providerInstance.generateImage(currentApiKey, prompt, {
              model: 'nano-banana',
              aspectRatio: '1:1',
            })
            imageData = result
          }

          if (imageData) {
            // Add image to the last assistant message
            setMessages(prev => {
              const newMessages = [...prev]
              const lastMsg = newMessages[newMessages.length - 1]
              if (lastMsg?.role === 'assistant') {
                lastMsg.generatedImages = lastMsg.generatedImages || []
                lastMsg.generatedImages.push({ url: imageData, prompt })
              }
              return newMessages
            })
          }
        } catch (err) {
          console.error('Image generation failed:', err)
          // Add error message to chat
          setMessages(prev => {
            const newMessages = [...prev]
            const lastMsg = newMessages[newMessages.length - 1]
            if (lastMsg?.role === 'assistant') {
              lastMsg.content += `\n\n_[Image generation failed: ${err.message}]_`
            }
            return newMessages
          })
        }
      }

      // Process edit commands
      for (const match of editMatches) {
        const instruction = match[1].trim()

        // For edit commands, we would need the previous image
        // For now, just notify that edit is not yet fully implemented
        setMessages(prev => {
          const newMessages = [...prev]
          const lastMsg = newMessages[newMessages.length - 1]
          if (lastMsg?.role === 'assistant') {
            lastMsg.content += `\n\n_[Image edit requested: "${instruction}" - Edit functionality requires selecting a previous image]_`
          }
          return newMessages
        })
      }
    } catch (err) {
      console.error('Image generation handler failed:', err)
    }
  }, [])

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
      const customProviderConfig = getCustomProviderConfig()
      // For custom provider, use the endpoint from custom config
      const endpointToUse = provider === 'custom'
        ? customProviderConfig.endpoint
        : customEndpoints[provider]
      const providerInstance = getProvider(provider, endpointToUse)
      // Apply model override if set
      const actualModelId = getActualModelId(provider, model)
      const settings = getSettings()
      // Image generation is available if enabled AND an OpenAI key exists (uses OpenAI API for generation)
      const hasOpenAIKey = !!apiKeys.openai
      const imageGenAvailable = settings.imageGenerationEnabled && hasOpenAIKey

      const stream = providerInstance.sendMessage(
        apiKey,
        updatedMessages.map(m => ({
          role: m.role,
          content: m.content,
          images: m.images,
        })),
        {
          model: actualModelId,
          systemPrompt,
          temperature,
          maxTokens: settings.defaultMaxTokens,
          signal: abortControllerRef.current.signal,
          thinking: thinkingEnabled && provider === 'anthropic',
          imageGenerationEnabled: imageGenAvailable,
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

      // Parse for image generation commands after streaming is complete
      // Uses OpenAI API for image generation regardless of chat provider
      if (imageGenAvailable) {
        const generateMatch = fullContent.match(/\[\[GENERATE_IMAGE:\s*(.+?)\]\]/g)
        const editMatch = fullContent.match(/\[\[EDIT_IMAGE:\s*(.+?)\]\]/g)

        if (generateMatch || editMatch) {
          // Always use OpenAI for image generation
          handleImageGeneration(fullContent, 'openai', apiKeys.openai).catch(console.error)
        }
      }

      // Save chat with final messages
      const finalMessages = [...updatedMessages, { ...assistantMessage, content: fullContent }]
      const savedChatId = saveCurrentChat(finalMessages)

      // Auto-generate title if enabled and it's a new chat (first exchange)
      if (settings.autoGenerateTitle && finalMessages.length === 2 && savedChatId) {
        autoGenerateTitle(finalMessages, provider, apiKeys[provider], customEndpoints[provider])
          .then(async (title) => {
            if (title) {
              const chat = await getChatById(savedChatId)
              if (chat) {
                await saveChatToStorage({ ...chat, title })
                setChats(await getChats())
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
  }, [messages, provider, model, systemPrompt, temperature, saveCurrentChat, promoHiddenForever, thinkingEnabled, handleImageGeneration])

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
  const handleEditMessage = useCallback(async (messageId, newContent) => {
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

      const apiKeys = getApiKeys()
      const apiKey = apiKeys[provider]

      if (!apiKey) {
        setError(`No API key configured for ${PROVIDERS[provider]?.name}. Please add one in Settings.`)
        return
      }

      setError(null)
      setIsGenerating(true)

      // Create placeholder for assistant message
      const assistantMessage = {
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      }

      setMessages([...messagesUpToEdit, assistantMessage])

      try {
        abortControllerRef.current = new AbortController()

        const customEndpoints = getCustomEndpoints()
        const customProviderConfig = getCustomProviderConfig()
        const endpointToUse = provider === 'custom'
          ? customProviderConfig.endpoint
          : customEndpoints[provider]
        const providerInstance = getProvider(provider, endpointToUse)
        // Apply model override if set
        const actualModelId = getActualModelId(provider, model)

        const stream = providerInstance.sendMessage(
          apiKey,
          messagesUpToEdit.map(m => ({
            role: m.role,
            content: m.content,
            images: m.images,
          })),
          {
            model: actualModelId,
            systemPrompt,
            temperature,
            maxTokens: getSettings().defaultMaxTokens,
            signal: abortControllerRef.current.signal,
            thinking: thinkingEnabled && provider === 'anthropic',
          }
        )

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

        const finalMessages = [...messagesUpToEdit, { ...assistantMessage, content: fullContent }]
        saveCurrentChat(finalMessages)

      } catch (err) {
        if (err.name === 'AbortError') {
          // Keep partial response
        } else {
          setError(err.message || 'An error occurred while generating the response.')
          setMessages(messagesUpToEdit)
        }
      } finally {
        setIsGenerating(false)
        abortControllerRef.current = null
      }
    } else {
      // For assistant messages, just update the content
      setMessages(updatedMessages)
      saveCurrentChat(updatedMessages)
    }
  }, [messages, saveCurrentChat, provider, model, systemPrompt, temperature, thinkingEnabled])

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
              <img src="/icon-light.png" alt="betterclauwd" className={styles.logoLight} />
              <img src="/icon-dark.png" alt="betterclauwd" className={styles.logoDark} />
              <h2>betterclauwd</h2>
              <p className={styles.openSource}>
                This project is open source. Code available on{' '}
                <a href="https://github.com/BoredCreator/betterclauwd" target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
              </p>

              {/* System Prompt Display */}
              <div className={styles.systemPromptContainer}>
                {editingSystemPrompt ? (
                  <div className={styles.systemPromptEdit}>
                    <textarea
                      value={tempSystemPrompt}
                      onChange={(e) => setTempSystemPrompt(e.target.value)}
                      className={styles.systemPromptTextarea}
                      rows={3}
                      autoFocus
                    />
                    <div className={styles.systemPromptActions}>
                      <button
                        onClick={() => {
                          setSystemPrompt(tempSystemPrompt)
                          setEditingSystemPrompt(false)
                        }}
                        className={styles.systemPromptSave}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingSystemPrompt(false)}
                        className={styles.systemPromptCancel}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={styles.systemPromptDisplay}
                    onClick={() => {
                      setTempSystemPrompt(systemPrompt)
                      setEditingSystemPrompt(true)
                    }}
                  >
                    <span className={styles.systemPromptText}>{systemPrompt}</span>
                    <button className={styles.systemPromptEditBtn} title="Edit system prompt">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </div>
                )}
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

        {/* Storage Error */}
        {storageError && (
          <div className={styles.error}>
            <span>Storage full. Delete old chats to free space.</span>
            <div className={styles.storageCleanup}>
              <select
                value={cleanupCount}
                onChange={(e) => setCleanupCount(Number(e.target.value))}
                className={styles.cleanupSelect}
              >
                <option value={3}>3 chats</option>
                <option value={5}>5 chats</option>
                <option value={10}>10 chats</option>
                <option value={20}>20 chats</option>
                <option value={50}>50 chats</option>
              </select>
              <button onClick={handleStorageCleanup}>Delete oldest</button>
              <button onClick={() => setStorageError(false)}>Dismiss</button>
            </div>
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

