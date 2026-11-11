import React from "react";
import { getChannexHealth } from "../../hostintegrations/channexApi";
import ChannexHealthBanner from "./ChannexHealthBanner";
import ChannexHealthCards from "./ChannexHealthCards";

export default function ChannexHealthSection() {
  const [health, setHealth] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    getChannexHealth().then((answer) => {
      if (mounted) setHealth(answer);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!health) {
    return (
      <section className="channex-health">
        <p className="host-integrations-muted">Loading health…</p>
      </section>
    );
  }

  return (
    <section className="channex-health">
      <ChannexHealthBanner status={health.status} reasons={health.reasons} />
      <ChannexHealthCards outbox={health.outbox} bookings={health.bookings} />
    </section>
  );
}
