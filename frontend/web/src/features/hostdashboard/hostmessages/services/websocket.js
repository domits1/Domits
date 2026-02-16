let socket = null;
let pingInterval = null;

export const connectWebSocket = (userId, onMessageReceived) => {
  if (!userId) return;

  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const wsUrl = `wss://opehkmyi44.execute-api.eu-north-1.amazonaws.com/production/?userId=${encodeURIComponent(
    userId
  )}`;

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    pingInterval = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "ping" }));
      }
    }, 5 * 60 * 1000);
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessageReceived?.(data);
    } catch (e) {
      // ignore invalid payloads
    }
  };

  socket.onclose = () => {
    clearInterval(pingInterval);
  };

  socket.onerror = () => {
    // websocket can fail (offline / not authenticated / env mismatch). REST still works.
  };
};

export const sendMessage = (message) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(message));
};

export const disconnectWebSocket = () => {
  if (socket) {
    clearInterval(pingInterval);
    socket.close();
    socket = null;
  }
};
