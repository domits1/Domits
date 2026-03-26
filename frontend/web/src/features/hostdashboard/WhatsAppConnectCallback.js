import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { UserProvider } from "./hostmessages/context/AuthContext";
import { useAuth } from "./hostmessages/hooks/useAuth";
import "./hostintegrations/HostIntegrations.scss";

const UNIFIED_API = "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default";
const COMPLETE_CACHE_PREFIX = "whatsapp-connect-complete";
const COMPLETE_POLL_INTERVAL_MS = 500;
const COMPLETE_POLL_TIMEOUT_MS = 15000;

const decodeState = (value) => {
  try {
    if (!value) return null;
    return JSON.parse(atob(value));
  } catch {
    return null;
  }
};

const buildCompleteCacheKey = ({ connectSessionId, code }) => {
  if (!connectSessionId || !code) return "";
  return `${COMPLETE_CACHE_PREFIX}:${connectSessionId}:${code}`;
};

const readCompletionCache = (cacheKey) => {
  if (!cacheKey) return null;

  try {
    const raw = window.sessionStorage.getItem(cacheKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCompletionCache = (cacheKey, value) => {
  if (!cacheKey) return;

  try {
    window.sessionStorage.setItem(cacheKey, JSON.stringify(value));
  } catch {
    // Ignore sessionStorage write failures and continue with in-memory flow.
  }
};

function WhatsAppConnectCallbackInner() {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [params] = useSearchParams();
  const startedCacheKeyRef = useRef("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectableNumbers, setSelectableNumbers] = useState([]);
  const [saving, setSaving] = useState(false);

  const code = params.get("code");
  const stateRaw = params.get("state");
  const errorReason = params.get("error_reason") || params.get("error");
  const errorDescription = params.get("error_description");

  const decodedState = useMemo(() => decodeState(stateRaw), [stateRaw]);
  const completeCacheKey = useMemo(
    () =>
      buildCompleteCacheKey({
        connectSessionId: decodedState?.connectSessionId,
        code,
      }),
    [code, decodedState]
  );

  useEffect(() => {
    let cancelled = false;
    let pollTimer = null;
    let pollTimeout = null;

    const applyCompletedState = (payload) => {
      const nextNumbers = Array.isArray(payload?.selectableNumbers) ? payload.selectableNumbers : [];
      setSelectableNumbers(nextNumbers);
      setSuccessMessage(
        nextNumbers.length > 0
          ? "Meta authorization completed. Select the WhatsApp number you want to connect."
          : "Meta authorization completed, but no selectable numbers were returned yet."
      );
      setError("");
      setLoading(false);
    };

    const run = async () => {
      if (errorReason) {
        setError(errorDescription || errorReason || "Meta authorization was cancelled or failed.");
        setLoading(false);
        return;
      }

      if (!code) {
        setError("Missing authorization code in callback URL.");
        setLoading(false);
        return;
      }

      if (!decodedState?.connectSessionId) {
        setError("Missing connect session state.");
        setLoading(false);
        return;
      }

      const cached = readCompletionCache(completeCacheKey);
      if (cached?.status === "completed") {
        applyCompletedState(cached.payload);
        return;
      }

      if (cached?.status === "failed") {
        setError(cached.error || "Failed to complete callback processing.");
        setLoading(false);
        return;
      }

      if (cached?.status === "processing") {
        pollTimer = window.setInterval(() => {
          const nextCached = readCompletionCache(completeCacheKey);
          if (!nextCached || cancelled) return;

          if (nextCached.status === "completed") {
            window.clearInterval(pollTimer);
            window.clearTimeout(pollTimeout);
            if (!cancelled) applyCompletedState(nextCached.payload);
          }

          if (nextCached.status === "failed") {
            window.clearInterval(pollTimer);
            window.clearTimeout(pollTimeout);
            if (!cancelled) {
              setError(nextCached.error || "Failed to complete callback processing.");
              setLoading(false);
            }
          }
        }, COMPLETE_POLL_INTERVAL_MS);

        pollTimeout = window.setTimeout(() => {
          window.clearInterval(pollTimer);
          if (!cancelled) {
            setError("WhatsApp authorization is already being finalized. Please wait a moment and refresh if needed.");
            setLoading(false);
          }
        }, COMPLETE_POLL_TIMEOUT_MS);

        return;
      }

      if (startedCacheKeyRef.current === completeCacheKey) {
        return;
      }

      try {
        const resolvedUserId = decodedState?.userId || userId;
        if (!resolvedUserId) {
          throw new Error("Missing userId for callback processing.");
        }

        startedCacheKeyRef.current = completeCacheKey;
        writeCompletionCache(completeCacheKey, {
          status: "processing",
          startedAt: Date.now(),
        });

        const res = await fetch(`${UNIFIED_API}/integrations/whatsapp/connect/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: resolvedUserId,
            connectSessionId: decodedState.connectSessionId,
            code,
            state: stateRaw,
            callbackUrl: decodedState?.callbackUrl || window.location.origin + window.location.pathname,
          }),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || "Failed to complete WhatsApp connect.");
        }

        writeCompletionCache(completeCacheKey, {
          status: "completed",
          completedAt: Date.now(),
          payload: {
            selectableNumbers: Array.isArray(data?.selectableNumbers) ? data.selectableNumbers : [],
          },
        });

        if (!cancelled) {
          applyCompletedState({
            selectableNumbers: Array.isArray(data?.selectableNumbers) ? data.selectableNumbers : [],
          });
        }
      } catch (err) {
        writeCompletionCache(completeCacheKey, {
          status: "failed",
          failedAt: Date.now(),
          error: err?.message || "Failed to complete callback processing.",
        });

        if (!cancelled) {
          setError(err?.message || "Failed to complete callback processing.");
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      if (pollTimer) window.clearInterval(pollTimer);
      if (pollTimeout) window.clearTimeout(pollTimeout);
    };
  }, [code, completeCacheKey, decodedState, errorDescription, errorReason, stateRaw, userId]);

  const handleUseNumber = async (item) => {
    setSaving(true);
    setError("");

    try {
      const resolvedUserId = decodedState?.userId || userId;
      if (!resolvedUserId) throw new Error("Missing userId.");

      const res = await fetch(`${UNIFIED_API}/integrations/whatsapp/connect/select-number`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: resolvedUserId,
          connectSessionId: decodedState?.connectSessionId,
          phoneNumberId: item.phoneNumberId,
          displayName: item.displayName,
          businessAccountId: item.businessAccountId || null,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Failed to save selected WhatsApp number.");
      }

      navigate("/hostdashboard/integrations-marketplace", {
        replace: true,
        state: { successMessage: "WhatsApp connected successfully." },
      });
    } catch (err) {
      setError(err?.message || "Failed to save selected WhatsApp number.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="host-integrations-page">
      <header className="host-integrations-hero">
        <div>
          <p className="host-integrations-eyebrow">Host dashboard</p>
          <h1>Marketplace</h1>
          <p className="host-integrations-subtitle">
            Finish connecting your WhatsApp Business number and choose the number you want to use in Domits.
          </p>
        </div>
      </header>

      {loading ? <p className="host-integrations-loading">Finalizing your WhatsApp connection…</p> : null}
      {error ? <p className="host-integrations-error-banner">{error}</p> : null}
      {successMessage ? <p className="host-integrations-success-banner">{successMessage}</p> : null}

      {!loading && !error ? (
        <section className="host-integrations-setup">
          <div className="host-integrations-setup-header">
            <h2>Select your WhatsApp number</h2>
            <p>Choose the WhatsApp Business number you want to connect to your Domits inbox.</p>
          </div>

          {selectableNumbers.length === 0 ? (
            <div className="host-integrations-callout">
              <h4>No numbers are ready to select yet</h4>
              <p>
                Your connection was received, but no WhatsApp Business numbers are available to choose yet. Please try
                again shortly.
              </p>
            </div>
          ) : (
            <div className="host-integrations-number-grid">
              {selectableNumbers.map((item) => (
                <div key={item.phoneNumberId} className="host-integrations-number-card">
                  <div>
                    <strong>{item.displayName || "WhatsApp Business Number"}</strong>
                    <p>{item.phoneNumberId}</p>
                  </div>

                  <button
                    type="button"
                    className="host-integrations-primary-btn"
                    disabled={saving}
                    onClick={() => handleUseNumber(item)}
                  >
                    {saving ? "Saving..." : "Use this number"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}

export default function WhatsAppConnectCallback() {
  return (
    <UserProvider>
      <WhatsAppConnectCallbackInner />
    </UserProvider>
  );
}
