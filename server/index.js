import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(cors());

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../dist')));

const httpServer = createServer(app);
const io = new Server(httpServer, {
    pingTimeout: 60000, // 60s to handle backgrounding
    pingInterval: 25000,
    cors: {
        origin: "*", // Allow all origins for simplicity in this prototype
        methods: ["GET", "POST"]
    }
});

// Game State Storage
// RoomID -> GameState
// Game State Storage
// RoomID -> GameState
const rooms = new Map();
// Track disconnect timeouts: roomId -> { playerName -> timeoutId }
const disconnectTimeouts = new Map();

// Linguistic Linguini Data (Simplifying for server to just hold state, not generate logic yet)
const PROMPTS = [
    "The message your food delivery driver will never forget.",
    "A terrible slogan for a breakfast cereal.",
    "What your pet says when you leave the room.",
    "The worst possible thing to hear from your dentist.",
    "A text message from a very dramatic raccoon.",
    "The real reason the meeting could have been an email.",
    "A rejected menu item at a fancy restaurant.",
    "The title of a movie that should not exist.",
    "What a grandma says before absolute chaos begins.",
    "The world's least inspiring motivational speech.",
    "A bad excuse for being late to work.",
    "What the moon would post on social media.",
    "The worst slogan for a dating app.",
    "A warning label on a suspicious snack.",
    "What your fridge thinks about your life choices.",
    "The first line of a very disappointing superhero movie.",
    "A wedding toast that gets cut off immediately.",
    "What the cashier says right before disaster.",
    "A children's book title that alarms everyone.",
    "The secret ingredient in a cursed family recipe.",
    "What a pirate orders at a coffee shop.",
    "The worst name for a new theme park ride.",
    "A voice mail from your chaotic roommate.",
    "What the office microwave whispers at midnight.",
    "A terrible headline for tomorrow's news.",
    "The least convincing apology ever delivered.",
    "A rejected flavor of sparkling water.",
    "What your group chat would say at your funeral.",
    "The real reason the Wi-Fi stopped working.",
    "A side effect your doctor forgot to mention.",
    "The worst thing to hear from a flight attendant.",
    "A suspicious fortune cookie message.",
    "The snack that got banned from school forever.",
    "Why the chef was asked to leave the wedding.",
    "A magician's final and very bad idea.",
    "What the pigeon on the sidewalk knows about you.",
    "A product review written by an angry ghost.",
    "The reason your landlord is suddenly calling.",
    "A bad nickname for a superhero.",
    "What the principal says on karaoke night.",
    "A sentence that should never begin a first date.",
    "The item nobody wanted in the office potluck.",
    "What the robot says when it becomes emotional.",
    "The worst thing to hear during a yoga class.",
    "A rejected state fair food.",
    "What the clown says to calm everyone down.",
    "The least romantic proposal in human history.",
    "A podcast episode that ends in immediate regret.",
    "What your sandwich is hiding from you.",
    "The title of a self-help book written by a goose.",
    "A sign that your brunch has gone too far.",
    "What the elevator announces before chaos.",
    "The thing your socks are plotting.",
    "A very bad reason to call your boss on a Sunday.",
    "What really happened at the company picnic.",
    "The worst possible pizza topping.",
    "A museum plaque for a very embarrassing object.",
    "What the wizard says after burning the toast.",
    "The theme of the saddest birthday party ever.",
    "A terrible replacement name for coffee.",
    "The emergency announcement nobody was prepared for."
];

const WINNER_REVEAL_MS = 5000;
const PROMPT_READ_MS = 5000;
const MAX_PROMPT_SKIPS = 10;

const createGameState = () => ({
    phase: 'lobby',
    prompt: '',
    players: {},
    playerOrder: [],
    chooserIndex: 0,
    submissions: {},
    votes: {},
    voters: [],
    round: 1,
    readyForNextRound: [],
    promptChooserId: null,
    promptSkipsRemaining: MAX_PROMPT_SKIPS,
    winnerAnnouncement: null
});

const getPromptChoices = (exclude = []) => {
    const available = PROMPTS.filter((prompt) => !exclude.includes(prompt));
    const source = available.length > 0 ? available : PROMPTS;
    return source[Math.floor(Math.random() * source.length)];
};

const normalizeChooserIndex = (room) => {
    if (room.playerOrder.length === 0) {
        room.chooserIndex = 0;
        room.promptChooserId = null;
        return;
    }

    if (room.chooserIndex >= room.playerOrder.length) {
        room.chooserIndex = room.chooserIndex % room.playerOrder.length;
    }

    if (room.chooserIndex < 0) {
        room.chooserIndex = 0;
    }

    room.promptChooserId = room.playerOrder[room.chooserIndex] ?? null;
};

