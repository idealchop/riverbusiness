
'use server';

/**
 * @fileOverview This file defines a Genkit flow for predicting future water consumption.
 *
 * - predictFutureConsumption - A function that predicts future water consumption based on past usage.
 * - PredictFutureConsumptionInput - The input type for the predictFutureConsumption function.
 * - PredictFutureConsumptionOutput - The return type for the predictFutureConsumption function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictFutureConsumptionInputSchema = z.object({
  pastUsageData: z
    .array(z.object({
      date: z.string().describe('Date of consumption data point (YYYY-MM-DD).'),
      consumptionContainers: z.number().describe('Water consumption in containers.'),
    }))
    .describe('Historical water consumption data.'),
  externalConditions: z
    .string()
    .optional()
    .describe('Description of relevant external conditions (e.g., weather).'),
  seasonalData: z
    .string()
    .optional()
    .describe('Description of seasonal data that might influence consumption.'),
  consumptionGoals: z
    .string()
    .optional()
    .describe('User-defined goals for water consumption reduction.'),
});
export type PredictFutureConsumptionInput = z.infer<typeof PredictFutureConsumptionInputSchema>;

const PredictFutureConsumptionOutputSchema = z.object({
  predictedConsumption: z
    .array(z.object({
      date: z.string().describe('Date of predicted consumption (YYYY-MM-DD).'),
      predictedContainers: z.number().describe('Predicted water consumption in containers.'),
    }))
    .describe('Predicted future water consumption.'),
  feedback: z
    .string()
    .optional()
    .describe('Feedback to the user encouraging reduction in water consumption.'),
});
export type PredictFutureConsumptionOutput = z.infer<typeof PredictFutureConsumptionOutputSchema>;

export async function predictFutureConsumption(input: PredictFutureConsumptionInput): Promise<PredictFutureConsumptionOutput> {
  return predictFutureConsumptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictFutureConsumptionPrompt',
  input: {schema: PredictFutureConsumptionInputSchema},
  output: {schema: PredictFutureConsumptionOutputSchema},
  prompt: `You are an expert in predicting water consumption based on historical data,
  external conditions, seasonal data, and user-defined goals.

  Analyze the following data to predict future water consumption:

  Past Usage Data:
  {{#each pastUsageData}}
  - Date: {{this.date}}, Consumption: {{this.consumptionContainers}} containers
  {{/each}}

  {{#if externalConditions}}
  External Conditions: {{externalConditions}}
  {{/if}}

  {{#if seasonalData}}
  Seasonal Data: {{seasonalData}}
  {{/if}}

  {{#if consumptionGoals}}
  Consumption Goals: {{consumptionGoals}}
  {{/if}}

  Based on this information, provide a prediction of future water consumption for the next 7 days,
  formatted as an array of date and predicted consumption in containers. Also, provide feedback to the
  user encouraging them to reduce their water consumption, be encouraging and kind.

  Ensure the output matches the required JSON schema.
  `,
});

const predictFutureConsumptionFlow = ai.defineFlow(
  {
    name: 'predictFutureConsumptionFlow',
    inputSchema: PredictFutureConsumptionInputSchema,
    outputSchema: PredictFutureConsumptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
