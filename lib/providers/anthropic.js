// Anthropic (Claude) Provider
export class AnthropicProvider {
  constructor(baseUrl = 'https://api.anthropic.com/v1') {
    this.baseUrl = baseUrl
  }

  async *sendMessage(apiKey, messages, options = {}) {
    const {
      model = 'claude-sonnet-4-6',
      systemPrompt = 'You are a helpful assistant.',
      temperature = 0.7,
      maxTokens = 4096,
      signal,
      thinking = false,
      webSearch = false,
      mathEnabled = false,
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

    // Add math tool capabilities to system prompt if enabled
    if (mathEnabled) {
      enhancedSystemPrompt += '\n\n[MATH & COMPUTATION TOOL]\n' +
        'You have advanced mathematical computation capabilities. When solving math problems:\n' +
        '- Show your work step-by-step\n' +
        '- Use LaTeX notation for mathematical expressions (wrap in $...$ for inline or $$...$$ for block)\n' +
        '- For complex calculations, write out intermediate steps clearly\n' +
        '- Verify your answers by checking your work\n' +
        '- Handle algebra, calculus, statistics, linear algebra, number theory, and more\n' +
        '- For numerical computations, provide exact values when possible and decimal approximations when helpful'
    }

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
      system: enhancedSystemPrompt,
      messages: anthropicMessages,
      stream: true,
    }

    // Add web search tool if enabled
    if (webSearch) {
      requestBody.tools = [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 5,
        },
      ]
    }

    // Extended thinking requires special handling
    if (thinking) {
      // max_tokens must be greater than budget_tokens
      // Set budget_tokens to 80% of maxTokens, and increase max_tokens to accommodate both
      const budgetTokens = maxTokens
      requestBody.max_tokens = budgetTokens + Math.max(Math.floor(budgetTokens * 0.25), 1024)
      requestBody.thinking = {
        type: 'enabled',
        budget_tokens: budgetTokens,
      }
      // Temperature must be 1 for thinking mode (don't set it, API defaults to 1)
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
    let inSearchBlock = false
    let searchCitations = []

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
              // Handle web search tool use and results
              if (parsed.content_block?.type === 'server_tool_use' && parsed.content_block?.name === 'web_search') {
                inSearchBlock = true
                yield '\n🔍 *Searching the web...*\n\n'
              }
              // Handle web search results
              if (parsed.content_block?.type === 'web_search_tool_result') {
                inSearchBlock = false
                const results = parsed.content_block?.content
                if (Array.isArray(results)) {
                  for (const result of results) {
                    if (result.type === 'web_search_result') {
                      searchCitations.push({ title: result.title, url: result.url })
                    }
                  }
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

            // At end of message, append citations if we have any
            if (parsed.type === 'message_delta' && parsed.delta?.stop_reason === 'end_turn' && searchCitations.length > 0) {
              yield '\n\n---\n**Sources:**\n'
              for (const cite of searchCitations) {
                yield `- [${cite.title}](${cite.url})\n`
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
          model: 'claude-haiku-4-5-20251001',
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