const beginPromptSelection = (roomId, { advanceRound = false } = {}) => {
    const room = rooms.get(roomId);
    if (!room) return;

    if (advanceRound) {
        room.round += 1;
        if (room.playerOrder.length > 0) {
            room.chooserIndex = (room.chooserIndex + 1) % room.playerOrder.length;
        }
    }

    normalizeChooserIndex(room);
    room.phase = 'prompt_selection';
    room.submissions = {};
    room.votes = {};
    room.voters = [];
    room.readyForNextRound = [];
    room.winnerAnnouncement = null;
    room.promptSkipsRemaining = MAX_PROMPT_SKIPS;
    room.prompt = getPromptChoices();

    io.to(roomId).emit('state_update', room);
};

const revealPrompt = (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.phase = 'prompt';
    io.to(roomId).emit('state_update', room);

    setTimeout(() => {
        const currentRoom = rooms.get(roomId);
        if (!currentRoom || currentRoom.phase !== 'prompt') return;

        currentRoom.phase = 'construction';
        io.to(roomId).emit('state_update', currentRoom);
    }, PROMPT_READ_MS);
};

const finalizeVoting = (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const voteEntries = Object.entries(room.votes);
    const tally = {};

    voteEntries.forEach(([, targetId]) => {
        tally[targetId] = (tally[targetId] || 0) + 1;
    });

    Object.entries(tally).forEach(([targetId, count]) => {
        if (room.players[targetId]) {
            room.players[targetId].score += count;
        }
    });

    const ranked = Object.entries(tally)
        .filter(([targetId]) => room.players[targetId] && room.submissions[targetId])
        .sort((a, b) => b[1] - a[1]);

    let topDishes = [];
    if (ranked.length > 0) {
        const highestVotes = ranked[0][1];
        topDishes = ranked
            .filter(([, count]) => count === highestVotes)
            .map(([playerId, count]) => ({
                playerId,
                playerName: room.players[playerId].name,
                avatar: room.players[playerId].avatar,
                dish: room.submissions[playerId],
                votes: count
            }));

        if (topDishes.length === 1 && room.players[topDishes[0].playerId]) {
            room.players[topDishes[0].playerId].score += 1;
        }
    }

    room.winnerAnnouncement = {
        topDishes,
        bonusAwarded: topDishes.length === 1,
        totalVotes: voteEntries.length
    };
    room.phase = 'winner';

    io.to(roomId).emit('state_update', room);

    setTimeout(() => {
        const currentRoom = rooms.get(roomId);
        if (!currentRoom || currentRoom.phase !== 'winner') return;

        currentRoom.phase = 'results';
        currentRoom.readyForNextRound = [];
        io.to(roomId).emit('state_update', currentRoom);
    }, WINNER_REVEAL_MS);
};

const maybeAdvanceFromVoting = (roomId) => {
    const room = rooms.get(roomId);
    if (!room || room.phase !== 'voting') return;

    const totalPlayers = Object.keys(room.players).length;
    if (totalPlayers <= 1) {
        finalizeVoting(roomId);
        return;
    }

    if (room.voters.length >= totalPlayers) {
        finalizeVoting(roomId);
    }
};

const maybeAdvanceFromConstruction = (roomId) => {
    const room = rooms.get(roomId);
    if (!room || room.phase !== 'construction') return;

    if (Object.keys(room.submissions).length === Object.keys(room.players).length) {
        room.phase = 'voting';
        room.votes = {};
        room.voters = [];
        io.to(roomId).emit('state_update', room);
    }
};

const removePlayerFromRoom = (roomId, socketId) => {
    const room = rooms.get(roomId);
    if (!room || !room.players[socketId]) return;

    const wasHost = room.players[socketId].isHost;

    delete room.players[socketId];
    delete room.submissions[socketId];
    delete room.votes[socketId];

    Object.keys(room.votes).forEach((voterId) => {
        if (room.votes[voterId] === socketId) {
            delete room.votes[voterId];
        }
    });

    room.voters = room.voters.filter((voterId) => voterId !== socketId);
    room.readyForNextRound = room.readyForNextRound.filter((playerId) => playerId !== socketId);

    const removedIndex = room.playerOrder.indexOf(socketId);
    if (removedIndex !== -1) {
        room.playerOrder.splice(removedIndex, 1);
        if (removedIndex < room.chooserIndex && room.chooserIndex > 0) {
            room.chooserIndex -= 1;
        }
    }

    normalizeChooserIndex(room);

    if (wasHost && room.playerOrder.length > 0) {
        const nextHostId = room.playerOrder[0];
        if (room.players[nextHostId]) {
            room.players[nextHostId].isHost = true;
        }
    }

    if (Object.keys(room.players).length === 0) {
        rooms.delete(roomId);
        disconnectTimeouts.delete(roomId);
        console.log(`[${new Date().toISOString()}] 🗑️ Room ${roomId} deleted (empty)`);
        return;
    }

    maybeAdvanceFromConstruction(roomId);
    maybeAdvanceFromVoting(roomId);
    io.to(roomId).emit('state_update', room);
};

