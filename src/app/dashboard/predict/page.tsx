'use client';

import React, { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { predictFutureConsumption, PredictFutureConsumptionOutput } from '@/ai/flows/predict-future-consumption';
import { suggestConsumptionGoals, SuggestConsumptionGoalsOutput } from '@/ai/flows/suggest-consumption-goals';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { consumptionData } from '@/lib/data';
import { Loader2, Wand2, Lightbulb } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

const predictSchema = z.object({
  externalConditions: z.string().optional(),
  seasonalData: z.string().optional(),
  consumptionGoals: z.string().optional(),
});

const suggestSchema = z.object({
  userGoals: z.string().optional(),
  externalConditions: z.string().optional(),
  seasonalData: z.string().optional(),
});

type PredictFormValues = z.infer<typeof predictSchema>;
type SuggestFormValues = z.infer<typeof suggestSchema>;

const chartConfig = {
  predicted: {
    label: "Predicted Gallons",
    color: "hsl(var(--chart-2))",
  },
};

export default function PredictivePage() {
  const { toast } = useToast();
  const [isPredicting, startPredictionTransition] = useTransition();
  const [isSuggesting, startSuggestionTransition] = useTransition();

  const [predictionResult, setPredictionResult] = useState<PredictFutureConsumptionOutput | null>(null);
  const [suggestionResult, setSuggestionResult] = useState<SuggestConsumptionGoalsOutput | null>(null);
  
  const predictForm = useForm<PredictFormValues>({
    resolver: zodResolver(predictSchema),
    defaultValues: {
      externalConditions: 'Sunny and dry weather expected.',
      seasonalData: 'Mid-summer, traditionally high usage period.',
      consumptionGoals: 'Reduce overall consumption by 10% this month.',
    }
  });

  const suggestForm = useForm<SuggestFormValues>({
    resolver: zodResolver(suggestSchema),
    defaultValues: {
      userGoals: 'I want to save water and reduce my bill.',
      externalConditions: 'Local water restrictions are in effect on weekends.',
      seasonalData: 'Entering a rainy season, less need for outdoor watering.',
    }
  });

  const handlePredictSubmit = (values: PredictFormValues) => {
    startPredictionTransition(async () => {
      try {
        const result = await predictFutureConsumption({
          pastUsageData: consumptionData,
          ...values,
        });
        setPredictionResult(result);
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Prediction Failed',
          description: 'Could not generate a prediction. Please try again.',
        });
      }
    });
  };

  const handleSuggestSubmit = (values: SuggestFormValues) => {
    startSuggestionTransition(async () => {
      try {
        const pastUsageString = consumptionData
          .slice(-30)
          .map(d => `Date: ${d.date}, Usage: ${d.consumptionGallons} gallons`)
          .join('; ');
        
        const result = await suggestConsumptionGoals({
          pastUsageData: pastUsageString,
          ...values
        });
        setSuggestionResult(result);
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Suggestion Failed',
          description: 'Could not generate a suggestion. Please try again.',
        });
      }
    });
  };

  return (
    <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Future Consumption Prediction</CardTitle>
          <CardDescription>Use AI to predict your water usage for the next 7 days based on various factors.</CardDescription>
        </CardHeader>
        <Form {...predictForm}>
          <form onSubmit={predictForm.handleSubmit(handlePredictSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={predictForm.control}
                name="externalConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>External Conditions</FormLabel>
                    <FormControl><Input placeholder="e.g., Weather forecast, local events" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={predictForm.control}
                name="seasonalData"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seasonal Data</FormLabel>
                    <FormControl><Input placeholder="e.g., Summer, holiday season" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={predictForm.control}
                name="consumptionGoals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Consumption Goals</FormLabel>
                    <FormControl><Textarea placeholder="e.g., Reduce garden watering by 20%" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isPredicting}>
                {isPredicting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Predict Usage
              </Button>
            </CardFooter>
          </form>
        </Form>
        {predictionResult && (
          <CardContent className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold">Prediction Results</h3>
            <p className="text-sm text-muted-foreground">{predictionResult.feedback}</p>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <AreaChart accessibilityLayer data={predictionResult.predictedConsumption} margin={{ left: -20, right: 20, top: 10, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Area dataKey="predictedGallons" type="natural" fill="var(--color-predicted)" fillOpacity={0.4} stroke="var(--color-predicted)" name="Predicted Gallons" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        )}
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Personalized Goal Suggestions</CardTitle>
          <CardDescription>Let our AI suggest a personalized water consumption goal for you.</CardDescription>
        </CardHeader>
        <Form {...suggestForm}>
          <form onSubmit={suggestForm.handleSubmit(handleSuggestSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={suggestForm.control}
                name="userGoals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What are your personal goals?</FormLabel>
                    <FormControl><Textarea placeholder="e.g., Save money, be more eco-friendly" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={suggestForm.control}
                name="externalConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Any specific conditions?</FormLabel>
                    <FormControl><Input placeholder="e.g., New water-saving appliance installed" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSuggesting}>
                {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                Suggest a Goal
              </Button>
            </CardFooter>
          </form>
        </Form>
        {suggestionResult && (
          <CardContent className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold">AI-Powered Suggestion</h3>
              <div className="space-y-2 rounded-lg border bg-background p-4">
                <p className="font-semibold text-primary">{suggestionResult.suggestedGoal}</p>
                <p className="text-sm text-muted-foreground">{suggestionResult.rationale}</p>
                {suggestionResult.feedback && <p className="text-sm italic">"{suggestionResult.feedback}"</p>}
              </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
