let socket = null;
let pingInterval = null;

export const connectWebSocket = (userId, onMessageReceived) => {

    if (!userId) {
        console.error("WebSocket: User ID is required");
        return;
    }

    if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("WebSocket already connected");
        return;
    }

    const wsUrl = `wss://opehkmyi44.execute-api.eu-north-1.amazonaws.com/production/?userId=${userId}`;
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log("✅ WebSocket connected");
        //ping so that it doesnt disconnect
        pingInterval = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: "ping" }));  // Send a "ping" message
            }
        }, 5 * 60 * 1000); // 5 minutes
    };
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        onMessageReceived(data);
    };
    socket.onclose = () => {
        console.log("❌ WebSocket closed");
        clearInterval(pingInterval); // Stop pings 
    };
    socket.onerror = (error) => console.error("⚠️ WebSocket error:", error);
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
        console.log("🔌 WebSocket disconnected");
    }
};
