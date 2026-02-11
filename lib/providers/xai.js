// xAI (Grok) Provider - Updated to use new Responses API
export class XAIProvider {
  constructor(baseUrl = 'https://api.x.ai/v1') {
    this.baseUrl = baseUrl
  }

  async *sendMessage(apiKey, messages, options = {}) {
    const {
      model = 'grok-4',
      systemPrompt = 'You are Grok, a highly intelligent, helpful AI assistant.',
      temperature = 0.7,
      maxTokens = 4096,
      signal,
      imageGenerationEnabled = false,
    } = options

    // Add image generation capabilities to system prompt if enabled
    let enhancedSystemPrompt = systemPrompt
    if (imageGenerationEnabled) {
      enhancedSystemPrompt += '\n\nYou can generate and edit images by using these special commands:\n' +
        '- To generate an image: [[GENERATE_IMAGE: your detailed image prompt here]]\n' +
        '- To edit an existing image: [[EDIT_IMAGE: your edit instruction here]]\n' +
        'When you use these commands, the image will be generated asynchronously and added to the chat once ready. You can continue your response normally.'
    }

    // Convert messages to xAI Responses API format
    // The new API uses "input" array instead of "messages"
    const input = [
      { role: 'system', content: enhancedSystemPrompt },
      ...messages.map(msg => {
        if (msg.images && msg.images.length > 0) {
          // Grok 4 supports images
          const content = [
            { type: 'text', text: msg.content },
            ...msg.images.map(img => ({
              type: 'image_url',
              image_url: {
                url: `data:${img.mimeType || 'image/png'};base64,${img.base64}`,
              },
            })),
          ]
          return { role: msg.role, content }
        }
        return { role: msg.role, content: msg.content }
      }),
    ]

    // Use the new Responses API endpoint
    const response = await fetch(`${this.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
      signal,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error?.message || `API error: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

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
            // Handle new Responses API format
            const content = parsed.choices?.[0]?.delta?.content ||
                           parsed.output?.content ||
                           parsed.delta?.content
            if (content) {
              yield content
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
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      })
      return response.ok
    } catch {
      return false
    }
  }
}
