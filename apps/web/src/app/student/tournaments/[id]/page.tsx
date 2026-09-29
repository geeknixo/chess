'use client';

import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LeaderboardPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'matches'>('leaderboard');

  const { data: tournament, isLoading: loadingT } = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: async () => {
      const res = await api.get(`/tournaments/${tournamentId}`);
      return res.data.data;
    }
  });

  const { data: leaderboard, isLoading: loadingL } = useQuery({
    queryKey: ['leaderboard', tournamentId],
    queryFn: async () => {
      const res = await api.get(`/tournaments/${tournamentId}/leaderboard`);
      return res.data.data;
    }
  });

  const { data: matches, isLoading: loadingM } = useQuery({
    queryKey: ['matches', tournamentId],
    queryFn: async () => {
      const res = await api.get(`/tournaments/${tournamentId}/matches`);
      return res.data.data;
    }
  });

  if (loadingL || loadingT || loadingM) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto pt-16">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 tracking-tight">{tournament?.name} - Stats</h1>
          {tournament?.status === 'COMPLETED' && leaderboard?.[0] && (
            <p className="text-lg text-yellow-400 mt-2 font-bold flex items-center gap-2">🏆 <span className="text-white">Winner:</span> {leaderboard[0].email}</p>
          )}
        </div>
        <button onClick={() => router.back()} className="text-neutral-400 hover:text-white flex items-center gap-2 bg-neutral-900 px-4 py-2 rounded-full border border-neutral-800 transition-colors hover:border-neutral-600">Back</button>
      </div>

      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setActiveTab('leaderboard')} 
          className={`px-6 py-2 font-bold rounded-lg transition-all ${activeTab === 'leaderboard' ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-[0_0_15px_rgba(234,88,12,0.4)]' : 'bg-neutral-800/80 text-neutral-400 hover:bg-neutral-700'}`}
        >
          Leaderboard
        </button>
        <button 
          onClick={() => setActiveTab('matches')} 
          className={`px-6 py-2 font-bold rounded-lg transition-all ${activeTab === 'matches' ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-[0_0_15px_rgba(234,88,12,0.4)]' : 'bg-neutral-800/80 text-neutral-400 hover:bg-neutral-700'}`}
        >
          Match History
        </button>
      </div>

      {activeTab === 'leaderboard' && (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-neutral-950 border-b border-neutral-800">
              <tr>
                <th className="p-4 font-bold">Rank</th>
                <th className="p-4 font-bold">Player</th>
                <th className="p-4 font-bold text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard?.map((entry: any, index: number) => (
                <tr key={`${entry.email}-${index}`} className="border-b border-neutral-800/50 hover:bg-neutral-800/50">
                  <td className="p-4 text-orange-500 font-bold">#{index + 1}</td>
                  <td className="p-4">{entry.email}</td>
                  <td className="p-4 text-right font-mono text-lg">{entry.points}</td>
                </tr>
              ))}
              {leaderboard?.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-neutral-500">No participants have scored points yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'matches' && (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-neutral-950 border-b border-neutral-800">
              <tr>
                <th className="p-4 font-bold">White</th>
                <th className="p-4 font-bold">Black</th>
                <th className="p-4 font-bold">Result</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {matches?.map((m: any) => (
                <tr key={m.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/50">
                  <td className="p-4">{m.whiteEmail}</td>
                  <td className="p-4">{m.blackEmail}</td>
                  <td className="p-4 font-bold">{m.result || '-'}</td>
                  <td className="p-4 text-neutral-400">
                    {m.status === 'ACTIVE' ? (
                      <span className="text-green-500 font-bold animate-pulse">Live</span>
                    ) : (
                      m.terminationReason || m.status
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {m.status === 'ACTIVE' && (
                      <button 
                        onClick={() => router.push(`/play/${m.id}`)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                      >
                        Spectate 👀
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {matches?.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-neutral-500">No matches have been played yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
