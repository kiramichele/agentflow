import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server'; // Changed this line
import { generateAIResponse } from '@/lib/anthropic';

export async function POST(request: NextRequest) {
  const { conversationId } = await request.json();

  // Get conversation history
  const { data: messages } = await supabaseServer // Changed this
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (!messages) {
    return NextResponse.json({ error: 'No messages found' }, { status: 404 });
  }

  // Convert to Anthropic message format
  const conversationHistory = messages.map(msg => ({
    role: (msg.sender_type === 'customer' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: msg.content,
  }));

  // Generate AI response
  const aiResponse = await generateAIResponse(conversationHistory);

  // Insert AI response into messages table
  const { data: newMessage, error } = await supabaseServer // Changed this
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_type: 'ai',
      content: aiResponse,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: newMessage });
}