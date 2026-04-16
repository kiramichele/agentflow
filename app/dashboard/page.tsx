'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [agent, setAgent] = useState<any>(null);
  const router = useRouter();

  // Check auth on mount
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // Get agent info
      const { data: agentData } = await supabase
        .from('agents')
        .select('*')
        .eq('email', session.user.email)
        .single();

      if (agentData) {
        setAgent(agentData);
        // Update agent status to online
        await supabase
          .from('agents')
          .update({ status: 'online' })
          .eq('id', agentData.id);
      }
    }
    checkAuth();
  }, [router]);

  // Load conversations
  useEffect(() => {
    async function loadConversations() {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('status', 'active')
        .order('updated_at', { ascending: false });

      if (data) setConversations(data);
    }
    loadConversations();

    // Subscribe to new conversations
    const channel = supabase
      .channel('conversations')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          setConversations(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConversation) return;

    async function loadMessages() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true });

      if (data) setMessages(data);
    }
    loadMessages();

    // Subscribe to new messages in this conversation
    const channel = supabase
      .channel(`messages-${selectedConversation.id}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedConversation]);

  async function sendMessage() {
    if (!input.trim() || !selectedConversation || !agent) return;

    const messageContent = input;
    setInput('');

    // Insert agent message
    await supabase.from('messages').insert({
      conversation_id: selectedConversation.id,
      sender_type: 'agent',
      sender_id: agent.id,
      content: messageContent,
    });

    // Update conversation to human mode
    await supabase
      .from('conversations')
      .update({ 
        routing_mode: 'human',
        assigned_agent_id: agent.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedConversation.id);
  }

  async function resolveConversation() {
    if (!selectedConversation) return;

    await supabase
      .from('conversations')
      .update({ status: 'resolved' })
      .eq('id', selectedConversation.id);

    setConversations(prev => prev.filter(c => c.id !== selectedConversation.id));
    setSelectedConversation(null);
    setMessages([]);
  }

  async function handleLogout() {
    if (agent) {
      await supabase
        .from('agents')
        .update({ status: 'offline' })
        .eq('id', agent.id);
    }
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (!agent) return <div className="p-8">Loading...</div>;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Conversation List */}
      <div className="w-80 bg-white border-r flex flex-col">
        <div className="p-4 border-b bg-blue-600 text-white">
          <h1 className="text-xl font-bold">AgentFlow</h1>
          <p className="text-sm opacity-90">Agent: {agent.name}</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-gray-500 text-center">
              No active conversations
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                  selectedConversation?.id === conv.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="font-semibold">
                  {conv.customer_name || 'Anonymous'}
                </div>
                <div className="text-sm text-gray-500">
                  {conv.routing_mode === 'ai' ? '🤖 AI' : '👤 Human'}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Area - Conversation View */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="bg-white border-b p-4 flex justify-between items-center">
              <div>
                <h2 className="font-semibold">
                  {selectedConversation.customer_name || 'Anonymous'}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedConversation.customer_email || 'No email provided'}
                </p>
              </div>
              <button
                onClick={resolveConversation}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Mark Resolved
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${
                  msg.sender_type === 'agent' ? 'justify-end' : 'justify-start'
                }`}>
                  <div className={`max-w-md px-4 py-2 rounded-lg ${
                    msg.sender_type === 'customer'
                      ? 'bg-gray-200 text-gray-800'
                      : msg.sender_type === 'agent'
                      ? 'bg-blue-600 text-white'
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    <div className="text-xs opacity-75 mb-1">
                      {msg.sender_type === 'customer' ? 'Customer' : 
                       msg.sender_type === 'agent' ? 'You' : 'AI Assistant'}
                    </div>
                    <div className="text-sm">{msg.content}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="bg-white border-t p-4">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && sendMessage()}
                  className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type your message..."
                />
                <button
                  onClick={sendMessage}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to start
          </div>
        )}
      </div>
    </div>
  );
}