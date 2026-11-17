import React from "react";
import PropTypes from "prop-types";
import ChannexHealthPanel from "./ChannexHealthPanel";

const propertyCount = (count) => `${count} ${count === 1 ? "property" : "properties"}`;

export default function ChannexHealthAccounts({ accounts }) {
  return (
    <ChannexHealthPanel title="Accounts" emptyText="No Channex accounts." isEmpty={accounts.length === 0}>
      {accounts.map((account) => (
        <li key={account.id}>
          <span>{account.displayName}</span>
          <span className="channex-health-state">{account.status}</span>
          <span>{propertyCount(account.mappedProperties)}</span>
          {account.lastErrorCode && <span className="host-integrations-muted">{account.lastErrorCode}</span>}
        </li>
      ))}
    </ChannexHealthPanel>
  );
}

ChannexHealthAccounts.propTypes = {
  accounts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      displayName: PropTypes.string,
      status: PropTypes.string.isRequired,
      lastErrorCode: PropTypes.string,
      mappedProperties: PropTypes.number.isRequired,
    })
  ).isRequired,
};
