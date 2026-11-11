import React from "react";
import { UserProvider } from "./hostmessages/context/AuthContext";
import { useAuth } from "./hostmessages/hooks/useAuth";
import WhatsAppConnection from "./hostintegrations/components/WhatsAppConnection";
import "./hostintegrations/HostIntegrations.scss";

function HostIntegrationsInner() {
  const { userId } = useAuth();

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

      <WhatsAppConnection userId={userId} />
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
