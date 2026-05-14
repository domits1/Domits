import React from "react";
import { UserProvider } from "../hostmessages/context/AuthContext";
import { useAuth } from "../hostmessages/hooks/useAuth";
import ChannexDiagnosticsPanel from "../hostintegrations/ChannexDiagnosticsPanel";
import { isChannexCertificationUser } from "./channexCertificationAccess";
import "../hostintegrations/HostIntegrations.scss";

function ChannexCertificationAdminPageInner() {
  const { userId } = useAuth();
  const isAllowed = isChannexCertificationUser(userId);

  if (!userId) {
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

  if (!isAllowed) {
    return (
      <main className="channex-admin-page">
        <section className="channex-admin-access-card">
          <p className="host-integrations-eyebrow">Internal admin</p>
          <h1>Not authorized</h1>
          <p className="host-integrations-muted">
            This Channex certification workspace is limited to internal allowlisted users.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="channex-admin-page">
      <header className="channex-admin-hero">
        <div>
          <p className="host-integrations-eyebrow">Internal admin</p>
          <h1>Channex Certification</h1>
          <p>
            Certification diagnostics for Channex connection health, mappings, ARI previews, sync evidence, booking
            revisions, and controlled manual actions.
          </p>
        </div>
      </header>

      <ChannexDiagnosticsPanel userId={userId} />
    </main>
  );
}

export default function ChannexCertificationAdminPage() {
  return (
    <UserProvider>
      <ChannexCertificationAdminPageInner />
    </UserProvider>
  );
}
