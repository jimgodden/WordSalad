import { useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor
} from '@dnd-kit/core';
import { useGameStore, type WordItem } from './store/gameStore';
import { WordBank } from './components/WordBank';
import { ResponseArea } from './components/ResponseArea';
import { DraggableWord } from './components/DraggableWord';
import { Trophy, User, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const {
    phase,
    prompt,
    connect,
    createRoom,
    joinRoom,
    startGame,
    startNextRound,
    moveWordToResponse,
    moveWordToBank,
    submitSalad,
    vote,
    reorderResponse,
    roomId,
    players,
    submissions,
    voters,
    round
  } = useGameStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeWord, setActiveWord] = useState<WordItem | null>(null);

  // Sensors for better mobile support
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // Slight delay to distinguish scroll from drag
        tolerance: 5,
      },
    })
  );

  // Vote Tracking (Local)
  const [votedFor, setVotedFor] = useState<Set<string>>(new Set());

  const handleVote = (category: 'funny' | 'saucy', targetId: string) => {
    vote(category, targetId);
    setVotedFor(prev => new Set(prev).add(targetId));
  };

  // Lobby State
  const [inputName, setInputName] = useState('');
  const [inputRoom, setInputRoom] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('👨‍🍳');
  const [menuState, setMenuState] = useState<'main' | 'create' | 'join'>('main');
  const [copied, setCopied] = useState(false);

  const AVATARS = ['👨‍🍳', '👩‍🍳', '🥞', '🍕', '🍔', '🌮', '🍣', '🤖'];

  useEffect(() => {
    connect();

    // Check for invite link
    const params = new URLSearchParams(window.location.search);
    const inviteRoom = params.get('room');
    if (inviteRoom) {
      setInputRoom(inviteRoom.toUpperCase());
      setMenuState('join');
    }
  }, [connect]);

  // Reset voting state when round changes
  useEffect(() => {
    setVotedFor(new Set());
  }, [round]);

  const copyInviteLink = async () => {
    if (!roomId) return;
    const url = `${window.location.origin}/?room=${roomId}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for non-secure context (mobile dev)
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
        } catch (err) {
          console.error('Fallback copy failed', err);
        }
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // ... drag handlers (unchanged) ...
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    setActiveWord(active.data.current?.word);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) { setActiveId(null); setActiveWord(null); return; }

    const activeId = active.id as string;
    const overId = over.id as string;

    // 1. Reordering within Response Area
    if (active.data.current?.source === 'response' && over.data.current?.source === 'response') {
      if (activeId !== overId) {
        reorderResponse(activeId, overId);
      }
    }
    // 2. Dragging from Bank -> Response
    else if (over.id === 'response-zone' || over.data.current?.source === 'response') {
      moveWordToResponse(activeId);
    }
    // 3. Dragging from Response -> Bank (Remove)
    else if (over.id === 'bank-zone') {
      moveWordToBank(activeId);
    }

    setActiveId(null); setActiveWord(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-8 font-sans overflow-x-hidden">
      <header className="mb-8 text-center relative z-10 px-4">
        <motion.h1
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-4xl font-black text-green-600 tracking-tight flex items-center justify-center gap-2"
        >
          <span className="text-4xl">🍝</span>

          Linguistic Linguini
        </motion.h1>
        {roomId && (
          <div className="flex flex-col items-center gap-2 mt-2">
            <div className="flex gap-4 justify-center">
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                Room: {roomId}
                {phase === 'lobby' && (
                  <button
                    onClick={copyInviteLink}
                    className="hover:bg-green-200 p-1 rounded-full transition-colors"
                    title="Copy Invite Link"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </span>
              <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-bold">
                Round: {round}
              </span>
            </div>
            {copied && <span className="text-xs text-green-600 font-bold animate-pulse">Link Copied!</span>}
          </div>
        )}
      </header>

      <main className="w-full max-w-2xl px-4 flex-1 flex flex-col gap-6 relative z-0">

        <AnimatePresence mode="wait">
          {phase === 'lobby' && !roomId && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-6"
            >
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center max-w-sm w-full">
                <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Enter Kitchen</h2>

                <div className="flex flex-col gap-4">
                  {/* Avatar Picker */}
                  <div className="flex flex-col gap-2 mb-2">
                    <label className="text-left text-sm font-bold text-slate-400 uppercase tracking-widest pl-2">Choose Chef</label>
                    <div className="flex gap-2 justify-center bg-slate-100 p-2 rounded-xl flex-wrap">
                      {AVATARS.map((avatar, index) => (
                        <button
                          key={avatar}
                          data-testid={`avatar-btn-${index}`}
                          onClick={() => setSelectedAvatar(avatar)}
                          className={`text-2xl p-2 rounded-lg transition-transform hover:scale-110 active:scale-95 ${selectedAvatar === avatar ? 'bg-white shadow-md scale-110 ring-2 ring-green-400' : 'opacity-50 hover:opacity-100'}`}
                        >
                          {avatar}
                        </button>
                      ))}
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Your Name"
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:border-green-400 outline-none"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                  />

                  {menuState === 'main' && (
                    <>
                      <button
                        data-testid="create-game-btn"
                        onClick={() => setMenuState('create')}
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-colors"
                      >
                        Create New Game
                      </button>
                      <button
                        data-testid="join-game-btn"
                        onClick={() => setMenuState('join')}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-colors"
                      >
                        Join Game
                      </button>
                    </>
                  )}

                  {menuState === 'create' && (
                    <>
                      <button
                        data-testid="launch-room-btn"
                        onClick={() => createRoom(inputName || 'Chef', selectedAvatar)}
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl shadow-md"
                      >
                        🚀 Launch Room
                      </button>
                      <button
                        onClick={() => setMenuState('main')}
                        className="text-slate-400 font-bold hover:text-slate-600"
                      >
                        Back
                      </button>
                    </>
                  )}

                  {menuState === 'join' && (
                    <>
                      <input
                        data-testid="room-code-input"
                        type="text"
                        placeholder="ROOM CODE (e.g. ABCD)"
                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:border-green-400 outline-none uppercase"
                        value={inputRoom}
                        onChange={(e) => setInputRoom(e.target.value.toUpperCase())}
                      />
                      <button
                        data-testid="join-room-confirm-btn"
                        onClick={() => joinRoom(inputRoom, inputName || 'Sous Chef', selectedAvatar)}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl shadow-md"
                      >
                        Join Room
                      </button>
                      <button
                        onClick={() => setMenuState('main')}
                        className="text-slate-400 font-bold hover:text-slate-600"
                      >
                        Back
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {phase === 'lobby' && roomId && (
            <motion.div
              key="lobby-waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center gap-6"
            >
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center w-full">
                <h2 className="text-xl font-bold text-slate-400 mb-4">Chefs in the Kitchen</h2>
                <div className="flex flex-wrap gap-4 justify-center mb-8">
                  {Object.values(players).map((p) => (
                    <div key={p.name} className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-2 relative shadow-inner">
                        <span className="text-4xl filter drop-shadow-sm">{p.avatar || '👨‍🍳'}</span>
                        <div className="absolute -top-1 -right-1 bg-yellow-400 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm">
                          {p.score}
                        </div>
                      </div>
                      <span className="font-bold text-slate-700">{p.name}</span>
                    </div>
                  ))}
                </div>

                {(players[useGameStore.getState().socket?.id || '']?.isHost) ? (
                  <button
                    data-testid="start-game-btn"
                    onClick={() => { console.log('🖱️ Button START GAME Clicked'); startGame(); }}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg animate-bounce"
                  >
                    Start Game
                  </button>
                ) : (
                  <p className="text-slate-400 animate-pulse">Waiting for host to start cooking...</p>
                )}
              </div>
            </motion.div>
          )}

          {phase === 'prompt' && (
            <motion.div
              key="prompt"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center"
            >
              <h2 className="text-2xl font-bold text-slate-400 mb-4 animate-pulse">Get Ready...</h2>
              <motion.div
                initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                className="text-4xl font-black text-slate-800 text-center leading-tight px-4"
              >
                "{prompt}"
              </motion.div>
            </motion.div>
          )}

          {(phase === 'construction' || phase === 'voting') && (
            <motion.div
              key="game"
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
              className="flex flex-col gap-6"
            >
              <div className="bg-white/50 p-6 rounded-2xl border border-slate-200 text-center shadow-sm">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Prompt</p>
                <p className="text-xl md:text-2xl font-bold text-slate-800">"{prompt}"</p>
              </div>

              {phase === 'construction' && !submissions[useGameStore.getState().socket?.id || ''] ? (
                <DndContext
                  sensors={sensors}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <ResponseArea />
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <WordBank />
                  </motion.div>
                  <DragOverlay>
                    {activeId && activeWord ? (
                      <div className="opacity-90 scale-105 rotate-3 pointer-events-none">
                        <DraggableWord id={activeId} word={activeWord} source="bank" />
                      </div>
                    ) : null}
                  </DragOverlay>
                  <div className="self-end flex gap-2">
                    <button
                      onClick={useGameStore.getState().swapHand}
                      disabled={useGameStore.getState().hasUsedMulligan}
                      className="bg-red-100 text-red-600 font-bold py-3 px-4 rounded-full hover:bg-red-200 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Swap Hand (Once per round)"
                    >
                      🔄 Swap
                    </button>
                    <motion.button
                      layout
                      data-testid="submit-salad-btn"
                      onClick={submitSalad}
                      className="bg-slate-800 text-white font-bold py-3 px-8 rounded-full hover:bg-slate-700 transition-colors shadow-lg active:scale-95"
                    >
                      Order Up!
                    </motion.button>
                  </div>
                </DndContext>
              ) : phase === 'construction' && (
                <div className="flex flex-col items-center justify-center py-12 bg-white/50 rounded-2xl border border-dashed border-green-300">
                  <div className="bg-green-100 p-4 rounded-full mb-4">
                    <span className="text-4xl">🍝</span>
                  </div>
                  <h3 className="text-2xl font-black text-green-700 mb-2">Order Up!</h3>
                  <p className="text-slate-500 font-medium">Your pasta is in the window.</p>
                  <p className="text-sm text-slate-400 mt-4 animate-pulse">Waiting for other chefs...</p>
                </div>
              )}

              {phase === 'voting' && (
                <div className="flex flex-col gap-6 w-full">
                  <h3 className="text-center text-xl font-bold text-slate-700">Vote for your favorites!</h3>
                  {/* Check if waiting for others */}
                  {Object.keys(submissions).length === 0 && (
                    <p className="text-center text-slate-400">Waiting for submissions...</p>
                  )}

                  {Object.entries(submissions).map(([playerId, saladwords]) => {
                    const isVoted = votedFor.has(playerId);
                    return (
                      <div key={playerId} className="w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all">
                        <div className="flex flex-wrap gap-2 justify-center mb-4 min-h-[3rem] items-center">
                          {saladwords.map((w) => (
                            <span key={w.id} className="bg-slate-100 px-2 py-1 rounded font-bold text-slate-700 transform rotate-1">{w.text}</span>
                          ))}
                        </div>

                        {/* Don't vote for yourself (optional, but good for UX) */}
                        {playerId !== useGameStore.getState().socket?.id ? (
                          <div className="flex gap-2">
                            {!isVoted ? (
                              <>
                                <button
                                  data-testid={`vote-funny-${playerId}`}
                                  onClick={() => handleVote('funny', playerId)}
                                  className="flex-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-bold py-2 rounded-lg transition-colors border-2 border-transparent hover:border-yellow-300"
                                >
                                  😂 Funny
                                </button>
                                <button
                                  data-testid={`vote-fresh-${playerId}`}
                                  onClick={() => handleVote('saucy', playerId)}
                                  className="flex-1 bg-red-100 hover:bg-red-200 text-red-800 font-bold py-2 rounded-lg transition-colors border-2 border-transparent hover:border-red-300"
                                >
                                  🥫 Saucy
                                </button>
                              </>
                            ) : (
                              <div className="w-full text-center font-bold text-green-600 bg-green-50 py-2 rounded-lg border border-green-100">
                                ✅ Voted!
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center text-xs font-bold text-slate-300 uppercase tracking-widest">
                            Your Dish
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Host Control to force end voting? For now relies on auto-advance or just manual next round from Results */}
                  {(players[useGameStore.getState().socket?.id || '']?.isHost) && (
                    <div className="text-center mt-4">
                      <p className="text-sm text-slate-400 mb-2">Host Controls</p>
                      <button
                        onClick={() => useGameStore.setState({ phase: 'results' })} // MVP Hack: Local state force for host? No, server should handle.
                        className="text-slate-400 underline"
                      >
                        Force Results (Debug)
                      </button>
                      {/* Ideally Server handles timing or "Done Voting" button */}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {phase === 'results' && (
            <motion.div
              key="results"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-start gap-6 text-center w-full"
            >
              <div className="mb-4">
                <Trophy className="w-16 h-16 text-yellow-400 mx-auto" />
                <h2 className="text-3xl font-bold text-slate-800">Round Over!</h2>
              </div>

              <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 font-bold text-slate-400 uppercase tracking-widest text-sm text-left">
                  Leaderboard
                </div>
                {Object.values(players)
                  .sort((a, b) => b.score - a.score)
                  .map((p, index) => (
                    <div key={p.name} className="flex items-center justify-between px-6 py-4 border-b border-slate-50 last:border-0">
                      <div className="flex items-center gap-4">
                        <span className={`font-black text-xl w-6 ${index === 0 ? 'text-yellow-500' : 'text-slate-300'}`}>
                          #{index + 1}
                        </span>
                        <span className="font-bold text-slate-700 text-lg">{p.name}</span>
                      </div>
                      <div className="font-black text-green-600 text-xl">
                        {p.score} pts
                      </div>
                    </div>
                  ))}
              </div>

              {(players[useGameStore.getState().socket?.id || '']?.isHost) && (
                <div className="w-full flex flex-col gap-3 mt-4">
                  <motion.button
                    layout
                    data-testid="next-round-btn"
                    onClick={() => {
                      setVotedFor(new Set()); // Reset local voting state
                      startNextRound();
                    }}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg text-lg"
                  >
                    Next Round ➡️
                  </motion.button>

                  <button
                    data-testid="end-game-btn"
                    onClick={() => {
                      if (confirm("Are you sure you want to end the game?")) {
                        useGameStore.getState().endGame();
                      }
                    }}
                    className="w-full bg-slate-200 hover:bg-red-100 text-slate-500 hover:text-red-600 font-bold py-3 rounded-xl transition-colors text-sm"
                  >
                    End Game 🛑
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {phase === 'game_over' && (
            <motion.div
              key="game_over"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center gap-8 text-center w-full"
            >
              <div className="bg-slate-800 text-white p-8 rounded-3xl shadow-2xl w-full max-w-md border-4 border-slate-700">
                <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-6 animate-bounce" />
                <h1 className="text-4xl font-black mb-2">GAME OVER</h1>
                <p className="text-slate-400 mb-8 font-medium">Final Standings</p>

                <div className="space-y-4">
                  {Object.values(players)
                    .sort((a, b) => b.score - a.score)
                    .map((p, index) => (
                      <div key={p.name} className={`flex items-center justify-between p-4 rounded-xl ${index === 0 ? 'bg-yellow-500 text-slate-900 ring-4 ring-yellow-400/30' : 'bg-slate-700 text-slate-300'}`}>
                        <div className="flex items-center gap-4">
                          <span className="font-black text-2xl">#{index + 1}</span>
                          <span className="font-bold text-xl">{p.name}</span>
                        </div>
                        <span className="font-black text-2xl">{p.score}</span>
                      </div>
                    ))}
                </div>

                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-white text-slate-900 font-black py-4 rounded-xl shadow-lg text-xl mt-8 hover:bg-slate-200 transition-colors"
                >
                  Exit to Menu 🚪
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Player Status Sidebar */}
        {roomId && (phase === 'construction' || phase === 'voting') && (
          <div className="fixed top-24 right-4 z-20 flex flex-col gap-2 pointer-events-none">
            {Object.entries(players).map(([id, p]) => {
              const hasSubmitted = !!submissions[id];
              const hasVoted = voters?.includes(id);

              let statusIcon = '⏳'; // Default waiting
              let statusColor = 'bg-slate-100 border-slate-200 text-slate-400 opacity-70';

              if (phase === 'construction') {
                if (hasSubmitted) {
                  statusIcon = '✅';
                  statusColor = 'bg-green-100 border-green-200 text-green-700 opacity-100 shadow-md transform scale-105';
                }
              } else if (phase === 'voting') {
                if (hasVoted) {
                  statusIcon = '🗳️';
                  statusColor = 'bg-blue-100 border-blue-200 text-blue-700 opacity-100 shadow-md transform scale-105';
                }
              }

              return (
                <div key={id} className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all duration-300 ${statusColor}`}>
                  <span className="text-xl">{p.avatar || '👨‍🍳'}</span>
                  <span className="text-xs font-bold truncate max-w-[80px]">{p.name}</span>
                  <span className="text-sm">{statusIcon}</span>
                </div>
              );
            })}
          </div>
        )}

      </main>

      <footer className="mt-12 text-slate-300 text-sm font-medium">
        v0.3.1 • Multiplayer Beta
      </footer>
    </div>
  );
}

export default App;
