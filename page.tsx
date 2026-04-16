import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white p-12 rounded-2xl shadow-2xl max-w-2xl text-center">
        <h1 className="text-5xl font-bold text-gray-800 mb-4">
          AgentFlow
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Real-time AI-powered customer support chat
        </p>
        
        <div className="space-y-4">
          <Link 
            href="/chat"
            className="block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition"
          >
            Customer Chat Demo
          </Link>
          
          <Link 
            href="/login"
            className="block bg-gray-800 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-900 transition"
          >
            Agent Login
          </Link>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Built with Next.js, Supabase, and Claude AI
          </p>
        </div>
      </div>
    </div>
  );
}
