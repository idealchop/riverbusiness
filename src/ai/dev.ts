import { config } from 'dotenv';
config();

import '@/ai/flows/predict-future-consumption.ts';
import '@/ai/flows/suggest-consumption-goals.ts';
import '@/ai/flows/chatbot-flow.ts';
