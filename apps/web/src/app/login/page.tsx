'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123'); // prefill for easy test
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.success) {
        if (data.data.role === 'COACH') {
          router.push('/coach/tournaments');
        } else {
          router.push('/student/tournaments');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center">
      <form onSubmit={handleLogin} className="flex flex-col gap-4 glass-panel p-10 rounded-2xl w-96">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600 tracking-tight">
            Kingdom of Chess
          </h1>
          <p className="text-neutral-400 text-sm mt-2">Enter the arena</p>
        </div>
        
        {error && <div className="text-red-400 text-sm bg-red-950/40 border border-red-900/50 p-3 rounded-lg text-center">{error}</div>}

        <div>
          <label className="text-sm font-semibold text-neutral-300">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1.5 bg-black/40 border border-neutral-700/50 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500/70 focus:ring-1 focus:ring-orange-500/70 transition-all"
            placeholder="player@kingdomofchess.com"
          />
        </div>
        
        <div className="mb-4">
          <label className="text-sm font-semibold text-neutral-300">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1.5 bg-black/40 border border-neutral-700/50 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500/70 focus:ring-1 focus:ring-orange-500/70 transition-all"
          />
        </div>

        <button type="submit" className="neon-button bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-3 rounded-lg tracking-wide uppercase text-sm">
          Log In
        </button>
      </form>
    </div>
  );
}
