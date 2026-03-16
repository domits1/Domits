import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { UserProvider } from "./hostmessages/context/AuthContext";
import { useAuth } from "./hostmessages/hooks/useAuth";
import "./hostintegrations/HostIntegrations.scss";

const UNIFIED_API = "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default";

const decodeState = (value) => {
  try {
    if (!value) return null;
    return JSON.parse(atob(value));
  } catch {
    return null;
  }
};

function WhatsAppConnectCallbackInner() {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [params] = useSearchParams();

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

  useEffect(() => {
    let cancelled = false;

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

      try {
        const resolvedUserId = decodedState?.userId || userId;
        if (!resolvedUserId) {
          throw new Error("Missing userId for callback processing.");
        }

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

        if (!cancelled) {
          setSelectableNumbers(Array.isArray(data?.selectableNumbers) ? data.selectableNumbers : []);
          setSuccessMessage(
            Array.isArray(data?.selectableNumbers) && data.selectableNumbers.length > 0
              ? "Meta authorization completed. Select the WhatsApp number you want to connect."
              : "Meta authorization completed, but no selectable numbers were returned yet."
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to complete callback processing.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [code, decodedState, errorDescription, errorReason, stateRaw, userId]);

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
          /**
           * PLACEHOLDER FOR NOW:
           * later backend should create a real Secrets Manager ref after real token exchange
           */
          credentialsRef: "meta-embedded-signup-token-placeholder",
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Failed to save selected WhatsApp number.");
      }

      navigate("/hostdashboard/integrations", {
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
          <h1>WhatsApp callback</h1>
          <p className="host-integrations-subtitle">
            Finish the WhatsApp Business connection and choose the number that Domits should use.
          </p>
        </div>
      </header>

      {loading ? <p className="host-integrations-loading">Processing Meta callback…</p> : null}
      {error ? <p className="host-integrations-error-banner">{error}</p> : null}
      {successMessage ? <p className="host-integrations-success-banner">{successMessage}</p> : null}

      {!loading && !error ? (
        <section className="host-integrations-setup">
          <div className="host-integrations-setup-header">
            <h2>Select your WhatsApp number</h2>
            <p>Choose which WhatsApp Business number Domits should connect for this host account.</p>
          </div>

          {selectableNumbers.length === 0 ? (
            <div className="host-integrations-callout">
              <h4>No selectable numbers returned</h4>
              <p>
                The callback completed, but no numbers were returned yet. The next step is wiring the real Meta code
                exchange and asset lookup fully on the backend.
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