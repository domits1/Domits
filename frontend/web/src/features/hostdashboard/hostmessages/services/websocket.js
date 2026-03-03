let socket = null;
let pingInterval = null;

const getWsUrl = ({ token, userId }) => {
  const base = "wss://opehkmyi44.execute-api.eu-north-1.amazonaws.com/production";
  if (token) return `${base}?token=${encodeURIComponent(token)}`;
  return `${base}?userId=${encodeURIComponent(userId)}`;
};

export const connectWebSocket = (userId, onMessageReceived, token) => {
  if (!userId && !token) return;

  if (
    socket &&
    (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  const wsUrl = getWsUrl({ token, userId });

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
      console.warn("WebSocket message parse failed", e);
    }
  };

  socket.onclose = () => {
    clearInterval(pingInterval);
  };

  socket.onerror = (err) => {
    console.warn("WebSocket error", err);
  };
};

export const sendMessage = (message) => {
  if (!socket) {
    return false;
  }
  if (socket.readyState !== WebSocket.OPEN) {
    return false;
  }
  socket.send(JSON.stringify(message));
  return true;
};

export const disconnectWebSocket = () => {
  if (socket) {
    clearInterval(pingInterval);
    socket.close();
    socket = null;
  }
};
