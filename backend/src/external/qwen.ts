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

/**
 * 通义千问文本 Embedding API 接口
 * 使用 OpenAI 兼容模式
 * 文档: https://help.aliyun.com/zh/dashscope/developer-reference/text-embedding-api-details
 */
export async function callQwenEmbedding(text: string): Promise<number[]> {
  try {
    const response = await axios({
      method: 'POST',
      url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings',
      headers: {
        'Authorization': `Bearer ${env.openai.apiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: 'text-embedding-v3',
        input: text,
        dimensions: 1024,
        encoding_format: 'float'
      }
    })

    // OpenAI 兼容格式：response.data.data[0].embedding
    if (response.data.data && response.data.data.length > 0) {
      return response.data.data[0].embedding
    }

    throw new Error('embedding 返回数据格式异常: ' + JSON.stringify(response.data))
  } catch (error: any) {
    const detail = error?.response?.data || error.message
    console.error('[Qwen Embedding] 调用失败:', detail)
    throw error
  }
}

/**
 * 通义千问中译英（使用 OpenAI 兼容 chat 格式，短文本翻译更稳定）
 */
export async function translateZhToEn(text: string): Promise<string> {
  const response = await axios({
    method: 'POST',
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    headers: {
      'Authorization': `Bearer ${env.openai.apiKey}`,
      'Content-Type': 'application/json'
    },
    data: {
      model: env.openai.model || 'qwen-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional translator. Translate the following Chinese text to English. ' +
            'Rules:\n' +
            '1. Only output the English translation, nothing else (no quotes, no explanations).\n' +
            '2. Keep it concise and natural.\n' +
            '3. For place names, use standard English names (e.g. "东方明珠塔" → "Oriental Pearl Tower").\n' +
            '4. For addresses, use natural English address format.'
        },
        { role: 'user', content: text }
      ],
      max_tokens: 512,
      temperature: 0.1
    }
  })

  return response.data.choices?.[0]?.message?.content?.trim() || ''
}

/**
 * 批量生成文本 embedding
 */
export async function batchCallQwenEmbedding(texts: string[]): Promise<number[][]> {
  try {
    const response = await axios({
      method: 'POST',
      url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings',
      headers: {
        'Authorization': `Bearer ${env.openai.apiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: 'text-embedding-v3',
        input: texts,
        dimensions: 1024,
        encoding_format: 'float'
      }
    })

    if (response.data.data) {
      return response.data.data.map((item: any) => item.embedding)
    }

    throw new Error('batch embedding 返回数据格式异常: ' + JSON.stringify(response.data))
  } catch (error: any) {
    const detail = error?.response?.data || error.message
    console.error('[Qwen Batch Embedding] 调用失败:', detail)
    throw error
  }
}
