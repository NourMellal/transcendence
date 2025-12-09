#!/usr/bin/env node

/**
 * WebSocket Test Client for Chat Service
 * Tests connection, authentication, and messaging
 */

const io = require('socket.io-client');

// Get token from command line or use environment variable
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || process.argv[2];

if (!ACCESS_TOKEN) {
    console.error('❌ Usage: node test-websocket.js <ACCESS_TOKEN>');
    console.error('   Or set ACCESS_TOKEN environment variable');
    process.exit(1);
}

console.log('🔌 Connecting to WebSocket server...');

// Connect to the chat service WebSocket
const socket = io('http://localhost:3003', {
    path: '/socket.io/',
    query: {
        token: ACCESS_TOKEN
    },
    extraHeaders: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`
    },
    transports: ['websocket']
});

socket.on('connect', () => {
    console.log('✅ Connected to chat service');
    console.log(`   Socket ID: ${socket.id}`);
});

socket.on('connected', (data) => {
    console.log('👤 Authentication successful:', data);
    
    // Test sending a global message
    console.log('\n📤 Sending a global message...');
    socket.emit('send_message', {
        content: 'Hello from WebSocket test client!',
        type: 'GLOBAL'
    });
});

socket.on('message_sent', (data) => {
    console.log('✅ Message sent successfully:', data);
});

socket.on('new_message', (message) => {
    console.log('📨 New message received:', {
        id: message.id,
        from: message.senderUsername,
        content: message.content,
        type: message.type
    });
});

socket.on('message_error', (error) => {
    console.error('❌ Message error:', error);
});

socket.on('disconnect', (reason) => {
    console.log('👋 Disconnected:', reason);
    process.exit(0);
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
    process.exit(1);
});

// Keep the connection alive for testing
console.log('\n📡 Listening for messages... (Press Ctrl+C to exit)');

// Test sending messages periodically
let messageCount = 0;
const testInterval = setInterval(() => {
    messageCount++;
    if (messageCount > 3) {
        clearInterval(testInterval);
        console.log('\n✅ Test completed. Disconnecting...');
        socket.disconnect();
        return;
    }
    
    console.log(`\n📤 Sending test message #${messageCount}...`);
    socket.emit('send_message', {
        content: `Test message #${messageCount} at ${new Date().toISOString()}`,
        type: 'GLOBAL'
    });
}, 3000);
