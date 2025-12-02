let socket = null;
let pingInterval = null;
let reconnectTimeout = null;

export const connectWebSocket = (userId, onMessageReceived) => {

    if (!userId) {
        console.error("WebSocket: User ID is required");
        return;
    }

    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return;
    }

    const wsUrl = `wss://opehkmyi44.execute-api.eu-north-1.amazonaws.com/production/?userId=${userId}`;
    console.log(`Connecting to WebSocket: ${wsUrl}`);
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log("✅ WebSocket Connected");
        if (pingInterval) clearInterval(pingInterval);
        pingInterval = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                console.log("Sending WebSocket Ping...");
                socket.send(JSON.stringify({ type: "ping" }));
            }
        }, 30000); // 30 seconds ping
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            onMessageReceived(data);
        } catch (e) {
            console.error("Error parsing WebSocket message:", e);
        }
    };

    socket.onclose = (e) => {
        console.log("WebSocket Disconnected:", e.reason);
        clearInterval(pingInterval);
        socket = null;
        
        // Attempt to reconnect
        if (!reconnectTimeout) {
            reconnectTimeout = setTimeout(() => {
                console.log("♻️ Attempting WebSocket Reconnection...");
                reconnectTimeout = null;
                connectWebSocket(userId, onMessageReceived);
            }, 5000);
        }
    };

    socket.onerror = (error) => {
        console.error("⚠️ WebSocket error:", error.message || error);
    };
};

export const sendMessage = (message) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.error("⚠️ WebSocket is not connected. Cannot send message.");
        return;
    }

    socket.send(JSON.stringify(message));
};

export const disconnectWebSocket = () => {
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }
    if (socket) {
        // Remove listeners to prevent reconnection triggering
        socket.onclose = null; 
        socket.onerror = null;
        
        clearInterval(pingInterval);
        socket.close();
        socket = null;
        pingInterval = null;
    }
};
