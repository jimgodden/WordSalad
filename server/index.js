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
    "Describe the worst possible first date.",
    "What did the alien say to the cow?",
    "Write a rejection letter from Hogwarts.",
    "Explain why you were fired from the zoo.",
    "What's the secret ingredient in grandma's cookies?",
    "Describe your mood right now using only food words.",
    "The reason dinosaurs really went extinct.",
    "What does the fox actually say?",
    "The worst thing to hear during surgery.",
    "Proposed new slogan for NASA.",
    "Why the chicken definitively crossed the road.",
    "A rejected Crayola Crayon color.",
    "The worst theme for a children's birthday party.",
    "Things you shouldn't say at a funeral.",
    "The real reason the internet was invented.",
    "What your pet really thinks of you.",
    "The title of your autobiography.",
    "A review of the worst restaurant ever.",
    "The last text message you sent, but make it ominous.",
    "Describe a new Olympic sport based on your lazy Sunday.",
    "The worst pickup line in history.",
    "What's really in Area 51?",
    "A tweet from a caveman.",
    "The plot of a movie that got a 0% on Rotten Tomatoes.",
    "Your superhero name and useless power.",
    "A fortune cookie fortune that implies immediate danger.",
    "The reason you were kicked out of IKEA.",
    "What the Mona Lisa is smiling about.",
    "A rejected slogan for McDonald's.",
    "The worst advice to give a new parent.",
    "What you would do if you were invisible for 5 minutes.",
    "The worst thing to find in your burrito.",
    "A Yelp review for Earth.",
    "The name of a band made up of grandmas.",
    "What really happens in the Bermuda Triangle.",
    "The worst way to propose marriage.",
    "A conspiracy theory about pigeons.",
    "The first sentence of the worst novel ever written.",
    "What you would say to your past self.",
    "The worst job interview answer.",
    "A rejected flavor of ice cream.",
    "The real reason the Titanic sank.",
    "What's in the box?",
    "The worst thing to say to a police officer.",
    "A tagline for a horror movie about socks.",
    "The reason you failed your driving test.",
    "What you would bring to a desert island (wrong answers only).",
    "The worst gift to give on Valentine's Day.",
    "A rejected name for a new planet.",
    "The title of a self-help book written by a cat.",
    "What really happened to the socks in the dryer.",
    "The worst possible pizza topping."
];

// Helper to generate initial state
const createGameState = () => ({
    phase: 'lobby',
    prompt: '',
    players: {}, // socketId -> { name, hand: [], score: 0, isHost: false }
    submissions: {}, // socketId -> WordItem[]
    votes: { funny: {}, saucy: {} } // category -> { candidateId -> count }
});

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
            voters: [], // Track unique voters
            round: 1
        });

        // Join room
        socket.join(roomId);

        // Update State
        const room = rooms.get(roomId);
        room.players[socket.id] = { name: playerName, avatar, hand: [], score: 0, isHost: true };

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
            // Update voters list if needed
            const voterIdx = room.voters.indexOf(existingSocketId);
            if (voterIdx !== -1) room.voters[voterIdx] = socket.id;

            delete room.players[existingSocketId];

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

        room.voters = [];
        startGameLoop(roomId);
    });

    socket.on('next_round', (roomId) => {
        console.log(`[${new Date().toISOString()}] 🔄 Next Round Requested: ${roomId}`);
        const room = rooms.get(roomId);
        if (!room) return;

        room.round++;
        // Reset for new round
        room.submissions = {};
        room.votes = { funny: {}, saucy: {} };
        room.voters = [];

        startGameLoop(roomId);
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

    const startGameLoop = (roomId) => {
        const room = rooms.get(roomId);
        if (!room) return;

        room.phase = 'prompt';
        room.prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
        io.to(roomId).emit('state_update', room);

        // 5 seconds prompt reading time
        setTimeout(() => {
            if (room.phase === 'prompt') {
                room.phase = 'construction';
                io.to(roomId).emit('state_update', room);
            }
        }, 5000);
    };

    socket.on('submit_salad', ({ roomId, salad }) => {
        console.log(`[${new Date().toISOString()}] 🥗 Salad Submitted: ${roomId} from ${socket.id}`);
        const room = rooms.get(roomId);
        if (!room) return;

        // Store salad (submission)
        // We strip IDs here to avoid any issues, or just keep them
        room.submissions[socket.id] = salad;

        // If all players submitted, advance to voting
        if (Object.keys(room.submissions).length === Object.keys(room.players).length) {
            console.log(`[${new Date().toISOString()}] 🗳️ All Submissions In: ${roomId} -> Voting`);
            room.phase = 'voting';
            room.votes = { funny: {}, saucy: {} };
        }

        io.to(roomId).emit('state_update', room);
    });

    socket.on('vote', ({ roomId, category, targetId }) => {
        console.log(`[${new Date().toISOString()}] 🗳️ Vote Cast: ${roomId} [${category}] for ${targetId}`);
        const room = rooms.get(roomId);
        // Ensure room exists and votes object structure is valid
        if (!room || !room.votes || !room.votes[category]) return;

        const currentVotes = room.votes[category][targetId] || 0;
        room.votes[category][targetId] = currentVotes + 1;

        // Update Score
        if (room.players[targetId]) {
            room.players[targetId].score += 1;
        }

        // Track WHO voted
        if (!room.voters) room.voters = [];
        if (!room.voters.includes(socket.id)) {
            room.voters.push(socket.id);
        }

        // Check if everyone has voted
        const totalPlayers = Object.keys(room.players).length;
        const totalVoters = room.voters.length;

        if (totalVoters >= totalPlayers) {
            console.log(`✅ All players voted in ${roomId}. Advancing to results...`);
            room.phase = 'results';
        }

        io.to(roomId).emit('state_update', room);
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

                    if (room.players[socket.id]) {
                        delete room.players[socket.id];
                        delete room.submissions[socket.id];

                        // Check empty room
                        if (Object.keys(room.players).length === 0) {
                            rooms.delete(roomId);
                            disconnectTimeouts.delete(roomId);
                            console.log(`[${new Date().toISOString()}] 🗑️ Room ${roomId} deleted (empty)`);
                        } else {
                            io.to(roomId).emit('state_update', room);
                        }
                    }
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
