import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Pause, Play, Plus, RefreshCw, Save } from "lucide-react";
import { UserProvider } from "../context/AuthContext";
import { useAuth } from "../hooks/useAuth";
import { fetchAccommodationsByOwnerId } from "../../../../services/fetchAccommodationByOwnerIdService";
import {
  activateAutomation,
  createAutomation,
  listAutomationDeliveries,
  listAutomations,
  pauseAutomation,
  previewAutomation,
  updateAutomation,
} from "../services/automationService";

const VARIABLES = ["guestName", "propertyName", "checkInDate", "checkOutDate"];
const asArray = (value) => (Array.isArray(value) ? value : []);
const EMPTY_FORM = {
  id: null,
  name: "",
  propertyId: "",
  triggerType: "BOOKING_PAID",
  offsetAmount: 0,
  offsetUnit: "MINUTES",
  template: "Hi {{guestName}}, your booking at {{propertyName}} from {{checkInDate}} to {{checkOutDate}} is confirmed.",
  channel: "DOMITS_DIRECT",
  status: "DRAFT",
};

const normalizeProperties = (items) =>
  asArray(items).map((item) => ({
    id: String(item?.id || item?.propertyId || ""),
    title: item?.title || item?.property?.title || "Untitled property",
  })).filter((item) => item.id);

const formatTimestamp = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const date = new Date(Number(value));
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("en-GB");
};

