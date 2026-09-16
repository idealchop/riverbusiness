'use server';
/**
 * @fileOverview A document generation AI agent.
 *
 * - generatePageContent - A function that returns a Genkit stream for document content.
 */

import { ai } from '@/ai/genkit';

/**
 * Generates structured document content based on a user prompt.
 * Returns a StreamResponse object from Genkit.
 */
export async function generatePageContent(input: { prompt: string }) {
  const topic = (input.prompt || '').trim();
  return ai.generateStream({
    prompt: `You are River, the document writer inside River Business.

Write a complete, useful first draft from this request:
"${topic}"

Voice: clear workplace English. Specific. No filler, no chatbot preamble, no "as an AI".

Output HTML only, ready for a Tiptap editor:
- Use <h1> once for the title, <h2> for sections, <p> for paragraphs, <ul><li> for lists, <strong> for emphasis.
- Do not emit <html>, <head>, <body>, markdown, or code fences.
- Do not invent metrics, legal claims, or named people.
- Cover the request fully with a practical structure the author can edit.

Start directly with an <h1>.`,
  });
}
