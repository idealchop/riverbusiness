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
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  },
  prompt: `You are an expert writing assistant and editor for a high-fidelity business platform.
  Perform the following action: {{action}}
  
  Target Text: """{{text}}"""
  {{#if context}}Surrounding Context: """{{context}}"""{{/if}}

  Rules:
  - Return ONLY the improved text within the JSON output.
  - Maintain the existing format and intent.
  - Tone: Professional, clear, and consistent.
  
  Actions Guide:
  - improve: Make the text better, clearer, and more engaging.
  - rewrite: Express the same idea using more effective vocabulary.
  - fix-grammar: Correct spelling, punctuation, and grammatical structure.
  - summarize: Condense the text into its most important points.
  - expand: Elaborate on the ideas with relevant detail.
  - professional: Adjust tone for executive or formal corporate communication.
  - simplify: Make the text easier to read while retaining all core meaning.
  - continue: Generate the next logical paragraph or sentences based on the context.

  Return the result as a JSON object with the "suggestedText" field.`,
});

const writingAssistantFlow = ai.defineFlow(
  {
    name: 'writingAssistantFlow',
    inputSchema: WritingAssistantInputSchema,
    outputSchema: WritingAssistantOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    if (!output || !output.suggestedText) {
      throw new Error('The AI was unable to generate a suggestion for this text. Please try refining your selection.');
    }
    return output;
  }
);
