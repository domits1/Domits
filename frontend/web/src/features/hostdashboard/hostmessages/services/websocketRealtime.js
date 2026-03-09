const WS_BASE =
  process.env.REACT_APP_DOMITS_WS_URL ||
  "wss://opehkmyi44.execute-api.eu-north-1.amazonaws.com/production";

let ws = null;
let reconnectTimer = null;
let shouldReconnect = true;
let currentKey = null;
let backoffMs = 500;

const safeParse = (data) => {
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
};

const clearReconnect = () => {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
};

const buildUrl = ({ token, userId }) => {
  const qs = new URLSearchParams();
  if (token) qs.set("token", token);
  if (userId) qs.set("userId", userId);
  return `${WS_BASE}?${qs.toString()}`;
};

export const connectWebSocketRealtime = ({ userId, token, onMessage, onStatus }) => {
  shouldReconnect = true;

  const key = `${userId || ""}:${token ? "t" : "no-t"}`;
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) && currentKey === key) {
    onStatus?.("already-connected");
    return;
  }

  currentKey = key;

  const url = buildUrl({ token, userId });

  try {
    ws?.close();
  } catch {}
  ws = null;

  clearReconnect();
  backoffMs = 500;

  onStatus?.(`connecting:${url}`);

  ws = new WebSocket(url);

  ws.onopen = () => {
    backoffMs = 500;
    onStatus?.("open");
  };

  ws.onmessage = (evt) => {
    const payload = typeof evt?.data === "string" ? safeParse(evt.data) : evt.data;
    onMessage?.(payload);
  };

  ws.onerror = () => {
    onStatus?.("error");
  };

  ws.onclose = () => {
    onStatus?.("closed");

    if (!shouldReconnect) return;

    clearReconnect();
    const wait = Math.min(backoffMs, 8000);
    backoffMs = Math.min(backoffMs * 2, 8000);

    reconnectTimer = setTimeout(() => {
      if (!shouldReconnect) return;
      if (currentKey !== key) return;
      connectWebSocketRealtime({ userId, token, onMessage, onStatus });
    }, wait);
  };
};

export const disconnectWebSocketRealtime = () => {
  shouldReconnect = false;
  currentKey = null;
  clearReconnect();

  try {
    ws?.close();
  } catch {}

  ws = null;
};
