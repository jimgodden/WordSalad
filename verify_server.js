import { io } from 'socket.io-client';

const URL = 'http://localhost:3000';
const client1 = io(URL);
const client2 = io(URL);

let roomId = '';

console.log('🧪 Starting Verification Simulation...');

// Client 1 Lifecycle
client1.on('connect', () => {
    console.log('✅ Client 1 Connected');
    client1.emit('create_room', 'HostUser');
});

client1.on('room_created', (id) => {
    console.log(`🏠 Room Created: ${id}`);
    roomId = id;
    // Client 2 joins after room is created
    setTimeout(() => {
        client2.emit('join_room', { roomId, playerName: 'GuestUser' });
    }, 500);
});

client1.on('state_update', (state) => {
    handleStateUpdate('Client 1', state, client1);
});

// Client 2 Lifecycle
client2.on('connect', () => {
    console.log('✅ Client 2 Connected');
});

client2.on('state_update', (state) => {
    handleStateUpdate('Client 2', state, client2);
});

// Game Logic
let round1Complete = false;

function handleStateUpdate(name, state, socket) {
    // console.log(`[${name}] Phase: ${state.phase}, Round: ${state.round}`);

    if (state.phase === 'lobby' && state.players[socket.id]?.isHost && Object.keys(state.players).length === 2) {
        console.log(`🚀 ${name} (Host) Starting Game...`);
        socket.emit('start_game', roomId);
    }

    if (state.phase === 'construction') {
        const myHand = state.players[socket.id]?.hand || [];
        // Note: Hand generation is client-side in the real app, but server tracks phase.
        // For this test, we just submit a dummy salad immediately.
        if (!state.submissions[socket.id]) {
            console.log(`🥗 ${name} submitting salad...`);
            socket.emit('submit_salad', {
                roomId,
                salad: [{ id: 'test', text: 'salad' }]
            });
        }
    }

    if (state.phase === 'voting') {
        // Vote for the other person
        const otherId = Object.keys(state.players).find(id => id !== socket.id);

        // Check if we already voted? The server allows multiple votes per category/target in this mvp?
        // Let's just check if total votes < 2
        const totalVotes = Object.values(state.votes.funny).reduce((a, b) => a + b, 0);

        if (otherId && totalVotes < 2) {
            console.log(`🗳️ ${name} voting for ${otherId}`);
            socket.emit('vote', { roomId, category: 'funny', targetId: otherId });
        }
    }

    // Simulate Host clicking Next Round at results
    if (state.phase === 'voting' && Object.keys(state.votes.funny).length >= 1 && !round1Complete) {
        // Hack: In checking if we moved to results. 
        // Real app moves to 'results' locally or needs server trigger?
        // In server/index.js, 'voting' stays until manual 'next_round'? 
        // Wait, the SERVER doesn't auto-move to 'results'. 
        // The Client UI moves to 'results' (or stays in voting).
        // The Host button calls 'next_round'.

        if (name === 'Client 1' && !round1Complete) {
            console.log(`⏭️ ${name} (Host) triggering Next Round...`);
            socket.emit('next_round', roomId);
            round1Complete = true;
        }
    }

    if (state.round === 2 && state.phase === 'prompt') {
        console.log('✅✅ Round 2 Started Successfully!');
        process.exit(0);
    }
}

// Timeout
setTimeout(() => {
    console.error('❌ Test Timed Out');
    process.exit(1);
}, 10000);
