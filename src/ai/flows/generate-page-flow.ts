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
  return ai.generateStream({
    prompt: `You are an expert document architect. Your task is to generate a comprehensive, professional, and well-structured document based on the user's prompt.
    
    User Prompt: "${input.prompt}"
    
    Output Requirements:
    - Format: HTML (suitable for a rich text editor like Tiptap/ProseMirror).
    - Structure: Use <h1> for titles, <h2> for sections, <p> for paragraphs, <ul>/<li> for lists, <strong> for emphasis.
    - Style: Professional, informative, and high-fidelity.
    - Content: ONLY provide the HTML tags and content. Do not include <html>, <body> or any meta tags. Do not use Markdown characters like # or *.
    
    Example Output:
    <h1>Project Roadmap</h1><p>The following phases outline the execution...</p><h2>Phase 1</h2><ul><li>Requirement gathering</li></ul>`,
  });
}
