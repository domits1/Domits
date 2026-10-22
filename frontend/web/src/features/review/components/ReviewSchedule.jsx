import React, { useEffect, useState } from "react";
import { reviewSchedule } from "../services/reviewAPI";
import styles from "../../hostdashboard/HostProperty.module.css";
export default function ReviewSchedule({ propertyId }) {
  const [settings, setSettings] = useState(null), [error, setError] = useState("");
  const [saving, setSaving] = useState(false), [saved, setSaved] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    reviewSchedule(propertyId, undefined, controller.signal).then(setSettings).catch(error => {
      if (!controller.signal.aborted) setError(error.message);
    });
    return () => controller.abort();
  }, [propertyId, attempt]);
  const change = patch => { setSettings(previous => ({ ...previous, ...patch })); setSaved(false); };
  const save = async event => {
    event.preventDefault(); setSaving(true); setError(""); setSaved(false);
    try { setSettings(await reviewSchedule(propertyId, settings)); setSaved(true); }
    catch (error) { setError(error.message); }
    finally { setSaving(false); }
  };
  return <section aria-label="Review request preferences">
    <h2>Review requests</h2><p>Choose when invitations are sent after checkout.</p>
    {error && <p role="alert">{error}</p>}
    {!settings ? error ? <button onClick={() => { setError(""); setAttempt(value => value + 1); }}>Retry</button>
      : <p role="status">Loading preferences...</p> : <form onSubmit={save}>
      <fieldset disabled={saving}><legend>Invitation timing</legend>
        <label><input type="checkbox" checked={settings.enabled} onChange={event => change({ enabled: event.target.checked })} />Automatically request reviews</label>
        <label>Send after checkout<select value={settings.delayHours} disabled={!settings.enabled}
          onChange={event => change({ delayHours: Number(event.target.value) })}>
          {[0, 24, 48, 72].map(hours => <option key={hours} value={hours}>{hours === 0 ? "At checkout" : `${hours} hours`}</option>)}
        </select></label>
        <button className={styles.actionButton} type="submit">{saving ? "Saving..." : "Save review preferences"}</button>
      </fieldset>{saved && <p role="status">Preferences saved.</p>}
    </form>}
  </section>;
}
