import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { io, Socket } from 'socket.io-client';
import { drawWordHand } from '../game/data';

export interface WordItem {
    id: string;
    text: string;
}

interface Player {
    name: string;
    avatar: string; // Add avatar property
    hand: WordItem[];
    score: number;
    isHost: boolean;
}

interface WinnerDish {
    playerId: string;
    playerName: string;
    avatar: string;
    dish: WordItem[];
    votes: number;
}

interface WinnerAnnouncement {
    topDishes: WinnerDish[];
    bonusAwarded: boolean;
    totalVotes: number;
}

interface GameState {
    roomId: string | null;
    playerName: string;
    avatar: string; // Add avatar property
    phase: 'lobby' | 'prompt_selection' | 'prompt' | 'construction' | 'voting' | 'winner' | 'results' | 'game_over';
    prompt: string;

    // Multiplayer State
    players: Record<string, Player>;
    submissions: Record<string, WordItem[]>;
    votes: Record<string, string>;
    voters: string[]; // List of socket IDs who have voted
    round: number;
    readyForNextRound: string[];
    promptChooserId: string | null;
    promptSkipsRemaining: number;
    winnerAnnouncement: WinnerAnnouncement | null;

    myHand: WordItem[]; // Local hand
    response: WordItem[]; // Local response construction area
    hasUsedMulligan: boolean;

    socket: Socket | null;

    // Actions
    connect: () => void;
    createRoom: (name: string, avatar: string) => void;
    joinRoom: (roomId: string, name: string, avatar: string) => void;
    startGame: () => void;
    readyNextRecipe: () => void;
    skipPrompt: () => void;
    choosePrompt: () => void;
    endGame: () => void;
    swapHand: () => void; // Mulligan action

    // Local Moves
    moveWordToResponse: (id: string) => void;
    moveWordToBank: (id: string) => void;
    reorderResponse: (activeId: string, overId: string) => void;
    submitSalad: () => void;
    vote: (targetId: string) => void;
    resetGame: () => void;
}

