import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <h1 className="text-4xl font-bold">AI Packing List Generator</h1>

        <p className="text-lg text-gray-600 dark:text-gray-400">
          A learning project demonstrating LLM tool-calling patterns through a practical application.
        </p>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Learning Goals</h2>
          <ul className="text-left space-y-2 max-w-md mx-auto">
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>How to invoke tools from LLM responses</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>How to stream actions from the frontend</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Implement a chat interface using streaming to collaborate with AI</span>
            </li>
          </ul>
        </div>

        <div className="pt-8">
          <Link
            href="/chat"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start Chat
          </Link>
        </div>

        <div className="pt-8 text-sm text-gray-500">
          <p>Features: Weather API Integration • AI-Generated Recommendations • PDF Export</p>
        </div>
      </div>
    </div>
  );
}
