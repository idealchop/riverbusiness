import { chatbot } from '@/ai/flows/chatbot-flow';
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
    // chatbot returns a ReadableStream<string>
    const stream = await chatbot(json);
    
    // In Next.js App Router and AI SDK v3+, simply return a Response with the stream.
    // The browser will handle the stream chunks as they arrive.
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  return NextResponse.json({ error: 'not found' }, { status: 404 });
}
