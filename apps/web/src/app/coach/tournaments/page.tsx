'use client';

import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CoachTournaments() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');

  useEffect(() => {
    api.get('/auth/me').then(res => {
      if (res.data.data.role !== 'COACH') {
        router.push('/student/tournaments');
      }
    }).catch(() => router.push('/login'));
  }, [router]);

  const { data: tournaments, isLoading } = useQuery({
    queryKey: ['tournaments'],
    queryFn: async () => {
      const res = await api.get('/tournaments');
      return res.data.data;
    }
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/tournaments', { name, timeControlInitialMinutes: 5 }),
    onSuccess: () => {
      setName('');
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to create tournament')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => api.patch(`/tournaments/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to update tournament')
  });

  return (
    <div className="p-8 max-w-5xl mx-auto pt-16">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 tracking-tight">Coach Dashboard</h1>
          <p className="text-neutral-400 mt-2">Manage your arenas</p>
        </div>
        <button onClick={() => { api.post('/auth/logout'); router.push('/login'); }} className="text-neutral-400 hover:text-white flex items-center gap-2 bg-neutral-900 px-4 py-2 rounded-full border border-neutral-800 transition-colors hover:border-neutral-600">
          Logout
        </button>
      </div>

      <div className="glass-panel p-8 rounded-2xl mb-12">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">⚔️</span>
          Create Tournament
        </h2>
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="Tournament Name" 
            value={name} 
            onChange={e => setName(e.target.value)}
            className="flex-1 bg-black/40 border border-neutral-700/50 rounded-xl p-4 text-white focus:outline-none focus:border-orange-500/70 focus:ring-1 focus:ring-orange-500/70 transition-all text-lg"
          />
          <button 
            onClick={() => createMutation.mutate()} 
            disabled={!name}
            className="neon-button bg-gradient-to-r from-orange-600 to-red-600 px-8 py-4 rounded-xl font-bold text-white tracking-wide uppercase disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            Create (5+0)
          </button>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-6">All Tournaments</h2>
      {isLoading ? <p>Loading...</p> : (
        <div className="grid gap-4">
          {tournaments?.map((t: any) => (
            <div key={t.id} className="glass-panel p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:border-orange-500/30">
              <div>
                <h3 className="text-xl font-bold">{t.name}</h3>
                <div className="mt-2 flex gap-2">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${t.status === 'ONGOING' ? 'bg-orange-500/20 text-orange-400' : 'bg-neutral-800 text-neutral-400'}`}>
                    {t.status}
                  </span>
                  <span className="text-xs bg-neutral-800 px-3 py-1 rounded-full text-neutral-400">5+0 Rapid</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => router.push(`/student/tournaments/${t.id}`)} className="text-sm font-semibold bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-lg transition-colors">Stats</button>
                {t.status === 'DRAFT' && <button onClick={() => updateMutation.mutate({ id: t.id, status: 'OPEN' })} className="text-sm font-semibold bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-lg transition-colors">Open</button>}
                {t.status === 'OPEN' && <button onClick={() => updateMutation.mutate({ id: t.id, status: 'ONGOING' })} className="neon-button text-sm font-semibold bg-blue-600 px-4 py-2 rounded-lg text-white">Start</button>}
                {t.status === 'ONGOING' && <button onClick={() => updateMutation.mutate({ id: t.id, status: 'COMPLETED' })} className="neon-button text-sm font-semibold bg-green-600 px-4 py-2 rounded-lg text-white">Complete</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
