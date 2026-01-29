// Format timestamp to relative time
export const formatRelativeTime = (timestamp) => {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

// Format timestamp to full date/time
export const formatDateTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

// Truncate text
export const truncate = (text, maxLength = 50) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

// Generate chat title from first message
export const generateChatTitle = (firstMessage) => {
  if (!firstMessage) return 'New Chat'
  const content = typeof firstMessage === 'string'
    ? firstMessage
    : firstMessage.content || ''
  return truncate(content, 40) || 'New Chat'
}

// Convert file to base64
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      // Remove the data URL prefix to get just the base64
      const base64 = reader.result.split(',')[1]
      resolve({
        base64,
        mimeType: file.type,
        name: file.name,
      })
    }
    reader.onerror = reject
  })
}

// Get image from clipboard
export const getImageFromClipboard = async (clipboardData) => {
  const items = clipboardData.items
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const blob = items[i].getAsFile()
      return fileToBase64(blob)
    }
  }
  return null
}

// Check if content has images
export const hasImages = (content) => {
  return Array.isArray(content) && content.some(c => c.type === 'image')
}

// Copy text to clipboard
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      return true
    } catch {
      return false
    } finally {
      document.body.removeChild(textarea)
    }
  }
}

// Debounce function
export const debounce = (fn, delay) => {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

// Check if running in browser
export const isBrowser = () => typeof window !== 'undefined'

// Parse error message from API response
export const parseApiError = (error) => {
  if (typeof error === 'string') return error
  if (error?.message) return error.message
  if (error?.error?.message) return error.error.message
  return 'An unknown error occurred'
}
