'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ChatWidget() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Create conversation on mount
  useEffect(() => {
    async function initConversation() {
      const { data, error } = await supabase
        .from('conversations')
        .insert({ customer_name: 'Anonymous', status: 'active' })
        .select()
        .single();
      
      if (data) {
        console.log('Conversation created:', data.id);
        setConversationId(data.id);
        // Load existing messages
        loadMessages(data.id);
      }
    }
    initConversation();
  }, []);

  async function loadMessages(convId: string) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    
    console.log('Loaded messages:', data?.length);
    if (data) setMessages(data);
  }

  // Subscribe to new messages
  useEffect(() => {
    if (!conversationId) return;

    console.log('Setting up Realtime subscription for:', conversationId);

    const channel = supabase
      .channel('messages')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, 
        (payload) => {
          console.log('Realtime message received:', payload);
          setMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => { 
      console.log('Cleaning up Realtime subscription');
      supabase.removeChannel(channel); 
    };
  }, [conversationId]);

  async function sendMessage() {
    if (!input.trim() || !conversationId || isLoading) return;

    const messageContent = input;
    setInput('');
    setIsLoading(true);

    console.log('Sending message:', messageContent);

    // Send customer message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_type: 'customer',
      content: messageContent
    });

    // Trigger AI response
    console.log('Triggering AI response...');
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId })
    });

    console.log('AI response status:', response.status);
    setIsLoading(false);
  }

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto p-4 bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg flex flex-col h-full">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 rounded-t-lg">
          <h2 className="text-lg font-semibold">AgentFlow Support</h2>
          <p className="text-sm opacity-90">We're here to help!</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${
              msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'
            }`}>
              <div className={`max-w-xs px-4 py-2 rounded-lg ${
                msg.sender_type === 'customer' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-800'
              }`}>
                {msg.sender_type === 'ai' && (
                  <div className="text-xs opacity-75 mb-1">AI Assistant</div>
                )}
                <div className="text-sm">{msg.content}</div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && sendMessage()}
              disabled={isLoading}
              className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your message..."
            />
            <button 
              onClick={sendMessage} 
              disabled={isLoading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}