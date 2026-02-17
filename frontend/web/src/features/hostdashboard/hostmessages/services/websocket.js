let socket = null;
let pingInterval = null;

const getWsUrl = ({ token, userId }) => {
  const base = "wss://opehkmyi44.execute-api.eu-north-1.amazonaws.com/production";
  if (token) return `${base}?token=${encodeURIComponent(token)}`;
  return `${base}?userId=${encodeURIComponent(userId)}`; // dev fallback
};

export const connectWebSocket = (userId, onMessageReceived, token) => {
  if (!userId && !token) return;

  if (
    socket &&
    (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
  ) {
    console.log("[WS] already open/connecting", socket.readyState);
    return;
  }

  const wsUrl = getWsUrl({ token, userId });
  console.log("[WS] connecting:", wsUrl);

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log("[WS] open");
    pingInterval = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "ping" }));
      }
    }, 5 * 60 * 1000);
  };

  socket.onmessage = (event) => {
    console.log("[WS] message:", event.data);
    try {
      const data = JSON.parse(event.data);
      onMessageReceived?.(data);
    } catch (e) {}
  };

  socket.onclose = (e) => {
    console.log("[WS] close:", e.code, e.reason);
    clearInterval(pingInterval);
  };

  socket.onerror = (e) => {
    console.log("[WS] error:", e);
  };
};

export const sendMessage = (message) => {
  if (!socket) {
    console.log("[WS] send blocked: no socket");
    return false;
  }
  if (socket.readyState !== WebSocket.OPEN) {
    console.log("[WS] send blocked: not open", socket.readyState);
    return false;
  }
  console.log("[WS] sending:", message);
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
