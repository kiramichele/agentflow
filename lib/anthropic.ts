import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function generateAIResponse(conversationHistory: { role: 'user' | 'assistant'; content: string }[]) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1000,
    system: [
      {
        type: 'text',
        text: `You are a helpful customer support AI assistant. Be friendly, concise, and professional.
    If the customer asks for a human agent or if you can't help, acknowledge their request and let them know
    an agent will assist them shortly.`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: conversationHistory,
  });

  return message.content[0].type === 'text' ? message.content[0].text : '';
}