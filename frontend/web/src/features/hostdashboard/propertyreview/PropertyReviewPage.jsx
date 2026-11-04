import React, { useEffect, useState } from "react";
import { checkPropertyReviewAccess } from "./propertyReviewAccess";
import "../hostintegrations/HostIntegrations.scss";

const ACCESS_STATE = Object.freeze({
  CHECKING: "checking",
  ALLOWED: "allowed",
  DENIED: "denied",
});

function PropertyReviewPage() {
  const [accessState, setAccessState] = useState(ACCESS_STATE.CHECKING);

  useEffect(() => {
    let mounted = true;

    async function loadAccess() {
      let allowed = false;
      try {
        allowed = await checkPropertyReviewAccess();
      } catch {
        allowed = false;
      }
      if (mounted) setAccessState(allowed ? ACCESS_STATE.ALLOWED : ACCESS_STATE.DENIED);
    }

    void loadAccess();
    return () => {
      mounted = false;
    };
  }, []);

  if (accessState === ACCESS_STATE.CHECKING) {
    return (
      <main className="channex-admin-page">
        <section className="channex-admin-access-card">
          <p className="host-integrations-eyebrow">Internal admin</p>
          <h1>Checking access</h1>
          <p className="host-integrations-muted">Validating your signed-in Domits account.</p>
        </section>
      </main>
    );
  }

  if (accessState === ACCESS_STATE.DENIED) {
    return (
      <main className="channex-admin-page">
        <section className="channex-admin-access-card">
          <p className="host-integrations-eyebrow">Internal admin</p>
          <h1>Not authorized</h1>
          <p className="host-integrations-muted">Property review is limited to internal Domits admins.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="channex-admin-page">
      <section className="channex-admin-access-card">
        <p className="host-integrations-eyebrow">Internal admin</p>
        <h1>Property review</h1>
        <p className="host-integrations-muted">Queue coming soon</p>
      </section>
    </main>
  );
}

export default PropertyReviewPage;
