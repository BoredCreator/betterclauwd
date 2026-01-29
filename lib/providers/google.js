// Google (Gemini) Provider
export class GoogleProvider {
  constructor() {
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta'
  }

  async *sendMessage(apiKey, messages, options = {}) {
    const {
      model = 'gemini-2.0-flash',
      systemPrompt = 'You are a helpful assistant.',
      temperature = 0.7,
      maxTokens = 4096,
      signal,
    } = options

    // Convert messages to Gemini format
    const contents = messages.map(msg => {
      const parts = []

      // Add images first if present
      if (msg.images && msg.images.length > 0) {
        for (const img of msg.images) {
          parts.push({
            inlineData: {
              mimeType: img.mimeType || 'image/png',
              data: img.base64,
            },
          })
        }
      }

      // Add text content
      parts.push({ text: msg.content })

      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts,
      }
    })

    const url = `${this.baseUrl}/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
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

          try {
            const parsed = JSON.parse(data)
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) {
              yield text
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
      const response = await fetch(
        `${this.baseUrl}/models?key=${apiKey}`
      )
      return response.ok
    } catch {
      return false
    }
  }
}
