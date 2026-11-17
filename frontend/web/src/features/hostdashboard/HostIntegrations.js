import React, { useContext } from "react";
import { UserProvider } from "./hostmessages/context/AuthContext";
import { useAuth } from "./hostmessages/hooks/useAuth";
import { LanguageContext } from "../../context/LanguageContext";
import WhatsAppConnection from "./hostintegrations/components/WhatsAppConnection";
import IntegrationCard, { WHATSAPP_CONNECTION_ID } from "./hostintegrations/components/IntegrationCard";
import { INTEGRATION_CATALOG } from "./hostintegrations/utils/integrationCatalog";
import { resolveIntegrationContent } from "./hostintegrations/utils/integrationContent";
import "./hostintegrations/HostIntegrations.scss";

function HostIntegrationsInner() {
  const { userId } = useAuth();
  const { language } = useContext(LanguageContext);
  const texts = resolveIntegrationContent(language);

  return (
    <main className="host-integrations-page">
      <header className="host-integrations-hero">
        <div>
          <p className="host-integrations-eyebrow">Host dashboard</p>
          <h1>{texts.title}</h1>
          <p className="host-integrations-subtitle">{texts.subtitle}</p>
        </div>
      </header>

      <ul className="host-integrations-market-grid" aria-label={texts.listLabel}>
        {INTEGRATION_CATALOG.map((integration) => (
          <li key={integration.id}>
            <IntegrationCard integration={integration} texts={texts} />
          </li>
        ))}
      </ul>

      <section id={WHATSAPP_CONNECTION_ID} className="host-integrations-connection">
        <WhatsAppConnection userId={userId} />
      </section>
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
