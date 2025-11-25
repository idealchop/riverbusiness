'use server';

/**
 * @fileOverview An AI agent that suggests personalized water consumption goals to users.
 *
 * - suggestConsumptionGoals - A function that suggests personalized water consumption goals.
 * - SuggestConsumptionGoalsInput - The input type for the suggestConsumptionGoals function.
 * - SuggestConsumptionGoalsOutput - The return type for the suggestConsumptionGoals function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestConsumptionGoalsInputSchema = z.object({
  pastUsageData: z
    .string()
    .describe(
      'Past water consumption data for the user. Include dates, amounts (gallons/liters), and any relevant context (e.g., season, weather conditions).'    ),
  userGoals: z
    .string()
    .optional()
    .describe('User-defined goals for water consumption reduction.'),
  externalConditions: z
    .string()
    .optional()
    .describe('Information about current external conditions (e.g., weather, local water restrictions).'),
  seasonalData: z
    .string()
    .optional()
    .describe('Information about typical seasonal water usage patterns.'),
});
export type SuggestConsumptionGoalsInput = z.infer<typeof SuggestConsumptionGoalsInputSchema>;

const SuggestConsumptionGoalsOutputSchema = z.object({
  suggestedGoal: z
    .string()
    .describe(
      'A personalized suggested water consumption goal for the user, including a specific target amount (gallons/liters) and a timeframe.'
    ),
  rationale: z
    .string()
    .describe(
      'A detailed explanation of why this goal is suggested, based on the user’s past usage, goals, and external conditions.'
    ),
  feedback: z
    .string()
    .optional()
    .describe(
      'Feedback to encourage reduction in water consumption, tailored to the user’s situation.'
    ),
});
export type SuggestConsumptionGoalsOutput = z.infer<typeof SuggestConsumptionGoalsOutputSchema>;

export async function suggestConsumptionGoals(
  input: SuggestConsumptionGoalsInput
): Promise<SuggestConsumptionGoalsOutput> {
  return suggestConsumptionGoalsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestConsumptionGoalsPrompt',
  input: {schema: SuggestConsumptionGoalsInputSchema},
  output: {schema: SuggestConsumptionGoalsOutputSchema},
  prompt: `You are an AI assistant designed to suggest personalized water consumption goals to users, considering their past usage, goals, external conditions, and seasonal data.

  Analyze the provided data and suggest a realistic and achievable water consumption goal.

  Past Usage Data: {{{pastUsageData}}}
  User-Defined Goals: {{{userGoals}}}
  External Conditions: {{{externalConditions}}}
  Seasonal Data: {{{seasonalData}}}

  Based on this information, suggest a personalized water consumption goal, provide a rationale for the suggestion, and offer feedback to encourage reduction in water consumption.

  Output your answer in JSON format, with the keys "suggestedGoal", "rationale", and "feedback". The "suggestedGoal" should include a specific target amount (gallons/liters) and a timeframe.
`,
});

const suggestConsumptionGoalsFlow = ai.defineFlow(
  {
    name: 'suggestConsumptionGoalsFlow',
    inputSchema: SuggestConsumptionGoalsInputSchema,
    outputSchema: SuggestConsumptionGoalsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
