'use server';
/**
 * @fileoverview A chatbot flow for the River Business app.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Message } from '@vercel/ai';

const ChatbotInputSchema = z.object({
  messages: z.array(z.custom<Message>()),
});
export type ChatbotInput = z.infer<typeof ChatbotInputSchema>;

export async function chatbot(input: ChatbotInput) {
  const { stream } = ai.generateStream({
    prompt: `You are a helpful assistant for the River Business app.
    The user is asking for help with their water consumption.
    Be concise and helpful.

    Here is the conversation history:
    ${input.messages.map((m) => `${m.role}: ${m.content}`).join('\n')}
    `,
    history: input.messages.map((m) => ({
      role: m.role,
      content: [{ text: m.content as string }],
    })),
  });

  return stream.text();
}
