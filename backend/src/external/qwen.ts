import axios from 'axios'
import { env } from '../config/env'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function callQwen(messages: Message[]): Promise<string> {
  const response = await axios({
    method: 'POST',
    url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    headers: {
      'Authorization': `Bearer ${env.openai.apiKey}`,
      'Content-Type': 'application/json'
    },
    data: {
      model: env.openai.model || 'qwen-turbo',
      input: {
        messages
      },
      parameters: {
        result_format: 'text'
      }
    }
  })

  return response.data.output.text
}
