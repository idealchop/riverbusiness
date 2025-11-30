import { chatbot } from '@/ai/flows/chatbot-flow';
import { NextRequest, NextResponse } from 'next/server';
import { streamToResponse } from 'ai';

export async function POST(
  req: NextRequest,
  { params }: { params: { flow: string[] } }
) {
  const flow = params.flow.join('/');
  const json = await req.json();

  if (flow === 'chat') {
    const stream = await chatbot(json);
    return streamToResponse(stream);
  }

  return NextResponse.json({ error: 'not found' }, { status: 404 });
}
