// Anthropic (Claude) Provider
export class AnthropicProvider {
  constructor(baseUrl = 'https://api.anthropic.com/v1') {
    this.baseUrl = baseUrl
  }

  async *sendMessage(apiKey, messages, options = {}) {
    const {
      model = 'claude-sonnet-4-5-20250514',
      systemPrompt = 'You are a helpful assistant.',
      temperature = 0.7,
      maxTokens = 4096,
      signal,
      thinking = false,
    } = options

    // Convert messages to Anthropic format
    const anthropicMessages = messages.map(msg => {
      if (msg.images && msg.images.length > 0) {
        // Message with images
        const content = [
          ...msg.images.map(img => ({
            type: 'image',
            source: {
              type: 'base64',
              media_type: img.mimeType || 'image/png',
              data: img.base64,
            },
          })),
          { type: 'text', text: msg.content },
        ]
        return { role: msg.role, content }
      }
      return { role: msg.role, content: msg.content }
    })

    // Build request body
    const requestBody = {
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: anthropicMessages,
      stream: true,
    }

    // Extended thinking requires special handling
    if (thinking) {
      requestBody.thinking = {
        type: 'enabled',
        budget_tokens: Math.min(10000, maxTokens),
      }
      // Temperature must be 1 for thinking mode
    } else {
      requestBody.temperature = temperature
    }

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(requestBody),
      signal,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error?.message || `API error: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let inThinkingBlock = false
    let thinkingStarted = false

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') return

          try {
            const parsed = JSON.parse(data)

            // Track content block starts
            if (parsed.type === 'content_block_start') {
              if (parsed.content_block?.type === 'thinking') {
                inThinkingBlock = true
                if (!thinkingStarted) {
                  yield '```thinking\n'
                  thinkingStarted = true
                }
              }
            }

            // Track content block stops
            if (parsed.type === 'content_block_stop' && inThinkingBlock) {
              yield '\n```\n\n'
              inThinkingBlock = false
            }

            if (parsed.type === 'content_block_delta') {
              // Handle regular text delta
              if (parsed.delta?.text) {
                yield parsed.delta.text
              }
              // Stream thinking content directly
              if (parsed.delta?.thinking) {
                yield parsed.delta.thinking
              }
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  async validateKey(apiKey) {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-20250514',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      })

      // 200 or 400 (bad request) means key is valid
      // 401 means invalid key
      return response.status !== 401
    } catch {
      return false
    }
  }
}
