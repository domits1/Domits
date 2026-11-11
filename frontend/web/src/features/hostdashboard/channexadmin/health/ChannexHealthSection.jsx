import React from "react";
import { getChannexHealth } from "../../hostintegrations/channexApi";
import ChannexHealthBanner from "./ChannexHealthBanner";
import ChannexHealthCards from "./ChannexHealthCards";
import ChannexHealthAlarms from "./ChannexHealthAlarms";
import ChannexHealthAccounts from "./ChannexHealthAccounts";
import ChannexHealthFailures from "./ChannexHealthFailures";

const HTTP_FORBIDDEN = 403;

const LOADING = { phase: "loading" };

export default function ChannexHealthSection() {
  const [state, setState] = React.useState(LOADING);
  const mounted = React.useRef(true);

  const load = React.useCallback(async () => {
    setState(LOADING);
    try {
      const health = await getChannexHealth();
      if (mounted.current) setState({ phase: "ready", health });
    } catch (error) {
      console.error("Channex health could not be loaded", error);
      const phase = error?.status === HTTP_FORBIDDEN ? "forbidden" : "error";
      if (mounted.current) setState({ phase });
    }
  }, []);

  React.useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  if (state.phase === "loading") {
    return (
      <section className="channex-health">
        <p className="host-integrations-muted">Loading health…</p>
      </section>
    );
  }

  if (state.phase === "forbidden") {
    return (
      <section className="channex-health">
        <p className="host-integrations-muted">You are not allowed to see the Channex health.</p>
      </section>
    );
  }

  if (state.phase === "error") {
    return (
      <section className="channex-health">
        <p>Couldn&apos;t load health.</p>
        <button type="button" onClick={load}>
          Retry
        </button>
      </section>
    );
  }

  return (
    <section className="channex-health">
      <ChannexHealthBanner status={state.health.status} reasons={state.health.reasons} />
      <ChannexHealthCards outbox={state.health.outbox} bookings={state.health.bookings} />
      <ChannexHealthAlarms alarms={state.health.alarms} />
      <ChannexHealthAccounts accounts={state.health.accounts} />
      <ChannexHealthFailures failures={state.health.outbox.recentFailures} />
    </section>
  );
}