export const AutomationsContent = () => {
  const { userId, accessToken } = useAuth();
  const [automations, setAutomations] = useState([]);
  const [properties, setProperties] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selected = useMemo(
    () => automations.find((automation) => automation.id === form.id) || null,
    [automations, form.id]
  );

  const loadAutomations = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError("");
    try {
      setAutomations(asArray(await listAutomations(accessToken)));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadAutomations();
  }, [loadAutomations]);

  useEffect(() => {
    if (!userId) return;
    fetchAccommodationsByOwnerId(userId)
      .then((items) => setProperties(normalizeProperties(items)))
      .catch((requestError) => {
        setProperties([]);
        setError(requestError.message || "Unable to load properties.");
      });
  }, [userId]);

  useEffect(() => {
    if (!accessToken || !form.id) {
      setDeliveries([]);
      return;
    }
    listAutomationDeliveries(accessToken, form.id)
      .then((items) => setDeliveries(asArray(items)))
      .catch((requestError) => setError(requestError.message));
  }, [accessToken, form.id]);

  const selectAutomation = (automation) => {
    setForm({ ...EMPTY_FORM, ...automation, propertyId: automation.propertyId || "" });
    setPreview(null);
    setError("");
  };

  const startNew = () => {
    setForm({ ...EMPTY_FORM });
    setPreview(null);
    setDeliveries([]);
    setError("");
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setPreview(null);
  };

  const payload = () => ({
    name: form.name,
    propertyId: form.propertyId || null,
    triggerType: "BOOKING_PAID",
    offsetAmount: Number(form.offsetAmount || 0),
    offsetUnit: Number(form.offsetAmount || 0) === 0 ? "MINUTES" : form.offsetUnit,
    template: form.template,
    channel: "DOMITS_DIRECT",
  });

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const saved = form.id
        ? await updateAutomation(accessToken, form.id, payload())
        : await createAutomation(accessToken, payload());
      setAutomations((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      selectAutomation(saved);
      return saved;
    } catch (requestError) {
      const unknown = requestError.details?.unknownVariables;
      setError(unknown?.length ? `Unsupported variables: ${unknown.join(", ")}` : requestError.message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (nextStatus) => {
    let target = selected;
    if (!target) target = await save();
    if (!target) return;
    setError("");
    try {
      const updated = nextStatus === "ACTIVE"
        ? await activateAutomation(accessToken, target.id)
        : await pauseAutomation(accessToken, target.id);
      setAutomations((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      selectAutomation(updated);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const renderPreview = async () => {
    setError("");
    try {
      setPreview(await previewAutomation(accessToken, payload(), form.id));
    } catch (requestError) {
      const unknown = requestError.details?.unknownVariables;
      setError(unknown?.length ? `Unsupported variables: ${unknown.join(", ")}` : requestError.message);
    }
  };

  const insertVariable = (variable) => updateField("template", `${form.template}{{${variable}}}`);

  return (
    <main className="automations-page">
      <header className="automations-header">
        <div>
          <h1>Automated messages</h1>
          <p>Booking Paid workflows delivered through Domits Direct.</p>
        </div>
        <button type="button" className="icon-text-button" onClick={startNew}>
          <Plus size={17} /> New automation
        </button>
      </header>

      {error && <div className="automation-error" role="alert">{error}</div>}

      <div className="automations-layout">
        <aside className="automation-list" aria-label="Automation list">
          <div className="automation-list-heading">
            <h2>Automations</h2>
            <button type="button" className="icon-button" title="Refresh" onClick={loadAutomations}>
              <RefreshCw size={17} />
            </button>
          </div>
          {loading && <p>Loading...</p>}
          {!loading && automations.length === 0 && <p>No automations yet.</p>}
          {automations.map((automation) => (
            <button
              type="button"
              key={automation.id}
              className={`automation-list-item ${form.id === automation.id ? "selected" : ""}`}
              onClick={() => selectAutomation(automation)}
            >
              <span>{automation.name}</span>
              <small className={`automation-status ${automation.status.toLowerCase()}`}>{automation.status}</small>
            </button>
          ))}
        </aside>

        <div className="automation-editor">
          <div className="automation-editor-toolbar">
            <input
              aria-label="Automation name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Automation name"
            />
            <div className="automation-actions">
              <button type="button" className="icon-text-button secondary" onClick={save} disabled={saving}>
                <Save size={17} /> {saving ? "Saving..." : "Save"}
              </button>
              {form.status === "ACTIVE" ? (
                <button type="button" className="icon-text-button secondary" onClick={() => changeStatus("PAUSED")}>
                  <Pause size={17} /> Pause
                </button>
              ) : (
                <button type="button" className="icon-text-button" onClick={() => changeStatus("ACTIVE")}>
                  <Play size={17} /> Activate
                </button>
              )}
            </div>
          </div>

          <section className="automation-section">
            <h2>Events &amp; Triggers</h2>
            <div className="automation-fields two-columns">
              <label>
                <span>Trigger</span>
                <select aria-label="Trigger" value="BOOKING_PAID" disabled>
                  <option value="BOOKING_PAID">Booking Paid</option>
                </select>
              </label>
              <label>
                <span>Property</span>
                <select value={form.propertyId} onChange={(event) => updateField("propertyId", event.target.value)}>
                  <option value="">All owned properties</option>
                  {properties.map((property) => <option key={property.id} value={property.id}>{property.title}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section className="automation-section">
            <h2>Customization</h2>
            <label>
              <span>Message template</span>
              <textarea
                aria-label="Message template"
                rows={7}
                value={form.template}
                onChange={(event) => updateField("template", event.target.value)}
              />
            </label>
            <div className="variable-buttons" aria-label="Supported variables">
              {VARIABLES.map((variable) => (
                <button type="button" key={variable} onClick={() => insertVariable(variable)}>{`{{${variable}}}`}</button>
              ))}
            </div>
          </section>

          <section className="automation-section">
            <h2>Scheduling</h2>
            <div className="automation-fields three-columns">
              <label>
                <span>Amount</span>
                <input
                  aria-label="Offset amount"
                  type="number"
                  min="0"
                  max="365"
                  value={form.offsetAmount}
                  onChange={(event) => updateField("offsetAmount", event.target.value)}
                />
              </label>
              <label>
                <span>Unit</span>
                <select
                  aria-label="Offset unit"
                  value={Number(form.offsetAmount || 0) === 0 ? "MINUTES" : form.offsetUnit}
                  disabled={Number(form.offsetAmount || 0) === 0}
                  onChange={(event) => updateField("offsetUnit", event.target.value)}
                >
                  <option value="MINUTES">Minutes after trigger</option>
                  <option value="HOURS">Hours after trigger</option>
                  <option value="DAYS">Days after trigger</option>
                </select>
              </label>
              <label>
                <span>Channel</span>
                <select aria-label="Channel" value="DOMITS_DIRECT" disabled>
                  <option value="DOMITS_DIRECT">Domits Direct</option>
                </select>
              </label>
            </div>
          </section>

          <section className="automation-section">
            <div className="automation-section-heading">
              <h2>Preview</h2>
              <button type="button" className="icon-text-button secondary" onClick={renderPreview}>
                <Check size={17} /> Render preview
              </button>
            </div>
            <div className="automation-preview" data-testid="automation-preview">
              {preview?.renderedContent || "Render a preview to verify the outgoing message."}
            </div>
            {preview?.missingVariables?.length > 0 && (
              <p className="missing-variables">Missing: {preview.missingVariables.join(", ")}</p>
            )}
          </section>

          {form.id && (
            <section className="automation-section">
              <h2>Delivery history</h2>
              <div className="delivery-table-wrap">
                <table>
                  <thead><tr><th>Status</th><th>Booking</th><th>Scheduled</th><th>Sent</th><th>Failure reason</th></tr></thead>
                  <tbody>
                    {deliveries.length === 0 && <tr><td colSpan="5">No deliveries yet.</td></tr>}
                    {deliveries.map((delivery) => (
                      <tr key={delivery.id}>
                        <td>{delivery.status}</td>
                        <td>{delivery.bookingId}</td>
                        <td>{formatTimestamp(delivery.scheduledFor)}</td>
                        <td>{formatTimestamp(delivery.sentAt)}</td>
                        <td>{delivery.failureReason || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
};

const AutomationsPage = () => (
  <UserProvider>
    <AutomationsContent />
  </UserProvider>
);

export default AutomationsPage;
