'use client';

import { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { getSocket } from '@/lib/socket';
import { api } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';

export default function PlayMatch() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;

  const [socket, setSocket] = useState<any>(null);
  const [chess] = useState(new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [turn, setTurn] = useState<'w'|'b'>('w');
  const [whiteTime, setWhiteTime] = useState(0);
  const [blackTime, setBlackTime] = useState(0);
  const [gameResult, setGameResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [blackPlayerId, setBlackPlayerId] = useState<string | null>(null);
  const [whiteEmail, setWhiteEmail] = useState<string>('White Player');
  const [blackEmail, setBlackEmail] = useState<string>('Black Player');
  const [optionSquares, setOptionSquares] = useState<any>({});
  const [turnGlowSquares, setTurnGlowSquares] = useState<any>({});
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [moveFrom, setMoveFrom] = useState<string | null>(null);

  useEffect(() => {
    api.get('/auth/me').then(res => setUserId(res.data.data.id)).catch(() => {});
  }, []);

  useEffect(() => {
    const s = getSocket();
    s.connect();

    s.on('connect', () => {
      s.emit('match:join', { matchId });
    });

    s.on('match:state', (state: any) => {
      chess.loadPgn(state.pgn);
      setFen(chess.fen());
      setTurn(state.turn);
      setWhiteTime(state.whiteTimeMs);
      setBlackTime(state.blackTimeMs);
      setBlackPlayerId(state.blackPlayerId);
      if (state.whiteEmail) setWhiteEmail(state.whiteEmail);
      if (state.blackEmail) setBlackEmail(state.blackEmail);
    });

    s.on('match:end', (result: any) => {
      setGameResult(result);
      if (result.pgn) {
        chess.loadPgn(result.pgn);
        setFen(chess.fen());
      }
    });

    s.on('match:viewers', (data: any) => {
      // Room size minus 2 players. If negative, 0.
      setSpectatorCount(Math.max(0, data.count - 2));
    });

    s.on('match:error', (err: any) => {
      setError(err.message);
      s.emit('match:join', { matchId });
    });

    setSocket(s);
    return () => { s.disconnect(); };
  }, [matchId]);

  // Update piece glow whenever fen or turn changes
  useEffect(() => {
    const glows: any = {};
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.color === turn) {
          const square = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'][c] + (8 - r);
          glows[square] = {
            boxShadow: 'inset 0 0 15px rgba(249, 115, 22, 0.4)', // Minor orange glow inside the square
          };
        }
      }
    }
    setTurnGlowSquares(glows);
  }, [fen, turn, chess]);

  // Very basic clock tick visualization
  useEffect(() => {
    if (gameResult) return;
    const interval = setInterval(() => {
      if (turn === 'w') setWhiteTime(prev => Math.max(0, prev - 1000));
      else setBlackTime(prev => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [turn, gameResult]);

  const boardOrientation: 'white' | 'black' = (userId && blackPlayerId && userId === blackPlayerId) ? 'black' : 'white';

  const getMoveOptions = (square: string) => {
    if (gameResult) return false;
    const piece = chess.get(square as any);
    if (!piece) return false;

    const moves = chess.moves({ square: square as any, verbose: true });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: any = {};
    moves.forEach((m: any) => {
      newSquares[m.to] = {
        background: 'radial-gradient(circle, rgba(0,0,0,.3) 25%, transparent 25%)',
        borderRadius: '50%',
      };
    });
    newSquares[square] = {
      background: 'rgba(255, 255, 0, 0.4)',
    };
    setOptionSquares(newSquares);
    return true;
  };

  const onSquareClick = (square: string) => {
    if (gameResult) return;
    
    // If we click the same square we selected, deselect it
    if (moveFrom === square) {
      setMoveFrom(null);
      setOptionSquares({});
      return;
    }

    if (!moveFrom) {
      const hasMoves = getMoveOptions(square);
      if (hasMoves) setMoveFrom(square);
      return;
    }

    const pieceColor = chess.get(moveFrom as any)?.color;
    const isPromotion = pieceColor === 'w' && moveFrom[1] === '7' && square[1] === '8' ||
                        pieceColor === 'b' && moveFrom[1] === '2' && square[1] === '1';

    const move = {
      from: moveFrom,
      to: square,
      ...(isPromotion && { promotion: 'q' })
    };

    try {
      const legal = chess.move(move);
      if (legal) {
        setFen(chess.fen());
        socket?.emit('match:move', { matchId, ...move });
      }
    } catch (e: any) {
      setError('Invalid move: ' + e.message);
      const hasMoves = getMoveOptions(square);
      if (hasMoves) setMoveFrom(square);
      else {
        setMoveFrom(null);
        setOptionSquares({});
      }
      return;
    }

    setMoveFrom(null);
    setOptionSquares({});
  };

  const onPieceDragBegin = (piece: string, sourceSquare: string) => {
    getMoveOptions(sourceSquare);
  };

  const onDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
    setOptionSquares({});
    setMoveFrom(null);
    
    if (gameResult) return false;
    
    const pieceColor = piece[0]; 
    const isPromotion = pieceColor === 'w' && sourceSquare[1] === '7' && targetSquare[1] === '8' ||
                        pieceColor === 'b' && sourceSquare[1] === '2' && targetSquare[1] === '1';

    const move = {
      from: sourceSquare,
      to: targetSquare,
      ...(isPromotion && { promotion: 'q' })
    };

    try {
      const legal = chess.move(move);
      if (legal) {
        setFen(chess.fen()); // Optimistic update
        socket?.emit('match:move', { matchId, ...move });
        setError(''); // clear error
        return true;
      }
    } catch (e: any) {
      setError('Invalid move: ' + e.message);
      return false;
    }
    return false;
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isMyTurn = (turn === 'w' && boardOrientation === 'white') || (turn === 'b' && boardOrientation === 'black');

  return (
    <div className="min-h-screen bg-neutral-950 p-8 text-neutral-200">
      <div className="max-w-5xl mx-auto mb-8 text-center">
        {gameResult ? (
          <h1 className="text-4xl font-extrabold text-orange-500 uppercase tracking-widest">Game Over</h1>
        ) : (
          <h1 className={`text-4xl font-extrabold uppercase tracking-widest transition-colors duration-300 ${isMyTurn ? 'text-green-500 animate-pulse' : 'text-neutral-500'}`}>
            {isMyTurn ? "🔥 It's Your Turn! 🔥" : "Waiting for opponent..."}
          </h1>
        )}
      </div>

      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-start">
        
        <div className="flex-1 w-full max-w-[600px] border-4 border-neutral-800 rounded">
          <Chessboard 
            {...({
              boardOrientation,
              position: fen,
              onPieceDrop: onDrop,
              onPieceDragBegin: onPieceDragBegin,
              onSquareClick: onSquareClick,
              onPieceClick: (piece: string, square: string) => onSquareClick(square),
              customSquareStyles: { ...turnGlowSquares, ...optionSquares },
              customDarkSquareStyle: { backgroundColor: '#779556' },
              customLightSquareStyle: { backgroundColor: '#ebecd0' },
              arePiecesDraggable: true,
            } as any)}
          />
        </div>

        <div className="flex-1 glass-panel p-6 rounded-2xl w-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              Live Match <span className="text-sm font-normal text-neutral-500 ml-2">(Playing as {boardOrientation})</span>
            </h2>
            {spectatorCount > 0 && (
              <span className="bg-blue-900/50 text-blue-300 border border-blue-500 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                {spectatorCount} Spectator{spectatorCount !== 1 ? 's' : ''} Watching
              </span>
            )}
          </div>
          
          {error && <div className="text-red-500 mb-4 text-sm bg-red-950/30 border border-red-900 p-3 rounded font-semibold">{error}</div>}
          
          <div className="space-y-6 mb-8 flex-1">
            <div className={`p-5 rounded-xl border transition-all duration-300 ${turn === 'b' ? 'border-orange-500 bg-neutral-800 shadow-[0_0_20px_rgba(249,115,22,0.3)] scale-[1.02]' : 'border-neutral-700 opacity-50'}`}>
              <div className="font-bold flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded bg-black border border-neutral-600 shadow-lg"></div>
                  <span className="text-lg">{blackEmail}</span>
                  {turn === 'b' && <span className="text-xs bg-orange-600 px-2 py-1 rounded text-white animate-pulse uppercase tracking-wider">Turn</span>}
                </div>
                <span className="font-mono text-3xl tracking-wider">{formatTime(blackTime)}</span>
              </div>
            </div>
            
            <div className={`p-5 rounded-xl border transition-all duration-300 ${turn === 'w' ? 'border-orange-500 bg-neutral-800 shadow-[0_0_20px_rgba(249,115,22,0.3)] scale-[1.02]' : 'border-neutral-700 opacity-50'}`}>
              <div className="font-bold flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded bg-white border border-neutral-400 shadow-lg"></div>
                  <span className="text-lg">{whiteEmail}</span>
                  {turn === 'w' && <span className="text-xs bg-orange-600 px-2 py-1 rounded text-white animate-pulse uppercase tracking-wider">Turn</span>}
                </div>
                <span className="font-mono text-3xl tracking-wider">{formatTime(whiteTime)}</span>
              </div>
            </div>
          </div>

          {!gameResult && (
            <button onClick={() => socket?.emit('match:resign', { matchId })} className="w-full bg-red-900/50 hover:bg-red-900 border border-red-500 text-red-200 py-2 rounded">
              Resign
            </button>
          )}

          {gameResult && (
            <div className="mt-8 p-4 bg-orange-950/50 border border-orange-500 rounded text-center">
              <h3 className="text-xl font-bold text-orange-400 mb-2">Game Over</h3>
              <p>{gameResult.reason}</p>
              <button onClick={() => router.push('/student/tournaments')} className="mt-4 bg-orange-600 px-4 py-2 rounded text-white font-bold">
                Back to Tournaments
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
