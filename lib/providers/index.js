import { AnthropicProvider } from './anthropic'
import { OpenAIProvider } from './openai'
import { GoogleProvider } from './google'
import { XAIProvider } from './xai'
import { DeepSeekProvider } from './deepseek'
import { CustomProvider } from './custom'

// Provider configurations - Updated to latest models (2026)
export const PROVIDERS = {
  anthropic: {
    name: 'Anthropic',
    id: 'anthropic',
    models: [
      { id: 'claude-opus-4-5-20250514', name: 'Claude Opus 4.5', supportsImages: true, maxTokens: 32000 },
      { id: 'claude-sonnet-4-5-20250514', name: 'Claude Sonnet 4.5', supportsImages: true, maxTokens: 64000 },
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', supportsImages: true, maxTokens: 64000 },
      { id: 'claude-haiku-4-20250514', name: 'Claude Haiku 4', supportsImages: true, maxTokens: 8192 },
    ],
    defaultModel: 'claude-sonnet-4-5-20250514',
    keyPrefix: 'sk-ant-',
    keyPlaceholder: 'sk-ant-...',
  },
  openai: {
    name: 'OpenAI',
    id: 'openai',
    models: [
      // GPT-5 Series (Latest)
      { id: 'gpt-5.2', name: 'GPT-5.2', supportsImages: true, maxTokens: 32768, isLatest: true },
      { id: 'gpt-5-mini', name: 'GPT-5 Mini', supportsImages: true, maxTokens: 32768 },
      { id: 'gpt-5-nano', name: 'GPT-5 Nano', supportsImages: true, maxTokens: 16384 },
      // Reasoning Models
      { id: 'o4-mini', name: 'o4-mini (Reasoning)', supportsImages: true, maxTokens: 65536, isReasoning: true },
      { id: 'o3', name: 'o3 (Reasoning)', supportsImages: true, maxTokens: 65536, isReasoning: true },
      // GPT-4 Series (Legacy but still good)
      { id: 'gpt-4.1', name: 'GPT-4.1', supportsImages: true, maxTokens: 32768 },
      { id: 'gpt-4o', name: 'GPT-4o', supportsImages: true, maxTokens: 16384 },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', supportsImages: true, maxTokens: 16384 },
      // Web Search Models
      { id: 'gpt-4o-search-preview', name: 'GPT-4o Search', supportsImages: true, maxTokens: 16384, supportsWebSearch: true },
    ],
    defaultModel: 'gpt-5.2',
    keyPrefix: 'sk-',
    keyPlaceholder: 'sk-...',
    // Image generation models (separate)
    imageModels: [
      { id: 'gpt-image-1.5', name: 'GPT Image 1.5' },
      { id: 'gpt-image-1', name: 'GPT Image 1' },
      { id: 'dall-e-3', name: 'DALL·E 3' },
    ],
    // Video generation models
    videoModels: [
      { id: 'sora-2', name: 'Sora 2' },
      { id: 'sora-2-pro', name: 'Sora 2 Pro' },
    ],
  },
  google: {
    name: 'Google',
    id: 'google',
    models: [
      // Gemini 3 Series (Latest)
      { id: 'gemini-3-pro', name: 'Gemini 3 Pro', supportsImages: true, maxTokens: 8192, isLatest: true },
      { id: 'gemini-3-flash', name: 'Gemini 3 Flash', supportsImages: true, maxTokens: 8192 },
      // Gemini 2.5 Series
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', supportsImages: true, maxTokens: 8192 },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', supportsImages: true, maxTokens: 8192 },
    ],
    defaultModel: 'gemini-3-flash',
    keyPrefix: 'AIza',
    keyPlaceholder: 'AIza...',
    // Image generation models
    imageModels: [
      { id: 'nano-banana-pro', name: 'Nano Banana Pro' },
      { id: 'nano-banana', name: 'Nano Banana' },
    ],
    // Video generation models
    videoModels: [
      { id: 'veo-3.1', name: 'Veo 3.1' },
    ],
  },
  xai: {
    name: 'xAI (Grok)',
    id: 'xai',
    models: [
      { id: 'grok-4', name: 'Grok 4', supportsImages: true, maxTokens: 131072, isLatest: true },
      { id: 'grok-3', name: 'Grok 3', supportsImages: true, maxTokens: 131072 },
      { id: 'grok-2', name: 'Grok 2', supportsImages: true, maxTokens: 131072 },
    ],
    defaultModel: 'grok-4',
    keyPrefix: 'xai-',
    keyPlaceholder: 'xai-...',
    // Uses new Responses API
    usesResponsesAPI: true,
  },
  deepseek: {
    name: 'DeepSeek',
    id: 'deepseek',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', supportsImages: false, maxTokens: 8192 },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', supportsImages: false, maxTokens: 8192 },
    ],
    defaultModel: 'deepseek-chat',
    keyPrefix: 'sk-',
    keyPlaceholder: 'sk-...',
  },
  custom: {
    name: 'Custom Endpoint',
    id: 'custom',
    models: [
      { id: 'custom-model', name: 'Custom Model', supportsImages: true, maxTokens: 32000 },
    ],
    defaultModel: 'custom-model',
    keyPrefix: '',
    keyPlaceholder: 'Your API key...',
    isCustom: true,
  },
}

