import { chatbot } from '@/ai/flows/chatbot-flow';
import { writingAssistant } from '@/ai/flows/writing-assistant-flow';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Route handler for AI flows.
 * Handles streaming responses for Genkit-powered features.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ flow: string[] }> }
) {
  const { flow } = await params;
  const flowPath = flow.join('/');
  const json = await req.json();

  if (flowPath === 'chat') {
    const stream = await chatbot(json);
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  if (flowPath === 'assistant') {
    try {
      const result = await writingAssistant(json);
      return NextResponse.json(result);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'not found' }, { status: 404 });
}
