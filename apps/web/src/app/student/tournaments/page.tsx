'use client';

import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';

export default function StudentTournaments() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [queueing, setQueueing] = useState(false);
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    api.get('/auth/me').then(res => {
      if (res.data.data.role !== 'STUDENT') {
        router.push('/coach/tournaments');
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

  useEffect(() => {
    const s = getSocket();
    s.connect();
    
    s.on('matchmaking:matched', (data: { matchId: string }) => {
      setQueueing(false);
      router.push(`/play/${data.matchId}`);
    });

    setSocket(s);
    return () => { s.disconnect(); };
  }, [router]);

  const joinMutation = useMutation({
    mutationFn: (id: string) => api.post(`/tournaments/${id}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
    onError: (err: any) => alert(err.response?.data?.error || err.response?.data?.message || 'Failed to join tournament')
  });

  const queueMutation = useMutation({
    mutationFn: (id: string) => api.post(`/matchmaking/queue`, { tournamentId: id }),
    onSuccess: (res) => {
      if (res.data.data.matched) {
        router.push(`/play/${res.data.data.matchId}`);
      } else {
        setQueueing(true);
      }
    },
    onError: (err: any) => alert(err.response?.data?.error || err.response?.data?.message || 'Failed to enter queue')
  });

  if (isLoading) return <div className="p-8">Loading tournaments...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto pt-16">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 tracking-tight">Student Dashboard</h1>
          <p className="text-neutral-400 mt-2">Enter an arena and battle</p>
        </div>
        <button onClick={() => { api.post('/auth/logout'); router.push('/login'); }} className="text-neutral-400 hover:text-white flex items-center gap-2 bg-neutral-900 px-4 py-2 rounded-full border border-neutral-800 transition-colors hover:border-neutral-600">
          Logout
        </button>
      </div>

      {queueing && (
        <div className="glass-panel border-blue-500/50 p-6 rounded-2xl mb-12 flex justify-between items-center bg-blue-950/20 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border-t-2 border-r-2 border-blue-400 animate-spin"></div>
            <div>
              <h3 className="font-bold text-blue-200 text-xl tracking-wide">Searching for Opponent...</h3>
              <p className="text-sm text-blue-400 mt-1">Please wait in queue. The battle begins soon.</p>
            </div>
          </div>
          <button onClick={() => { api.delete('/matchmaking/queue'); setQueueing(false); }} className="neon-button bg-red-600/80 hover:bg-red-500 px-6 py-2 rounded-lg text-white font-bold tracking-widest uppercase text-sm border border-red-500">Cancel</button>
        </div>
      )}

      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">🏆</span>
        Active Tournaments
      </h2>

      <div className="grid gap-6">
        {tournaments?.map((t: any) => (
          <div key={t.id} className="glass-panel p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all hover:border-orange-500/30">
            <div>
              <h2 className="text-2xl font-bold">{t.name}</h2>
              <div className="mt-2 flex gap-3 items-center">
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${t.status === 'ONGOING' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-neutral-800 text-neutral-400'}`}>
                  {t.status}
                </span>
                <span className="text-xs bg-neutral-800/80 px-3 py-1 rounded-full text-neutral-400 font-mono">
                  {t.timeControlInitialMinutes}+{t.timeControlIncrementSeconds}
                </span>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => router.push(`/student/tournaments/${t.id}`)} className="bg-neutral-800 hover:bg-neutral-700 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors border border-neutral-700/50">Leaderboard</button>
              
              {!t.hasJoined && t.status === 'OPEN' && (
                <button onClick={() => joinMutation.mutate(t.id)} className="bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-lg font-bold text-white text-sm transition-colors shadow-[0_0_10px_rgba(37,99,235,0.4)]">
                  Register
                </button>
              )}

              {t.hasJoined && (t.status === 'OPEN' || t.status === 'ONGOING') && (
                <button 
                  onClick={() => queueMutation.mutate(t.id)} 
                  disabled={queueing} 
                  className="neon-button bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:opacity-50 disabled:hover:shadow-none disabled:hover:translate-y-0 px-6 py-2.5 rounded-lg font-bold text-white uppercase tracking-wide border border-orange-500/50"
                >
                  Find Opponent ⚔️
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