// Default API endpoints
export const DEFAULT_ENDPOINTS = {
  anthropic: 'https://api.anthropic.com/v1',
  openai: 'https://api.openai.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1beta',
  xai: 'https://api.x.ai/v1',
  deepseek: 'https://api.deepseek.com',
  custom: '',
}

// Get provider instance
export const getProvider = (providerId, customEndpoint = null) => {
  const baseUrl = customEndpoint || DEFAULT_ENDPOINTS[providerId]

  switch (providerId) {
    case 'anthropic':
      return new AnthropicProvider(baseUrl)
    case 'openai':
      return new OpenAIProvider(baseUrl)
    case 'google':
      return new GoogleProvider(baseUrl)
    case 'xai':
      return new XAIProvider(baseUrl)
    case 'deepseek':
      return new DeepSeekProvider(baseUrl)
    case 'custom':
      return new CustomProvider(baseUrl)
    default:
      throw new Error(`Unknown provider: ${providerId}`)
  }
}

// Get provider config
export const getProviderConfig = (providerId) => {
  return PROVIDERS[providerId] || null
}

// Get all providers
export const getAllProviders = () => {
  return Object.values(PROVIDERS)
}

// Get model by ID
export const getModelById = (providerId, modelId) => {
  const provider = PROVIDERS[providerId]
  if (!provider) return null
  return provider.models.find(m => m.id === modelId) || null
}

// Check if model supports images
export const modelSupportsImages = (providerId, modelId) => {
  const model = getModelById(providerId, modelId)
  return model?.supportsImages || false
}

// Get default model for provider
export const getDefaultModel = (providerId) => {
  const provider = PROVIDERS[providerId]
  return provider?.defaultModel || null
}

// Get max tokens for a model
export const getModelMaxTokens = (providerId, modelId) => {
  const model = getModelById(providerId, modelId)
  return model?.maxTokens || 4096
}

// Get models for provider, with support for dynamic custom models
export const getProviderModels = (providerId, customModels = null) => {
  if (providerId === 'custom' && customModels && customModels.length > 0) {
    return customModels
  }
  return PROVIDERS[providerId]?.models || []
}

// Update custom provider models (returns a new provider config with updated models)
export const getCustomProviderWithModels = (customModels) => {
  const baseCustom = PROVIDERS.custom
  if (!customModels || customModels.length === 0) {
    return baseCustom
  }
  return {
    ...baseCustom,
    models: customModels,
    defaultModel: customModels[0]?.id || 'custom-model',
  }
}