io.on('connection', (socket) => {
    console.log(`[${new Date().toISOString()}] 🟢 User connected: ${socket.id} (IP: ${socket.handshake.address})`);

    socket.on('error', (err) => {
        console.error(`[${new Date().toISOString()}] 🔴 Socket Error [${socket.id}]:`, err);
    });

    socket.on('create_room', ({ playerName, avatar }) => {
        const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
        console.log(`[${new Date().toISOString()}] 🏠 Room Created: ${roomId} by ${playerName} (${socket.id})`);

        rooms.set(roomId, {
            ...createGameState(),
            voters: [],
            round: 1
        });

        // Join room
        socket.join(roomId);

        // Update State
        const room = rooms.get(roomId);
        room.players[socket.id] = { name: playerName, avatar, hand: [], score: 0, isHost: true };
        room.playerOrder.push(socket.id);
        normalizeChooserIndex(room);

        socket.emit('room_created', roomId);
        io.to(roomId).emit('state_update', room);
    });

    socket.on('join_room', ({ roomId, playerName, avatar }) => {
        console.log(`[${new Date().toISOString()}] 🚪 Join Request: ${playerName} (${socket.id}) trying to join ${roomId}`);

        if (!rooms.has(roomId)) {
            console.warn(`[${new Date().toISOString()}] ⚠️ Room Not Found: ${roomId}`);
            socket.emit('error', 'Room not found');
            return;
        }

        const room = rooms.get(roomId);

        // CHECK FOR RECONNECTION (Match by Name)
        let existingSocketId = null;
        for (const [sid, p] of Object.entries(room.players)) {
            if (p.name === playerName) {
                existingSocketId = sid;
                break;
            }
        }

        if (existingSocketId) {
            console.log(`[${new Date().toISOString()}] 🔄 Reconnecting Player: ${playerName} (Old: ${existingSocketId} -> New: ${socket.id})`);

            // Cancel any pending delete timer
            if (disconnectTimeouts.has(roomId) && disconnectTimeouts.get(roomId).has(playerName)) {
                console.log(`[${new Date().toISOString()}] ⏱️ Cancelled cleanup timer for ${playerName}`);
                clearTimeout(disconnectTimeouts.get(roomId).get(playerName));
                disconnectTimeouts.get(roomId).delete(playerName);
            }

            // Move player data to new socket ID
            room.players[socket.id] = room.players[existingSocketId];
            if (room.submissions[existingSocketId]) {
                room.submissions[socket.id] = room.submissions[existingSocketId];
                delete room.submissions[existingSocketId];
            }

            if (room.votes[existingSocketId]) {
                room.votes[socket.id] = room.votes[existingSocketId];
                delete room.votes[existingSocketId];
            }

            Object.keys(room.votes).forEach((voterId) => {
                if (room.votes[voterId] === existingSocketId) {
                    room.votes[voterId] = socket.id;
                }
            });

            const voterIdx = room.voters.indexOf(existingSocketId);
            if (voterIdx !== -1) room.voters[voterIdx] = socket.id;

            const readyIdx = room.readyForNextRound.indexOf(existingSocketId);
            if (readyIdx !== -1) room.readyForNextRound[readyIdx] = socket.id;

            const orderIdx = room.playerOrder.indexOf(existingSocketId);
            if (orderIdx !== -1) room.playerOrder[orderIdx] = socket.id;

            if (room.promptChooserId === existingSocketId) {
                room.promptChooserId = socket.id;
            }

            delete room.players[existingSocketId];
            normalizeChooserIndex(room);

            socket.join(roomId);
            socket.emit('room_created', roomId);
            io.to(roomId).emit('state_update', room);
            return;
        }

        // Check Max Players
        if (Object.keys(room.players).length >= 8) {
            console.warn(`[${new Date().toISOString()}] ⚠️ Room Full: ${roomId}`);
            socket.emit('error', 'Room is full (Max 8 players)');
            return;
        }

        socket.join(roomId);

        // New Player Join
        room.players[socket.id] = { name: playerName, avatar, hand: [], score: 0, isHost: false };
        room.playerOrder.push(socket.id);
        normalizeChooserIndex(room);

        console.log(`[${new Date().toISOString()}] ✅ Joined Success: ${playerName} -> ${roomId}`);

        // Send immediate update so they get current phase/prompt
        io.to(roomId).emit('state_update', room);
    });

    socket.on('start_game', (roomId) => {
        console.log(`[${new Date().toISOString()}] 🚀 Game Started: ${roomId}`);
        const room = rooms.get(roomId);
        if (!room) return;

        // Reset scores for a fresh game
        Object.values(room.players).forEach(p => p.score = 0);

        room.phase = 'lobby';
        room.round = 1;
        room.submissions = {};
        room.votes = {};
        room.voters = [];
        room.readyForNextRound = [];
        room.winnerAnnouncement = null;
        room.chooserIndex = 0;
        normalizeChooserIndex(room);

        beginPromptSelection(roomId);
    });

    socket.on('next_round', (roomId) => {
        console.log(`[${new Date().toISOString()}] 🔄 Next Recipe Ready: ${roomId} from ${socket.id}`);
        const room = rooms.get(roomId);
        if (!room) return;

        if (room.phase !== 'results') return;

        if (!room.readyForNextRound.includes(socket.id)) {
            room.readyForNextRound.push(socket.id);
        }

        const threshold = Math.ceil(Object.keys(room.players).length / 2);
        if (room.readyForNextRound.length >= threshold) {
            beginPromptSelection(roomId, { advanceRound: true });
            return;
        }

        io.to(roomId).emit('state_update', room);
    });

    socket.on('skip_prompt', (roomId) => {
        const room = rooms.get(roomId);
        if (!room || room.phase !== 'prompt_selection') return;
        if (room.promptChooserId !== socket.id) return;
        if (room.promptSkipsRemaining <= 0) return;

        room.prompt = getPromptChoices([room.prompt]);
        room.promptSkipsRemaining -= 1;
        io.to(roomId).emit('state_update', room);
    });

    socket.on('choose_prompt', (roomId) => {
        const room = rooms.get(roomId);
        if (!room || room.phase !== 'prompt_selection') return;
        if (room.promptChooserId !== socket.id) return;

        revealPrompt(roomId);
    });

    socket.on('end_game', (roomId) => {
        console.log(`[${new Date().toISOString()}] 🛑 End Game Requested: ${roomId}`);
        const room = rooms.get(roomId);
        if (!room) return;

        // Transition to Game Over (Final Results)
        room.phase = 'game_over';

        // Don't reset scores yet, we want to show them!

        io.to(roomId).emit('end_game'); // Broadcast special event
        io.to(roomId).emit('state_update', room);
    });

    socket.on('submit_salad', ({ roomId, salad }) => {
        console.log(`[${new Date().toISOString()}] 🥗 Salad Submitted: ${roomId} from ${socket.id}`);
        const room = rooms.get(roomId);
        if (!room || room.phase !== 'construction') return;

        room.submissions[socket.id] = salad;

        maybeAdvanceFromConstruction(roomId);
        if (rooms.get(roomId)?.phase === 'construction') {
            io.to(roomId).emit('state_update', room);
        }
    });

    socket.on('vote', ({ roomId, targetId }) => {
        console.log(`[${new Date().toISOString()}] 🗳️ Vote Cast: ${roomId} from ${socket.id} for ${targetId}`);
        const room = rooms.get(roomId);
        if (!room || room.phase !== 'voting') return;
        if (!room.players[targetId] || targetId === socket.id) return;
        if (room.votes[socket.id]) return;

        room.votes[socket.id] = targetId;
        if (!room.voters.includes(socket.id)) {
            room.voters.push(socket.id);
        }

        maybeAdvanceFromVoting(roomId);
        if (rooms.get(roomId)?.phase === 'voting') {
            io.to(roomId).emit('state_update', room);
        }
    });

    socket.on('disconnect', (reason) => {
        console.log(`[${new Date().toISOString()}] 🔴 User disconnected: ${socket.id}. Reason: ${reason}`);

        rooms.forEach((room, roomId) => {
            if (room.players[socket.id]) {
                const playerName = room.players[socket.id].name;
                console.log(`[${new Date().toISOString()}] ⏳ Scheduling cleanup for ${playerName} in ${roomId} (60s)`);

                if (!disconnectTimeouts.has(roomId)) disconnectTimeouts.set(roomId, new Map());

                // Set timeout to remove player
                const timeoutId = setTimeout(() => {
                    console.log(`[${new Date().toISOString()}] 🧹 Removing ${playerName} from ${roomId} (Timeout)`);

                    removePlayerFromRoom(roomId, socket.id);
                    if (disconnectTimeouts.has(roomId)) disconnectTimeouts.get(roomId).delete(playerName);

                }, 60000); // 60 seconds grace period

                disconnectTimeouts.get(roomId).set(playerName, timeoutId);
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Socket.io server running on port ${PORT}`);
});

// All other requests not handled before will return the React app
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});
