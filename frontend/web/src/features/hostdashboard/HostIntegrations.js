import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { UserProvider } from "./hostmessages/context/AuthContext";
import { useAuth } from "./hostmessages/hooks/useAuth";
import "./hostintegrations/HostIntegrations.scss";

const UNIFIED_API = "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default";

/**
 * CHANGE LATER FOR PRODUCTION:
 * - localhost for now
 * - later replace with https://www.domits.com
 */
const WHATSAPP_CALLBACK_URL = "http://localhost:3000/hostdashboard/integrations-marketplace/whatsapp/callback";

const META_APP_ID = "1808176813897212";
const META_EMBEDDED_SIGNUP_CONFIG_ID = "1259900802765110";

const CHANNEL_LABELS = {
  WHATSAPP: "WhatsApp",
};

const integrationPropType = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  status: PropTypes.string,
  displayName: PropTypes.string,
  channelLabel: PropTypes.string,
  externalAccountId: PropTypes.string,
  lastSuccessfulSyncAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  lastErrorMessage: PropTypes.string,
});

const statusToneClass = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "connected" || normalized === "active") return "is-success";
  if (normalized === "pending") return "is-pending";
  if (normalized === "error" || normalized === "failed" || normalized === "disconnected") return "is-danger";
  return "is-muted";
};

const normalizeIntegration = (row) => {
  if (!row || typeof row !== "object") return null;

  const channel = String(row.channel || "").toUpperCase();
  return {
    id: row.id,
    channel,
    channelLabel: CHANNEL_LABELS[channel] || channel || "Integration",
    displayName: row.displayName || null,
    externalAccountId: row.externalAccountId || null,
    status: row.status || "Not connected",
    lastSuccessfulSyncAt: row.lastSuccessfulSyncAt || null,
    lastFailedSyncAt: row.lastFailedSyncAt || null,
    lastErrorMessage: row.lastErrorMessage || null,
    credentialsRef: row.credentialsRef || null,
  };
};

const formatDateTime = (value) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
};

const buildMetaEmbeddedSignupUrl = ({ userId, connectSessionId }) => {
  const statePayload = {
    userId,
    connectSessionId,
    channel: "WHATSAPP",
    callbackUrl: WHATSAPP_CALLBACK_URL,
  };

  const params = new URLSearchParams({
    client_id: META_APP_ID,
    config_id: META_EMBEDDED_SIGNUP_CONFIG_ID,
    response_type: "code",
    override_default_response_type: "true",
    redirect_uri: WHATSAPP_CALLBACK_URL,
    state: btoa(JSON.stringify(statePayload)),
  });

  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
};

const getIntegrationCardCopy = (connected) =>
  connected
    ? "Your WhatsApp Business number is connected and ready to use in your Domits inbox."
    : "Connect your WhatsApp Business number to send and receive messages in Domits.";

const getConnectCalloutTitle = (connected) => (connected ? "Your current connection" : "Before you connect");

const getConnectCalloutCopy = (connected) =>
  connected
    ? "You can reconnect to replace your current WhatsApp Business number, or disconnect it at any time."
    : "You’ll continue with Meta to connect your business number. If you already use WhatsApp Business, you can connect your existing number. If you’re new, Meta will guide you through the setup.";

const getConnectButtonLabel = ({ connecting, connected }) => {
  if (connecting) return "Starting...";
  if (connected) return "Reconnect with Meta";
  return "Connect your WhatsApp Business";
};

