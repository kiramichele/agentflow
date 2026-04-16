'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestSupabase() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .limit(1);
        
        if (error) {
          setError(error);
        } else {
          setResult(data);
        }
      } catch (err) {
        setError(err);
      }
    }
    testConnection();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      
      <div className="mb-4">
        <strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}
      </div>
      
      <div className="mb-4">
        <strong>Anon Key (first 20 chars):</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20)}...
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {JSON.stringify(error, null, 2)}
        </div>
      )}
      
      {result && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <strong>Success!</strong> Connection working. Found {result.length} conversations.
        </div>
      )}
    </div>
  );
}