import React from "react";
import PropTypes from "prop-types";
import { INTEGRATION_STATUS } from "../utils/integrationCatalog";

export const WHATSAPP_CONNECTION_ID = "whatsapp-connection";

const STATUS_TONE = Object.freeze({
  [INTEGRATION_STATUS.AVAILABLE]: "is-available",
  [INTEGRATION_STATUS.IN_DEVELOPMENT]: "is-in-development",
  [INTEGRATION_STATUS.ON_REQUEST]: "is-on-request",
});

const actionFor = (integration, texts) =>
  integration.id === "whatsapp"
    ? { href: `#${WHATSAPP_CONNECTION_ID}`, label: texts.setUpWhatsApp }
    : { href: integration.link, label: texts.talkToSales };

export default function IntegrationCard({ integration, texts }) {
  const action = actionFor(integration, texts);

  return (
    <article className="host-integrations-market-card">
      <div className="host-integrations-market-card-top">
        <span className={`host-integrations-market-logo is-${integration.category}`} aria-hidden="true">
          {integration.name.charAt(0)}
        </span>
        <span className={`host-integrations-market-status ${STATUS_TONE[integration.status] || ""}`}>
          {texts.statuses[integration.status]}
        </span>
      </div>

      <h2 className="host-integrations-market-name">{integration.name}</h2>
      <p className="host-integrations-market-category">{texts.categories[integration.category]}</p>
      <p className="host-integrations-market-description">{texts.descriptions[integration.id]}</p>

      <a className="host-integrations-market-action" href={action.href}>
        {action.label}
      </a>
    </article>
  );
}

IntegrationCard.propTypes = {
  integration: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    link: PropTypes.string.isRequired,
  }).isRequired,
  texts: PropTypes.shape({
    talkToSales: PropTypes.string.isRequired,
    setUpWhatsApp: PropTypes.string.isRequired,
    statuses: PropTypes.object.isRequired,
    categories: PropTypes.object.isRequired,
    descriptions: PropTypes.object.isRequired,
  }).isRequired,
};
