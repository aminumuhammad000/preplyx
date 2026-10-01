// AI Service for handling API calls to different AI providers

export interface AIResponse {
  content: string;
  error?: string;
}

export interface AIProviderConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

class AIService {
  // OpenAI/ChatGPT
  async chatWithChatGPT(message: string, config: AIProviderConfig): Promise<AIResponse> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: message }],
          temperature: config.temperature || 0.7,
          max_tokens: config.maxTokens || 1000
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to get response from ChatGPT');
      }

      const data = await response.json();
      return {
        content: data.choices[0].message.content
      };
    } catch (error) {
      return {
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Google Gemini
  async chatWithGemini(message: string, config: AIProviderConfig): Promise<AIResponse> {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: message }] }],
          generationConfig: {
            temperature: config.temperature || 0.7,
            maxOutputTokens: config.maxTokens || 1000
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to get response from Gemini');
      }

      const data = await response.json();
      return {
        content: data.candidates[0].content.parts[0].text
      };
    } catch (error) {
      return {
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // xAI Grok
  async chatWithGrok(message: string, config: AIProviderConfig): Promise<AIResponse> {
    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model || 'grok-beta',
          messages: [{ role: 'user', content: message }],
          temperature: config.temperature || 0.7,
          max_tokens: config.maxTokens || 1000
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to get response from Grok');
      }

      const data = await response.json();
      return {
        content: data.choices[0].message.content
      };
    } catch (error) {
      return {
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Anthropic Claude
  async chatWithClaude(message: string, config: AIProviderConfig): Promise<AIResponse> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: config.model || 'claude-3-haiku-20240307',
          max_tokens: config.maxTokens || 1000,
          messages: [{ role: 'user', content: message }]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to get response from Claude');
      }

      const data = await response.json();
      return {
        content: data.content[0].text
      };
    } catch (error) {
      return {
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Microsoft Copilot (Azure OpenAI)
  async chatWithCopilot(message: string, config: AIProviderConfig): Promise<AIResponse> {
    try {
      // Azure OpenAI endpoint - you'll need to configure this
      const endpoint = config.model || 'https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2023-05-15';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': config.apiKey
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: message }],
          temperature: config.temperature || 0.7,
          max_tokens: config.maxTokens || 1000
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to get response from Copilot');
      }

      const data = await response.json();
      return {
        content: data.choices[0].message.content
      };
    } catch (error) {
      return {
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Perplexity AI
  async chatWithPerplexity(message: string, config: AIProviderConfig): Promise<AIResponse> {
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model || 'llama-3.1-sonar-small-128k-online',
          messages: [{ role: 'user', content: message }],
          temperature: config.temperature || 0.7,
          max_tokens: config.maxTokens || 1000
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to get response from Perplexity');
      }

      const data = await response.json();
      return {
        content: data.choices[0].message.content
      };
    } catch (error) {
      return {
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Mistral AI
  async chatWithMistral(message: string, config: AIProviderConfig): Promise<AIResponse> {
    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model || 'mistral-small-latest',
          messages: [{ role: 'user', content: message }],
          temperature: config.temperature || 0.7,
          max_tokens: config.maxTokens || 1000
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to get response from Mistral');
      }

      const data = await response.json();
      return {
        content: data.choices[0].message.content
      };
    } catch (error) {
      return {
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Meta Llama (via various providers)
  async chatWithLlama(message: string, config: AIProviderConfig): Promise<AIResponse> {
    try {
      // Using Groq as an example provider for Llama
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model || 'llama3-8b-8192',
          messages: [{ role: 'user', content: message }],
          temperature: config.temperature || 0.7,
          max_tokens: config.maxTokens || 1000
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to get response from Llama');
      }

      const data = await response.json();
      return {
        content: data.choices[0].message.content
      };
    } catch (error) {
      return {
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Generic method to call any provider
  async chatWithProvider(provider: string, message: string, config: AIProviderConfig): Promise<AIResponse> {
    switch (provider.toLowerCase()) {
      case 'chatgpt':
        return this.chatWithChatGPT(message, config);
      case 'gemini':
        return this.chatWithGemini(message, config);
      case 'grok':
        return this.chatWithGrok(message, config);
      case 'claude':
        return this.chatWithClaude(message, config);
      case 'copilot':
        return this.chatWithCopilot(message, config);
      case 'perplexity':
        return this.chatWithPerplexity(message, config);
      case 'mistral':
        return this.chatWithMistral(message, config);
      case 'llama':
        return this.chatWithLlama(message, config);
      default:
        return {
          content: '',
          error: `Unsupported provider: ${provider}`
        };
    }
  }
}

export const aiService = new AIService();