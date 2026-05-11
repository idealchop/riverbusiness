'use server';
/**
 * @fileOverview AI Writing Assistant for collaborative documents.
 * 
 * - writingAssistant - A function that handles the writing assistance process.
 * - WritingAssistantInput - The input type for the writingAssistant function.
 * - WritingAssistantOutput - The return type for the writingAssistant function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const WritingAssistantInputSchema = z.object({
  text: z.string().describe('The text to process.'),
  action: z.enum([
    'improve',
    'rewrite',
    'fix-grammar',
    'summarize',
    'expand',
    'professional',
    'simplify',
    'continue'
  ]).describe('The action to perform on the text.'),
  context: z.string().optional().describe('Surrounding document context for better understanding.'),
});
export type WritingAssistantInput = z.infer<typeof WritingAssistantInputSchema>;

const WritingAssistantOutputSchema = z.object({
  suggestedText: z.string().describe('The improved or processed text.'),
  rationale: z.string().optional().describe('Brief explanation of why the changes were made.'),
});
export type WritingAssistantOutput = z.infer<typeof WritingAssistantOutputSchema>;

export async function writingAssistant(input: WritingAssistantInput): Promise<WritingAssistantOutput> {
  return writingAssistantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'writingAssistantPrompt',
  input: { schema: WritingAssistantInputSchema },
  output: { schema: WritingAssistantOutputSchema },
  prompt: `You are an expert writing assistant and editor integrated into a high-fidelity business document workspace.
  
  Action to perform: {{action}}
  Target Text: """{{text}}"""
  {{#if context}}Document Context: """{{context}}"""{{/if}}

  Your goal is to perform the requested action while maintaining the professional tone of River Business.
  - If 'continue', write the next few logical sentences or a paragraph that follows the user's thought.
  - If 'fix-grammar', focus on accuracy and clarity without rewriting the entire style unless it's broken.
  - If 'professional', adjust the vocabulary and structure to be suitable for an executive corporate environment.
  - If 'simplify', break down complex jargon or sentences into clear, accessible language.

  Return the result as a JSON object with the "suggestedText" field containing the updated text.`,
});

const writingAssistantFlow = ai.defineFlow(
  {
    name: 'writingAssistantFlow',
    inputSchema: WritingAssistantInputSchema,
    outputSchema: WritingAssistantOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
