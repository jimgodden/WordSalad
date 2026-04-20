import { useEffect, useMemo, useState } from 'react';
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
    readyNextRecipe,
    skipPrompt,
    choosePrompt,
    endGame,
    moveWordToResponse,
    moveWordToBank,
    submitSalad,
    vote,
    reorderResponse,
    roomId,
    players,
    submissions,
    voters,
    votes,
    round,
    readyForNextRound,
    promptChooserId,
    promptSkipsRemaining,
    winnerAnnouncement,
    swapHand,
    hasUsedMulligan,
    socket
  } = useGameStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeWord, setActiveWord] = useState<WordItem | null>(null);
  const [myVoteTarget, setMyVoteTarget] = useState<string | null>(null);
  const [inputName, setInputName] = useState('');
  const [inputRoom, setInputRoom] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('👨‍🍳');
  const [menuState, setMenuState] = useState<'main' | 'create' | 'join'>('main');
  const [copied, setCopied] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  );

  const AVATARS = ['👨‍🍳', '👩‍🍳', '🥞', '🍕', '🍔', '🌮', '🍣', '🤖'];
  const currentPlayerId = socket?.id ?? '';
  const currentPlayer = currentPlayerId ? players[currentPlayerId] : undefined;
  const chooser = promptChooserId ? players[promptChooserId] : undefined;
  const isChooser = promptChooserId === currentPlayerId;
  const readyThreshold = Math.max(1, Math.ceil(Object.keys(players).length / 2));
  const isReadyForNextRecipe = readyForNextRound.includes(currentPlayerId);
  const sortedPlayers = useMemo(
    () => Object.entries(players).sort(([, a], [, b]) => b.score - a.score),
    [players]
  );

  useEffect(() => {
    connect();

    const params = new URLSearchParams(window.location.search);
    const inviteRoom = params.get('room');
    if (inviteRoom) {
      setInputRoom(inviteRoom.toUpperCase());
      setMenuState('join');
    }
  }, [connect]);

  useEffect(() => {
    if (phase !== 'voting') {
      setMyVoteTarget(null);
      return;
    }

    setMyVoteTarget(votes[currentPlayerId] ?? null);
  }, [phase, votes, currentPlayerId, round]);

  const copyInviteLink = async () => {
    if (!roomId) return;
    const url = `${window.location.origin}/?room=${roomId}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleVote = (targetId: string) => {
    if (myVoteTarget) return;
    vote(targetId);
    setMyVoteTarget(targetId);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    setActiveWord(active.data.current?.word);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      setActiveWord(null);
      return;
    }

    const draggedId = active.id as string;
    const targetId = over.id as string;

    if (active.data.current?.source === 'response' && over.data.current?.source === 'response') {
      if (draggedId !== targetId) {
        reorderResponse(draggedId, targetId);
      }
    } else if (over.id === 'response-zone' || over.data.current?.source === 'response') {
      moveWordToResponse(draggedId);
    } else if (over.id === 'bank-zone') {
      moveWordToBank(draggedId);
    }

    setActiveId(null);
    setActiveWord(null);
  };

  const renderDish = (words: WordItem[]) => words.map((word) => word.text).join(' ');

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
            <div className="flex gap-4 justify-center flex-wrap">
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
              {chooser && phase !== 'lobby' && phase !== 'game_over' && (
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                  Prompt Picker: {chooser.name}
                </span>
              )}
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
                  {Object.values(players).map((player) => (
                    <div key={player.name} className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-2 relative shadow-inner">
                        <span className="text-4xl filter drop-shadow-sm">{player.avatar || '👨‍🍳'}</span>
                        <div className="absolute -top-1 -right-1 bg-yellow-400 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm">
                          {player.score}
                        </div>
                      </div>
                      <span className="font-bold text-slate-700">{player.name}</span>
                    </div>
                  ))}
                </div>

                {currentPlayer?.isHost ? (
                  <button
                    data-testid="start-game-btn"
                    onClick={startGame}
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

          {phase === 'prompt_selection' && (
            <motion.div
              key="prompt-selection"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex-1 flex flex-col items-center justify-center gap-6"
            >
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center w-full max-w-xl">
                <p className="text-sm font-bold text-blue-500 uppercase tracking-[0.3em] mb-3">Next Recipe</p>
                <h2 className="text-3xl font-black text-slate-800 mb-3">
                  {chooser ? `${chooser.name} is choosing the next prompt` : 'Choosing the next prompt'}
                </h2>
                <p className="text-slate-500 mb-8">
                  {isChooser ? `You can skip up to ${promptSkipsRemaining} more prompt${promptSkipsRemaining === 1 ? '' : 's'} this turn.` : 'Everyone else waits while the current chef picks the next recipe.'}
                </p>

                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-100 rounded-2xl p-8 mb-8">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Current Prompt</p>
                  <p className="text-3xl font-black text-slate-800 leading-tight">"{prompt}"</p>
                </div>

                {isChooser ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      data-testid="skip-prompt-btn"
                      onClick={skipPrompt}
                      disabled={promptSkipsRemaining <= 0}
                      className="flex-1 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-bold py-4 rounded-xl transition-colors"
                    >
                      Skip Prompt ({promptSkipsRemaining} left)
                    </button>
                    <button
                      data-testid="choose-prompt-btn"
                      onClick={choosePrompt}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg"
                    >
                      Cook This Recipe
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-500 font-medium">
                    Waiting for {chooser?.name ?? 'the current chef'} to lock in the prompt...
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {phase === 'prompt' && (
            <motion.div
              key="prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center"
            >
              <h2 className="text-2xl font-bold text-slate-400 mb-4 animate-pulse">Get Ready...</h2>
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-4xl font-black text-slate-800 text-center leading-tight px-4"
              >
                "{prompt}"
              </motion.div>
            </motion.div>
          )}

          {(phase === 'construction' || phase === 'voting') && (
            <motion.div
              key="game"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="flex flex-col gap-6"
            >
              <div className="bg-white/50 p-6 rounded-2xl border border-slate-200 text-center shadow-sm">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Prompt</p>
                <p className="text-xl md:text-2xl font-bold text-slate-800">"{prompt}"</p>
              </div>

              {phase === 'construction' && !submissions[currentPlayerId] ? (
                <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
                      onClick={swapHand}
                      disabled={hasUsedMulligan}
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
              ) : phase === 'construction' ? (
                <div className="flex flex-col items-center justify-center py-12 bg-white/50 rounded-2xl border border-dashed border-green-300">
                  <div className="bg-green-100 p-4 rounded-full mb-4">
                    <span className="text-4xl">🍝</span>
                  </div>
                  <h3 className="text-2xl font-black text-green-700 mb-2">Order Up!</h3>
                  <p className="text-slate-500 font-medium">Your dish is plated.</p>
                  <p className="text-sm text-slate-400 mt-4 animate-pulse">Waiting for the other chefs...</p>
                </div>
              ) : (
                <div className="flex flex-col gap-6 w-full">
                  <h3 className="text-center text-xl font-bold text-slate-700">Pick your single favorite dish</h3>
                  <p className="text-center text-sm text-slate-400">
                    {voters.length} of {Object.keys(players).length} taste testers have voted.
                  </p>

                  {Object.entries(submissions).map(([playerId, saladWords]) => {
                    const isMine = playerId === currentPlayerId;
                    const didVoteForThisDish = myVoteTarget === playerId;
                    const voteCount = Object.values(votes).filter((targetId) => targetId === playerId).length;

                    return (
                      <div key={playerId} className="w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all">
                        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                          <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{players[playerId]?.name ?? 'Chef'}</p>
                            <p className="text-xs text-slate-400">{voteCount} favorite vote{voteCount === 1 ? '' : 's'} so far</p>
                          </div>
                          {isMine && (
                            <div className="text-center text-xs font-bold text-slate-300 uppercase tracking-widest">
                              Your Dish
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 justify-center mb-4 min-h-[3rem] items-center">
                          {saladWords.map((word) => (
                            <span key={word.id} className="bg-slate-100 px-2 py-1 rounded font-bold text-slate-700 transform rotate-1">{word.text}</span>
                          ))}
                        </div>

                        {!isMine ? (
                          myVoteTarget ? (
                            <div className={`w-full text-center font-bold py-2 rounded-lg border ${didVoteForThisDish ? 'text-green-600 bg-green-50 border-green-100' : 'text-slate-400 bg-slate-50 border-slate-100'}`}>
                              {didVoteForThisDish ? '✅ Marked as your favorite' : 'You already picked your favorite'}
                            </div>
                          ) : (
                            <button
                              data-testid={`favorite-vote-${playerId}`}
                              onClick={() => handleVote(playerId)}
                              className="w-full bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-bold py-3 rounded-lg transition-colors border-2 border-transparent hover:border-yellow-300"
                            >
                              ⭐ Favorite Dish
                            </button>
                          )
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {phase === 'winner' && winnerAnnouncement && (
            <motion.div
              key="winner"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center gap-6 text-center w-full"
            >
              <div data-testid="winner-announcement" className="bg-white rounded-3xl shadow-sm border border-yellow-100 p-8 w-full">
                <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                {winnerAnnouncement.topDishes.length === 1 ? (
                  <>
                    <h2 className="text-3xl font-black text-slate-800 mb-2">{winnerAnnouncement.topDishes[0].playerName}'s dish is the best</h2>
                    <p className="text-slate-500 mb-6">
                      {winnerAnnouncement.topDishes[0].votes} favorite vote{winnerAnnouncement.topDishes[0].votes === 1 ? '' : 's'}
                      {winnerAnnouncement.bonusAwarded ? ' + 1 bonus point' : ''}
                    </p>
                    <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-6">
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Winning Dish</p>
                      <p className="text-2xl font-black text-slate-800 leading-tight">
                        {renderDish(winnerAnnouncement.topDishes[0].dish)}
                      </p>
                    </div>
                  </>
                ) : winnerAnnouncement.topDishes.length > 1 ? (
                  <>
                    <h2 className="text-3xl font-black text-slate-800 mb-2">Best Dish Tie</h2>
                    <p className="text-slate-500 mb-6">No bonus point this round.</p>
                    <div className="grid gap-4">
                      {winnerAnnouncement.topDishes.map((dish) => (
                        <div key={dish.playerId} className="bg-yellow-50 border border-yellow-100 rounded-2xl p-5">
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">{dish.playerName}</p>
                          <p className="text-xl font-black text-slate-800">{renderDish(dish.dish)}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl font-black text-slate-800 mb-2">No Best Dish This Round</h2>
                    <p className="text-slate-500">Nobody cast a valid favorite vote.</p>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {phase === 'results' && (
            <motion.div
              key="results"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-start gap-6 text-center w-full"
            >
              <div className="mb-4">
                <Trophy className="w-16 h-16 text-yellow-400 mx-auto" />
                <h2 className="text-3xl font-bold text-slate-800">Leaderboard</h2>
                <p className="text-slate-500 mt-2">
                  {readyForNextRound.length} of {readyThreshold} ready clicks needed to move to the next recipe.
                </p>
              </div>

              <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 font-bold text-slate-400 uppercase tracking-widest text-sm text-left">
                  Standings
                </div>
                {sortedPlayers.map(([playerId, player], index) => (
                  <div key={playerId} className="flex items-center justify-between px-6 py-4 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-4">
                      <span className={`font-black text-xl w-6 ${index === 0 ? 'text-yellow-500' : 'text-slate-300'}`}>
                        #{index + 1}
                      </span>
                      <span className="font-bold text-slate-700 text-lg">{player.name}</span>
                    </div>
                    <div className="font-black text-green-600 text-xl">{player.score} pts</div>
                  </div>
                ))}
              </div>

              <div className="w-full flex flex-col gap-3 mt-4">
                <motion.button
                  layout
                  data-testid="ready-next-recipe-btn"
                  onClick={readyNextRecipe}
                  disabled={isReadyForNextRecipe}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg text-lg"
                >
                  {isReadyForNextRecipe ? 'Waiting for more chefs...' : 'Next Recipe ➡️'}
                </motion.button>

                {currentPlayer?.isHost && (
                  <button
                    data-testid="end-game-btn"
                    onClick={() => {
                      if (confirm('Are you sure you want to end the game?')) {
                        endGame();
                      }
                    }}
                    className="w-full bg-slate-200 hover:bg-red-100 text-slate-500 hover:text-red-600 font-bold py-3 rounded-xl transition-colors text-sm"
                  >
                    End Game 🛑
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {phase === 'game_over' && (
            <motion.div
              key="game_over"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center gap-8 text-center w-full"
            >
              <div className="bg-slate-800 text-white p-8 rounded-3xl shadow-2xl w-full max-w-md border-4 border-slate-700">
                <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-6 animate-bounce" />
                <h1 className="text-4xl font-black mb-2">GAME OVER</h1>
                <p className="text-slate-400 mb-8 font-medium">Final Standings</p>

                <div className="space-y-4">
                  {sortedPlayers.map(([playerId, player], index) => (
                    <div key={playerId} className={`flex items-center justify-between p-4 rounded-xl ${index === 0 ? 'bg-yellow-500 text-slate-900 ring-4 ring-yellow-400/30' : 'bg-slate-700 text-slate-300'}`}>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-2xl">#{index + 1}</span>
                        <span className="font-bold text-xl">{player.name}</span>
                      </div>
                      <span className="font-black text-2xl">{player.score}</span>
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

        {roomId && (phase === 'construction' || phase === 'voting') && (
          <div className="fixed top-24 right-4 z-20 flex flex-col gap-2 pointer-events-none">
            {Object.entries(players).map(([id, player]) => {
              const hasSubmitted = !!submissions[id];
              const hasVoted = voters.includes(id);

              let statusIcon = '⏳';
              let statusColor = 'bg-slate-100 border-slate-200 text-slate-400 opacity-70';

              if (phase === 'construction' && hasSubmitted) {
                statusIcon = '✅';
                statusColor = 'bg-green-100 border-green-200 text-green-700 opacity-100 shadow-md transform scale-105';
              }

              if (phase === 'voting' && hasVoted) {
                statusIcon = '🗳️';
                statusColor = 'bg-blue-100 border-blue-200 text-blue-700 opacity-100 shadow-md transform scale-105';
              }

              return (
                <div key={id} className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all duration-300 ${statusColor}`}>
                  <span className="text-xl">{player.avatar || '👨‍🍳'}</span>
                  <span className="text-xs font-bold truncate max-w-[80px]">{player.name}</span>
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
