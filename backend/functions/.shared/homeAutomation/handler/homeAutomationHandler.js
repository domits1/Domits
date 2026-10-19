import { resolveAuthenticatedUserId } from "../../channelManagement/utils/channelAuthenticatedUser.js";
import IntegrationAccountRepository from "../../integrations/repositories/integrationAccountRepository.js";
import { RemoteLockApiClient } from "../providers/remotelock/remoteLockApiClient.js";
import RemoteLockCredentialStore from "../providers/remotelock/remoteLockCredentialStore.js";
import { RemoteLockTokenProvider } from "../providers/remotelock/remoteLockTokenProvider.js";
import CredentialLeaseRepository from "../repositories/credentialLeaseRepository.js";
import { createRemoteLockOAuthClientLoader } from "../remoteLockConfig.js";
import RemoteLockConnectionService from "../services/remoteLockConnectionService.js";
import RemoteLockDevicesService from "../services/remoteLockDevicesService.js";

const BASE_PATH = "/integrations/home-automation/remotelocks";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,x-domits-internal-token",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
};

const routes = {
  "POST /connect": ({ connection }, userId) => connection.startConnect(userId),
  "POST /connect/complete": ({ connection }, userId, body) => connection.completeConnect(userId, body),
  "GET /status": ({ connection }, userId) => connection.getStatus(userId),
  "POST /disconnect": ({ connection }, userId) => connection.disconnect(userId),
  "GET /devices": ({ devices }, userId) => devices.listDevices(userId),
};

const respond = ({ statusCode, response }) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(response),
});

const parseBody = (raw) => {
  try {
    const parsed = typeof raw === "string" && raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

// Built on first use, so loading the Lambda does not open a database or a secrets client for other routes.
let defaultServices = null;
const getDefaultServices = () => {
  if (defaultServices) return defaultServices;
  const accounts = new IntegrationAccountRepository();
  const credentialStore = new RemoteLockCredentialStore();
  const leaseRepository = new CredentialLeaseRepository();
  const loadOAuthClient = createRemoteLockOAuthClientLoader();
  defaultServices = {
    connection: new RemoteLockConnectionService({ accounts, credentialStore, leaseRepository, loadOAuthClient }),
    devices: new RemoteLockDevicesService({
      accounts,
      apiClient: new RemoteLockApiClient(),
      loadOAuthClient,
      createTokenProvider: (oauthClient) =>
        new RemoteLockTokenProvider({ oauthClient, credentialStore, leaseRepository, accountRepository: accounts }),
    }),
  };
  return defaultServices;
};

// Returns null for any other path, so the Lambda can go on to its other routes.
export const handleHomeAutomationEvent = async (event, { service, devicesService } = {}) => {
  const path = String(event?.path || "");
  const baseIndex = path.indexOf(BASE_PATH);
  if (baseIndex === -1) return null;

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: corsHeaders, body: "" };

  const route = routes[`${event.httpMethod} ${path.slice(baseIndex + BASE_PATH.length)}`];
  if (!route) return respond({ statusCode: 404, response: { error: "NOT_FOUND" } });

  // The id comes from the verified token only; a userId in the body or query string is ignored.
  const userId = resolveAuthenticatedUserId(event);
  if (!userId) return respond({ statusCode: 401, response: { error: "UNAUTHORIZED" } });

  try {
    const services =
      service || devicesService ? { connection: service, devices: devicesService } : getDefaultServices();
    return respond(await route(services, userId, parseBody(event.body)));
  } catch (error) {
    console.error(JSON.stringify({ event: "REMOTELOCK_ROUTE_FAILED", errorName: error?.name ?? null }));
    return respond({ statusCode: 500, response: { error: "INTERNAL_ERROR" } });
  }
};