export const useGameStore = create<GameState>()(
    persist(
        (set, get) => ({
            roomId: null,
            playerName: '',
            avatar: '👨‍🍳', // Default avatar
            phase: 'lobby',
            prompt: '',

            players: {},
            submissions: {},
            votes: {},
            voters: [],
            round: 1,
            readyForNextRound: [],
            promptChooserId: null,
            promptSkipsRemaining: 10,
            winnerAnnouncement: null,

            myHand: [],
            response: [],
            hasUsedMulligan: false,
            socket: null,

            swapHand: () => {
                const { hasUsedMulligan } = get();
                if (hasUsedMulligan) return;

                const newWords = drawWordHand(70).map((text) => ({
                    id: `${text}-${Math.random().toString(36).substr(2, 9)}`,
                    text
                }));

                set({
                    myHand: newWords,
                    response: [],
                    hasUsedMulligan: true
                });
            },

            connect: () => {
                if (get().socket?.connected) return;

                // Connect to server (port 3000)
                const socket = io(`http://${window.location.hostname}:3000`, {
                    reconnection: true,
                    reconnectionAttempts: 10,
                    reconnectionDelay: 1000,
                    timeout: 20000
                });

                socket.on('connect', () => {
                    console.log('%c✅ Connected to Multiplayer Server:', 'color: green; font-weight: bold;', socket.id);

                    // Attempt Rejoin if we have room and name
                    const state = get();
                    if (state.roomId && state.playerName) {
                        console.log('🔄 Attempting to rejoin room:', state.roomId);
                        socket.emit('join_room', {
                            roomId: state.roomId,
                            playerName: state.playerName,
                            avatar: state.avatar || '👨‍🍳'
                        });
                    }
                });

                socket.on('connect_error', (err) => {
                    console.error('%c🔴 Socket Connection Error:', 'color: red; font-weight: bold;', err.message);
                });

                socket.on('disconnect', (reason) => {
                    console.warn('%c⚠️ Disconnected from Server:', 'color: orange', reason);
                });

                socket.on('room_created', (id) => {
                    set({ roomId: id });
                });

                socket.on('state_update', (serverState) => {
                    const currentPhase = get().phase;
                    const newPhase = serverState.phase;

                    // Merge server state
                    set(() => ({
                        phase: serverState.phase,
                        prompt: serverState.prompt,
                        players: serverState.players,
                        submissions: serverState.submissions || {},
                        votes: serverState.votes || {},
                        voters: serverState.voters || [],
                        round: serverState.round || 1,
                        readyForNextRound: serverState.readyForNextRound || [],
                        promptChooserId: serverState.promptChooserId || null,
                        promptSkipsRemaining: serverState.promptSkipsRemaining ?? 10,
                        winnerAnnouncement: serverState.winnerAnnouncement || null
                    }));

                    // Replenish ONLY if we just entered construction phase
                    if (currentPhase !== 'construction' && newPhase === 'construction') {
                        const state = get();
                        const currentCount = state.myHand.length;
                        if (currentCount < 70) {
                            const needed = 70 - currentCount;
                            const newWords = drawWordHand(needed).map((text) => ({
                                id: `${text}-${Math.random().toString(36).substr(2, 9)}`,
                                text
                            }));
                            set({
                                myHand: [...state.myHand, ...newWords],
                                response: [],
                                hasUsedMulligan: false
                            });
                        } else {
                            set({ response: [], hasUsedMulligan: false });
                        }
                    }
                });

                set({ socket });
            },

            createRoom: (name, avatar) => {
                const { socket } = get();
                if (!socket) return;
                set({ playerName: name, avatar });
                socket.emit('create_room', { playerName: name, avatar });
            },

            joinRoom: (roomId, name, avatar) => {
                const { socket } = get();
                if (!socket) return;
                set({ playerName: name, roomId, avatar });
                socket.emit('join_room', { roomId, playerName: name, avatar });
            },

            startGame: () => {
                const { socket, roomId } = get();
                console.log('🎮 startGame called', { socketId: socket?.id, roomId });
                if (!socket || !roomId) {
                    console.error('❌ Cannot start game: socket or roomId missing');
                    return;
                }
                socket.emit('start_game', roomId);
                console.log('📡 Emitted start_game');
            },

            readyNextRecipe: () => {
                const { socket, roomId } = get();
                if (!socket || !roomId) return;
                socket.emit('next_round', roomId);
            },

            skipPrompt: () => {
                const { socket, roomId } = get();
                if (!socket || !roomId) return;
                socket.emit('skip_prompt', roomId);
            },

            choosePrompt: () => {
                const { socket, roomId } = get();
                if (!socket || !roomId) return;
                socket.emit('choose_prompt', roomId);
            },

            endGame: () => {
                const { socket, roomId } = get();
                if (!socket || !roomId) return;
                socket.emit('end_game', roomId);
            },

            moveWordToResponse: (id) => {
                const state = get();
                const wordIndex = state.myHand.findIndex((w) => w.id === id);
                if (wordIndex !== -1) {
                    const word = state.myHand[wordIndex];
                    set({
                        myHand: state.myHand.filter((w) => w.id !== id),
                        response: [...state.response, word],
                    });
                    return;
                }
            },

            moveWordToBank: (id) => {
                const state = get();
                const word = state.response.find((w) => w.id === id);
                if (!word) return;

                set({
                    response: state.response.filter((w) => w.id !== id),
                    myHand: [...state.myHand, word],
                });
            },

            reorderResponse: (activeId, overId) => {
                set((state) => {
                    const oldIndex = state.response.findIndex((w) => w.id === activeId);
                    const newIndex = state.response.findIndex((w) => w.id === overId);

                    if (oldIndex < 0 || newIndex < 0) return state;

                    const newResponse = [...state.response];
                    const [movedWord] = newResponse.splice(oldIndex, 1);
                    newResponse.splice(newIndex, 0, movedWord);
                    return { response: newResponse };
                });
            },

            submitSalad: () => {
                const { socket, roomId, response } = get();
                if (!socket || !roomId) return;
                socket.emit('submit_salad', { roomId, salad: response });

                set({ response: [] });
            },

            vote: (targetId) => {
                const { socket, roomId } = get();
                if (!socket || !roomId) return;
                socket.emit('vote', { roomId, targetId });
            },

            resetGame: () => {
                set({
                    response: [],
                    myHand: [],
                    roomId: null,
                    playerName: '',
                    hasUsedMulligan: false,
                    readyForNextRound: [],
                    promptChooserId: null,
                    promptSkipsRemaining: 10,
                    winnerAnnouncement: null,
                    votes: {},
                    voters: []
                });
            }
        }),
        {
            name: 'linguistic-linguini-storage',
            partialize: (state) => ({
                roomId: state.roomId,
                playerName: state.playerName,
                avatar: state.avatar,
                myHand: state.myHand, // Persist hand so reload doesn't lose words
                hasUsedMulligan: state.hasUsedMulligan
            }),
        }
    )
);
