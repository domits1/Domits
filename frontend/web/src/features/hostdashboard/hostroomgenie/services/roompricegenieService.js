import { Auth } from "aws-amplify";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  "https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev";

async function getAuthHeader() {
  const session = await Auth.currentSession();
  return { Authorization: session.getAccessToken().getJwtToken() };
}

async function request(method, path, body = null) {
  const headers = { ...(await getAuthHeader()), "Content-Type": "application/json" };
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

/** Connect a property to RoomPriceGenie */
export const connectRoomPriceGenie = (propertyId, rpgPropertyCode, clientId, clientSecret, options = {}) =>
  request("POST", "/roompricegenie/connect", {
    propertyId, rpgPropertyCode, clientId, clientSecret, ...options,
  });

/** Disconnect a property */
export const disconnectRoomPriceGenie = (propertyId) =>
  request("DELETE", `/roompricegenie/disconnect?propertyId=${propertyId}`);

/** Get connection status for all properties of this host */
export const getRoomPriceGenieStatus = () =>
  request("GET", "/roompricegenie/status");

/** Send inventory (room types) to RPG — call once after connect */
export const sendInventory = (propertyId, roomTypes) =>
  request("POST", "/roompricegenie/inventory", { propertyId, roomTypes });

/** Push current availability from Domits to RPG */
export const pushAvailability = (propertyId) =>
  request("POST", "/roompricegenie/availability/push", { propertyId });

/** Push current base rates from Domits to RPG */
export const pushRates = (propertyId) =>
  request("POST", "/roompricegenie/rates/push", { propertyId });

/** Update sync settings (min/max price, sync mode) */
export const updateSettings = (propertyId, settings) =>
  request("PATCH", "/roompricegenie/settings", { propertyId, ...settings });
