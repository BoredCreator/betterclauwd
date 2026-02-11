// Google (Gemini) Provider - Updated for Gemini 3 series
export class GoogleProvider {
  constructor(baseUrl = 'https://generativelanguage.googleapis.com/v1beta') {
    this.baseUrl = baseUrl
  }

  async *sendMessage(apiKey, messages, options = {}) {
    const {
      model = 'gemini-3-flash',
      systemPrompt = 'You are a helpful assistant.',
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

    // Check if model is nano-banana (image generation) which doesn't support temperature
    const isImageGenModel = model.includes('nano-banana')

    const generationConfig = {
      maxOutputTokens: maxTokens,
    }

    // Only add temperature for non-image-generation models
    if (!isImageGenModel) {
      generationConfig.temperature = temperature
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: enhancedSystemPrompt }],
        },
        generationConfig,
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

  // Generate image using Nano Banana API
  async generateImage(apiKey, prompt, options = {}) {
    const {
      model = 'nano-banana',
      aspectRatio = '1:1',
    } = options

    const url = `${this.baseUrl}/models/${model}:generateImage?key=${apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        aspectRatio,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error?.message || `API error: ${response.status}`)
    }

    const data = await response.json()
    return data // Returns generated image data
  }

  // Generate video using Veo API
  async generateVideo(apiKey, prompt, options = {}) {
    const {
      model = 'veo-3.1',
      duration = 5,
    } = options

    const url = `${this.baseUrl}/models/${model}:generateVideo?key=${apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        duration,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error?.message || `API error: ${response.status}`)
    }

    const data = await response.json()
    return data // Returns video generation result
  }
}
