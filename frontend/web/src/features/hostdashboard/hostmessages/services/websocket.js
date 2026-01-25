let socket = null;
let pingInterval = null;

export const connectWebSocket = (userId, onMessageReceived) => {

    if (!userId) {
        console.error("WebSocket: User ID is required");
        return;
    }

    if (socket && socket.readyState === WebSocket.OPEN) {
        return;
    }

    const wsUrl = `wss://opehkmyi44.execute-api.eu-north-1.amazonaws.com/production/?userId=${userId}`;
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        pingInterval = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: "ping" }));  
            }
        }, 5 * 60 * 1000);
    };
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        onMessageReceived(data);
    };
    socket.onclose = (event) => {
        clearInterval(pingInterval);
        // Log only if it wasn't a normal closure
        if (event.code !== 1000 && event.code !== 1001) {
            console.warn("WebSocket closed unexpectedly. Code:", event.code, "Reason:", event.reason);
        }
    };
    socket.onerror = (error) => {
        // Only log if it's not a connection error (500 during handshake is expected if backend is down)
        if (socket.readyState !== WebSocket.CONNECTING) {
            console.warn("⚠️ WebSocket error:", error);
        }
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
    if (socket) {
        clearInterval(pingInterval);
        socket.close();
    }
};