function IntegrationCard({ integration, onManage }) {
  const connected = String(integration?.channel || "").toUpperCase() === "WHATSAPP" && !!integration?.externalAccountId;

  return (
    <article className="host-integrations-card">
      <div className="host-integrations-card-head">
        <div>
          <h3>{integration.channelLabel}</h3>
          <p className="host-integrations-card-copy">{getIntegrationCardCopy(connected)}</p>
        </div>

        <span className={`host-integrations-status ${statusToneClass(integration.status)}`}>{integration.status}</span>
      </div>

      <div className="host-integrations-card-body">
        <div className="host-integrations-meta">
          <div>
            <span className="host-integrations-meta-label">Display name</span>
            <strong>{integration.displayName || "Not set"}</strong>
          </div>

          <div>
            <span className="host-integrations-meta-label">WhatsApp number ID</span>
            <strong>{integration.externalAccountId || "Not connected"}</strong>
          </div>

          <div>
            <span className="host-integrations-meta-label">Last successful sync</span>
            <strong>{formatDateTime(integration.lastSuccessfulSyncAt)}</strong>
          </div>
        </div>

        {integration.lastErrorMessage ? <p className="host-integrations-error">{integration.lastErrorMessage}</p> : null}

        <div className="host-integrations-actions">
          <button type="button" className="host-integrations-primary-btn" onClick={() => onManage?.(integration.id)}>
            {connected ? "Manage WhatsApp" : "Connect WhatsApp"}
          </button>
        </div>
      </div>
    </article>
  );
}

IntegrationCard.propTypes = {
  integration: integrationPropType,
  onManage: PropTypes.func,
};

function WhatsAppSetupPanel({
  integration,
  connecting,
  disconnecting,
  connectSessionId,
  actionError,
  actionSuccess,
  onStartConnect,
  onDisconnect,
}) {
  const connected = !!integration?.externalAccountId;

  return (
    <section className="host-integrations-setup">
      <div className="host-integrations-setup-header">
        <h2>WhatsApp Business</h2>
        <p>
          Connect your WhatsApp Business number here so you can manage WhatsApp conversations directly in Domits.
        </p>
      </div>

      <div className="host-integrations-steps">
        <div className="host-integrations-step">
          <span className="host-integrations-step-number">1</span>
          <div>
            <h4>Start your connection</h4>
            <p>You’ll continue with Meta to securely connect your business number.</p>
          </div>
        </div>

        <div className="host-integrations-step">
          <span className="host-integrations-step-number">2</span>
          <div>
            <h4>Use your existing number or set up a new one</h4>
            <p>If you already use WhatsApp Business, you can connect that number. If you’re new, Meta will guide you.</p>
          </div>
        </div>

        <div className="host-integrations-step">
          <span className="host-integrations-step-number">3</span>
          <div>
            <h4>Finish in Domits</h4>
            <p>After connecting, you’ll be able to manage WhatsApp conversations in Domits.</p>
          </div>
        </div>
      </div>

      <div className="host-integrations-callout">
        <h4>{getConnectCalloutTitle(connected)}</h4>
        <p>{getConnectCalloutCopy(connected)}</p>
      </div>

      <div className="host-integrations-flow">
        <div className="host-integrations-flow-actions">
          <button type="button" className="host-integrations-primary-btn" disabled={connecting} onClick={onStartConnect}>
            {getConnectButtonLabel({ connecting, connected })}
          </button>

          {connected ? (
            <button
              type="button"
              className="host-integrations-secondary-btn"
              disabled={disconnecting}
              onClick={onDisconnect}
            >
              {disconnecting ? "Disconnecting..." : "Disconnect WhatsApp"}
            </button>
          ) : null}

          {connectSessionId ? (
            <span className="host-integrations-session-chip">Session ready</span>
          ) : (
            <span className="host-integrations-session-chip is-muted">No active session</span>
          )}
        </div>

        {actionError ? <p className="host-integrations-error-banner">{actionError}</p> : null}
        {actionSuccess ? <p className="host-integrations-success-banner">{actionSuccess}</p> : null}
      </div>
    </section>
  );
}

WhatsAppSetupPanel.propTypes = {
  integration: integrationPropType,
  connecting: PropTypes.bool,
  connectSessionId: PropTypes.string,
  disconnecting: PropTypes.bool,
  actionError: PropTypes.string,
  actionSuccess: PropTypes.string,
  onStartConnect: PropTypes.func,
  onDisconnect: PropTypes.func,
};

