import Anthropic from '@anthropic-ai/sdk';
import { LlmClient } from './types';

export class ClaudeClient implements LlmClient {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-haiku-4-5-20251001') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async complete(prompt: string): Promise<string> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 16384,
      messages: [{ role: 'user', content: prompt }],
    });

    const block = message.content[0];
    if (block.type !== 'text') {
      throw new Error('Unexpected response type from Claude API');
    }
    return block.text;
  }
}
