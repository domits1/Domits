import React, { useEffect, useMemo, useState } from "react";
import { UserProvider } from "./hostmessages/context/AuthContext";
import { useAuth } from "./hostmessages/hooks/useAuth";
import "./hostintegrations/HostIntegrations.scss";

const UNIFIED_API = "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default";

const CHANNEL_LABELS = {
  WHATSAPP: "WhatsApp",
};

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

function IntegrationCard({ integration, onManage }) {
  const connected = String(integration?.channel || "").toUpperCase() === "WHATSAPP" && !!integration?.externalAccountId;

  return (
    <article className="host-integrations-card">
      <div className="host-integrations-card-head">
        <div>
          <h3>{integration.channelLabel}</h3>
          <p className="host-integrations-card-copy">
            {connected
              ? "This channel is connected and can be used from the unified inbox."
              : "Connect this channel to send and receive messages in Domits."}
          </p>
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
            <span className="host-integrations-meta-label">Phone number ID</span>
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

function WhatsAppSetupPanel({ integration }) {
  const connected = !!integration?.externalAccountId;

  return (
    <section className="host-integrations-setup">
      <div className="host-integrations-setup-header">
        <h2>WhatsApp integration</h2>
        <p>
          Connect your WhatsApp Business so hosts can reply from the Domits inbox. This page is the right place for the
          future Meta connect flow.
        </p>
      </div>

      <div className="host-integrations-steps">
        <div className="host-integrations-step">
          <span className="host-integrations-step-number">1</span>
          <div>
            <h4>Connect with Meta</h4>
            <p>
              Start a Meta login and permission flow here, so the host can authorize Domits to use their WhatsApp
              Business number.
            </p>
          </div>
        </div>

        <div className="host-integrations-step">
          <span className="host-integrations-step-number">2</span>
          <div>
            <h4>Select business number</h4>
            <p>If the host has multiple numbers, let them pick the number they want to use for Domits messaging.</p>
          </div>
        </div>

        <div className="host-integrations-step">
          <span className="host-integrations-step-number">3</span>
          <div>
            <h4>Confirm connection</h4>
            <p>
              Save the selected WhatsApp Business details in the integration tables and show the connection status in
              the dashboard.
            </p>
          </div>
        </div>
      </div>

      <div className="host-integrations-callout">
        {connected ? (
          <>
            <h4>Current test connection</h4>
            <p>
              A WhatsApp integration is already linked for this user. The next implementation step is replacing the
              temporary/manual setup with a real host self-service Meta connect flow.
            </p>
          </>
        ) : (
          <>
            <h4>No WhatsApp connected yet</h4>
            <p>
              The UI entry point is ready. The next implementation step is the real Meta authorization flow plus saving
              the selected phone number ID for the host.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function HostIntegrationsInner() {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [integrations, setIntegrations] = useState([]);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
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

        if (!cancelled) {
          setIntegrations(normalized);
          const firstWhatsApp = normalized.find((item) => item.channel === "WHATSAPP");
          setSelectedIntegrationId(firstWhatsApp?.id || null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load integrations");
          setIntegrations([]);
          setSelectedIntegrationId(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
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
      },
    ];
  }, [integrations]);

  const selectedIntegration =
    visibleIntegrations.find((item) => String(item.id) === String(selectedIntegrationId)) || visibleIntegrations[0];

  return (
    <main className="host-integrations-page">
      <header className="host-integrations-hero">
        <div>
          <p className="host-integrations-eyebrow">Host dashboard</p>
          <h1>Integrations</h1>
          <p className="host-integrations-subtitle">
            Connect external messaging channels and manage which business number Domits should use.
          </p>
        </div>
      </header>

      {loading ? <p className="host-integrations-loading">Loading integrations…</p> : null}
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
            <WhatsAppSetupPanel integration={selectedIntegration} />
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