function HostIntegrationsInner() {
  const { userId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [integrations, setIntegrations] = useState([]);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState(null);

  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectSessionId, setConnectSessionId] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const fetchIntegrations = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${UNIFIED_API}/integrations?userId=${encodeURIComponent(userId)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Failed to fetch integrations: ${res.status} ${txt}`);
      }

      const data = await res.json();
      const rows = Array.isArray(data) ? data : [];
      const normalized = rows.map(normalizeIntegration).filter(Boolean);

      setIntegrations(normalized);
      const firstWhatsApp = normalized.find((item) => item.channel === "WHATSAPP");
      setSelectedIntegrationId(firstWhatsApp?.id || null);
    } catch (err) {
      setError(err?.message || "Failed to load integrations");
      setIntegrations([]);
      setSelectedIntegrationId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, [userId]);

  const visibleIntegrations = useMemo(() => {
    const whatsapp = integrations.filter((item) => item.channel === "WHATSAPP");
    if (whatsapp.length > 0) return whatsapp;

    return [
      {
        id: "whatsapp-placeholder",
        channel: "WHATSAPP",
        channelLabel: "WhatsApp",
        displayName: null,
        externalAccountId: null,
        status: "Not connected",
        lastSuccessfulSyncAt: null,
        lastFailedSyncAt: null,
        lastErrorMessage: null,
        credentialsRef: null,
      },
    ];
  }, [integrations]);

  const selectedIntegration =
    visibleIntegrations.find((item) => String(item.id) === String(selectedIntegrationId)) || visibleIntegrations[0];

  const handleStartConnect = async () => {
    setActionError("");
    setActionSuccess("");
    setConnecting(true);

    try {
      const res = await fetch(`${UNIFIED_API}/integrations/whatsapp/connect/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          callbackUrl: WHATSAPP_CALLBACK_URL,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Failed to start WhatsApp connect");
      }

      const nextSessionId = data?.connectSessionId || "";
      if (!nextSessionId) {
        throw new Error("Missing connectSessionId from backend");
      }

      setConnectSessionId(nextSessionId);
      setActionSuccess("Taking you to Meta to connect your WhatsApp Business number...");

      const metaUrl = buildMetaEmbeddedSignupUrl({
        userId,
        connectSessionId: nextSessionId,
      });

      globalThis.location.href = metaUrl;
    } catch (err) {
      setActionError(err?.message || "Failed to start connect");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const confirmed = globalThis.confirm(
      "Disconnect WhatsApp? This will stop new WhatsApp messages from being sent or received in Domits. Existing conversations will remain visible."
    );
    if (!confirmed) return;

    setActionError("");
    setActionSuccess("");
    setDisconnecting(true);

    try {
      const res = await fetch(`${UNIFIED_API}/integrations/whatsapp/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Failed to disconnect WhatsApp");
      }

      setConnectSessionId("");
      setActionSuccess("WhatsApp disconnected successfully.");
      await fetchIntegrations();
    } catch (err) {
      setActionError(err?.message || "Failed to disconnect WhatsApp");
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <main className="host-integrations-page">
      <header className="host-integrations-hero">
        <div>
          <p className="host-integrations-eyebrow">Host dashboard</p>
          <h1>Marketplace</h1>
          <p className="host-integrations-subtitle">
            Connect your WhatsApp Business number and manage how WhatsApp conversations appear in Domits.
          </p>
        </div>
      </header>

      {loading ? <p className="host-integrations-loading">Loading Marketplace…</p> : null}
      {error ? <p className="host-integrations-error-banner">{error}</p> : null}

      {!loading && !error ? (
        <div className="host-integrations-grid">
          <section className="host-integrations-list">
            {visibleIntegrations.map((integration) => (
              <button
                key={integration.id}
                type="button"
                className={`host-integrations-list-item ${
                  String(selectedIntegration?.id) === String(integration.id) ? "is-active" : ""
                }`}
                onClick={() => setSelectedIntegrationId(integration.id)}
              >
                <IntegrationCard integration={integration} onManage={setSelectedIntegrationId} />
              </button>
            ))}
          </section>

          <div className="host-integrations-detail">
            <WhatsAppSetupPanel
              integration={selectedIntegration}
              connecting={connecting}
              disconnecting={disconnecting}
              connectSessionId={connectSessionId}
              actionError={actionError}
              actionSuccess={actionSuccess}
              onStartConnect={handleStartConnect}
              onDisconnect={handleDisconnect}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function HostIntegrations() {
  return (
    <UserProvider>
      <HostIntegrationsInner />
    </UserProvider>
  );
}
