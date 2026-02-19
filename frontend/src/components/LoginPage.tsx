import React, { useState } from 'react';

const THEME_KEY = 'zpl-label-theme';
const API_BASE_URL = '/api';

export default function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const darkMode = localStorage.getItem(THEME_KEY) === 'dark';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Login failed');
      }

      const { access_token } = await res.json();
      onLogin(access_token);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const bg = darkMode ? 'bg-zinc-950' : 'bg-gray-50';
  const card = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200';
  const input = darkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-white border-gray-300 text-gray-800';
  const label = darkMode ? 'text-zinc-400' : 'text-gray-500';
  const title = darkMode ? 'text-zinc-200' : 'text-gray-900';

  return (
    <div className={`min-h-screen flex items-center justify-center ${bg} font-mono`}>
      <form onSubmit={handleSubmit} className={`p-8 rounded-lg border shadow-sm w-80 ${card}`}>
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-2xl text-emerald-500">&#9703;</span>
          <h1 className={`text-lg font-bold ${title}`}>ZPL Label Designer</h1>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-500 text-center">{error}</div>
        )}

        <div className="mb-4">
          <label className={`block text-xs font-medium ${label} uppercase tracking-wide mb-1.5`}>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            className={`w-full px-3 py-2 ${input} border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500`}
          />
        </div>

        <div className="mb-6">
          <label className={`block text-xs font-medium ${label} uppercase tracking-wide mb-1.5`}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full px-3 py-2 ${input} border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500`}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2.5 bg-emerald-500 text-black font-semibold rounded-md hover:bg-emerald-400 transition-colors disabled:opacity-50 text-sm"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
