import { chatbot } from '@/ai/flows/chatbot-flow';
import { writingAssistant } from '@/ai/flows/writing-assistant-flow';
import { generatePageContent } from '@/ai/flows/generate-page-flow';
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
    try {
      const { stream } = await chatbot(json);
      const responseStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          for await (const chunk of stream) {
            if (chunk.text) {
              controller.enqueue(encoder.encode(chunk.text));
            }
          }
          controller.close();
        },
      });
      return new Response(responseStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (flowPath === 'generate') {
    try {
      const { stream } = await generatePageContent(json);
      const responseStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          for await (const chunk of stream) {
            if (chunk.text) {
              controller.enqueue(encoder.encode(chunk.text));
            }
          }
          controller.close();
        },
      });
      return new Response(responseStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
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
