'use client';

import { useState } from 'react';

interface InputFormProps {
  onSubmit: (input: { url?: string; text?: string }) => void;
  isLoading: boolean;
}

export default function InputForm({ onSubmit, isLoading }: InputFormProps) {
  const [inputType, setInputType] = useState<'url' | 'text'>('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (inputType === 'url') {
      if (!url.trim()) {
        setError('Please enter a URL');
        return;
      }
      onSubmit({ url: url.trim() });
    } else {
      if (!text.trim()) {
        setError('Please enter some text');
        return;
      }
      onSubmit({ text: text.trim() });
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="mb-4">
          <div className="flex gap-4 mb-4">
            <button
              type="button"
              onClick={() => setInputType('url')}
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                inputType === 'url'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              URL
            </button>
            <button
              type="button"
              onClick={() => setInputType('text')}
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                inputType === 'text'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Paste Text
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {inputType === 'url' ? (
              <div className="mb-4">
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                  Recipe URL (YouTube, blog, or social media)
                </label>
                <input
                  type="url"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
            ) : (
              <div className="mb-4">
                <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
                  Paste recipe text
                </label>
                <textarea
                  id="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste recipe content here..."
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-600 text-white py-3 px-6 rounded-md font-medium hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Extracting Recipe...' : 'Extract Recipe'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
