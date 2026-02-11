// OpenAI (GPT) Provider - Updated for GPT-5 series
export class OpenAIProvider {
  constructor(baseUrl = 'https://api.openai.com/v1') {
    this.baseUrl = baseUrl
  }

  async *sendMessage(apiKey, messages, options = {}) {
    const {
      model = 'gpt-5.2',
      systemPrompt = 'You are a helpful assistant.',
      temperature = 0.7,
      maxTokens = 4096,
      signal,
      webSearch = false,
      imageGenerationEnabled = false,
    } = options

    // Add image generation capabilities to system prompt if enabled
    let enhancedSystemPrompt = systemPrompt
    if (imageGenerationEnabled) {
      enhancedSystemPrompt += '\n\n[IMAGE GENERATION TOOL]\n' +
        'You have access to an image generation tool built into this chat application. ' +
        'When the user asks you to create, draw, generate, or make an image, you MUST use this tool by including the following command in your response on its own line:\n\n' +
        '[[GENERATE_IMAGE: a detailed description of the image to generate]]\n\n' +
        'The system will automatically intercept this command and generate the image using an AI image model. The image will appear in the chat. ' +
        'You MUST use this command whenever the user requests an image. Do NOT tell the user you cannot generate images. Do NOT suggest they use another tool. ' +
        'Write a detailed, descriptive prompt inside the command for best results. You may include the command anywhere in your response and continue writing normally after it.'
    }

    // Convert messages to OpenAI format
    const openaiMessages = [
      { role: 'system', content: enhancedSystemPrompt },
      ...messages.map(msg => {
        if (msg.images && msg.images.length > 0) {
          // Message with images
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

    // Build request body
    const isReasoningModel = model.startsWith('o3') || model.startsWith('o4')
    const isNanoModel = model === 'gpt-5-nano'
    const requestBody = {
      model,
      messages: openaiMessages,
      max_completion_tokens: maxTokens,
      stream: true,
    }

    // Reasoning models (o3, o4-mini) and gpt-5-nano don't support custom temperature
    if (!isReasoningModel && !isNanoModel) {
      requestBody.temperature = temperature
    }

    // Web search models need special handling
    if (webSearch && model.includes('search')) {
      requestBody.tools = [{ type: 'web_search' }]
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
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
            const content = parsed.choices?.[0]?.delta?.content
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

  // Generate image using GPT Image API
  async generateImage(apiKey, prompt, options = {}) {
    const {
      model = 'gpt-image-1.5',
      size = '1024x1024',
      quality = 'standard',
      n = 1,
    } = options

    const response = await fetch(`${this.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        size,
        quality,
        n,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error?.message || `API error: ${response.status}`)
    }

    const data = await response.json()
    return data.data // Returns array of { url, revised_prompt }
  }

  // Generate video using Sora API
  async generateVideo(apiKey, prompt, options = {}) {
    const {
      model = 'sora-2',
      duration = 5,
      resolution = '1080p',
    } = options

    const response = await fetch(`${this.baseUrl}/videos/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        duration,
        resolution,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error?.message || `API error: ${response.status}`)
    }

    const data = await response.json()
    return data // Returns video URL or task ID for async processing
  }
}
