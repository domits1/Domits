import { CHANNEX_STATUS } from "../channelManagementConstants.js";

// Channex rejected the account's API key (401). Every next call with it would fail too, so the
// account stops syncing until a new key is connected: the outbox worker and booking polling only
// use CONNECTED accounts, and the webhook answers without calling Channex (#3572).
// The line is the signal to ask the host for a new key; it never contains the key. It is
// best-effort: the status is what stops the calls, and a logging error must not undo that.
export const markChannexAccountReconnectRequired = async (accounts, integrationAccountId, { source, log = console }) => {
  await accounts.update(integrationAccountId, {
    status: CHANNEX_STATUS.RECONNECT_REQUIRED,
    lastErrorCode: "CHANNEX_API_KEY_REJECTED",
    lastErrorMessage: "Channex rejected the account's API key. Connect a new key to resume syncing.",
  });
  try {
    log.warn(JSON.stringify({ event: "CHANNEX_ACCOUNT_RECONNECT_REQUIRED", integrationAccountId, source }));
  } catch {
    // The account is already marked; its status shows on the admin page.
  }
};
