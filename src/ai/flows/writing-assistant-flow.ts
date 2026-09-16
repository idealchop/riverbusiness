'use server';
/**
 * @fileOverview AI writing assistant for workspace documents.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const WritingAssistantInputSchema = z.object({
  text: z.string().describe('The selected text, or the full document if nothing is selected.'),
  action: z.enum([
    'improve',
    'rewrite',
    'fix-grammar',
    'summarize',
    'expand',
    'professional',
    'simplify',
    'continue',
    'custom'
  ]).describe('The action to perform on the text.'),
  customGoal: z.string().optional().describe('A custom instruction or goal for the AI to achieve.'),
  context: z.string().optional().describe('Surrounding document context for better understanding.'),
});
export type WritingAssistantInput = z.infer<typeof WritingAssistantInputSchema>;

const WritingAssistantOutputSchema = z.object({
  suggestedText: z.string().describe('The rewritten document text only. No preamble.'),
  rationale: z.string().optional().describe('One short sentence describing what changed.'),
});
export type WritingAssistantOutput = z.infer<typeof WritingAssistantOutputSchema>;

export async function writingAssistant(input: WritingAssistantInput): Promise<WritingAssistantOutput> {
  return writingAssistantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'writingAssistantPrompt',
  input: { schema: WritingAssistantInputSchema },
  output: { schema: WritingAssistantOutputSchema },
  config: {
    temperature: 0.4,
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  },
  prompt: `You are River, the in-document writing partner for River Business collaboration docs.

Voice:
- Clear, calm, and specific. Sound like a sharp colleague, not a chatbot and not a lawyer.
- Prefer short sentences and concrete words. Cut filler ("leverage", "high-fidelity", "synergy", "robust", "going forward").
- Keep the author's meaning, facts, names, numbers, dates, and commitments. Never invent data, quotes, or people.
- Match the original language. Do not translate unless asked.
- Keep a human tone. Do not add greetings, apologies, or "as an AI".

{{#if customGoal}}
User request: {{{customGoal}}}
{{else}}
Task: {{action}}
{{/if}}

{{#if text}}
Source text:
"""
{{{text}}}
"""
{{else}}
The document is empty. Draft useful content from the user request or task.
{{/if}}

{{#if context}}
Broader document (for context only — do not copy it unless needed):
"""
{{{context}}}
"""
{{/if}}

Task guide:
- improve: Tighten clarity and flow. Keep the same length unless the original is repetitive.
- rewrite: Same meaning, stronger wording. Do not add new claims.
- fix-grammar: Fix spelling, grammar, and punctuation only. Do not restyle.
- summarize: Short, faithful summary. Use bullets if there are several points.
- expand: Add useful detail and structure. Stay on topic; do not pad.
- professional: Polite workplace tone. Still plain English.
- simplify: Easier to read. Keep every important fact.
- continue: Write the next natural paragraph(s) only. Do not repeat the source.
- custom: Follow the user request exactly. If they asked a question, answer it. If they asked to write something new, write it.

Output rules:
- suggestedText must be the usable document text only.
- Do not wrap the result in quotes, markdown fences, or JSON in the text itself.
- Do not include labels like "Here is the rewrite".
- Separate paragraphs with a blank line.
- Use "- " at the start of a line for bullet lists.
- rationale: one short sentence, max 18 words.
`,
});

const writingAssistantFlow = ai.defineFlow(
  {
    name: 'writingAssistantFlow',
    inputSchema: WritingAssistantInputSchema,
    outputSchema: WritingAssistantOutputSchema,
  },
  async input => {
    const text = (input.text || '').trim();
    const goal = (input.customGoal || '').trim();
    if (!text && input.action !== 'custom' && input.action !== 'continue') {
      throw new Error('Select some text, or describe what you want written.');
    }
    if (input.action === 'custom' && !goal) {
      throw new Error('Tell the assistant what you want it to do.');
    }

    const context = (input.context || '').trim();
    const trimmedContext = context && context !== text
      ? context.slice(0, 6000)
      : undefined;

    const { output } = await prompt({
      ...input,
      text: text.slice(0, 12000),
      customGoal: goal || undefined,
      context: trimmedContext,
    });

    const suggestedText = (output?.suggestedText || '').trim();
    if (!suggestedText) {
      throw new Error('The assistant could not draft a suggestion. Try a shorter selection or a clearer request.');
    }

    return {
      suggestedText,
      rationale: output?.rationale?.trim() || undefined,
    };
  }
);
