import { v4 as uuidv4 } from "uuid";

/**
 * RoomPriceGenie API Client
 *
 * Based on the official RPG OpenAPI documentation (postman.roompricegenie.com)
 *
 * Authentication:
 *   - Global partner key: X-API-Key header (stored in SSM Parameter Store)
 *   - Per-property JWT: obtained via /integrations/token/ using client_id + client_secret
 *   - Access token valid 24h, refresh token valid 7 days
 *
 * Base URL:
 *   - Dev:  https://refactoringdevapi.roompricegenie.com
 *   - Prod: provided by RPG during go-live
 */
export class RoomPriceGenieApiClient {
  constructor(partnerApiKey, baseUrl) {
    this.partnerApiKey = partnerApiKey;
    this.baseUrl = baseUrl || process.env.RPG_BASE_URL || "https://refactoringdevapi.roompricegenie.com";
  }

  // ─── Auth headers ──────────────────────────────────────────────────────────

  _partnerHeaders() {
    return {
      "X-API-Key": this.partnerApiKey,
      "Content-Type": "application/x-www-form-urlencoded",
    };
  }

  _bearerHeaders(accessToken) {
    return {
      "X-API-Key": this.partnerApiKey,
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
  }

  async _handleResponse(response) {
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    if (!response.ok) {
      const msg = data?.errors ? JSON.stringify(data.errors) : (data?.detail || text);
      throw new Error(`RPG API ${response.status}: ${msg}`);
    }
    return data;
  }

  // ─── Authentication ────────────────────────────────────────────────────────

  /**
   * Get a new JWT access token for a property using client_credentials grant.
   * POST /integrations/token/
   *
   * @returns {{ access_token, refresh_token, expires_in, refresh_token_expires_in }}
   */
  async getToken(clientId, clientSecret) {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetch(`${this.baseUrl}/integrations/token/`, {
      method: "POST",
      headers: this._partnerHeaders(),
      body: body.toString(),
    });

    return this._handleResponse(response);
  }

  /**
   * Refresh an expired access token using the refresh token.
   * POST /integrations/token/
   *
   * @returns {{ access_token, refresh_token, expires_in, refresh_token_expires_in }}
   */
  async refreshToken(clientId, refreshToken) {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: refreshToken,
    });

    const response = await fetch(`${this.baseUrl}/integrations/token/`, {
      method: "POST",
      headers: this._partnerHeaders(),
      body: body.toString(),
    });

    return this._handleResponse(response);
  }

  // ─── ARI Events (Domits → RPG) ─────────────────────────────────────────────

  /**
   * Send an event to RoomPriceGenie.
   * POST /integrations/api/v1/event/
   * All ARI updates (availability, rates, inventory) use this single endpoint.
   */
  async sendEvent(accessToken, eventPayload) {
    const response = await fetch(`${this.baseUrl}/integrations/api/v1/event/`, {
      method: "POST",
      headers: this._bearerHeaders(accessToken),
      body: JSON.stringify(eventPayload),
    });

    return this._handleResponse(response);
  }

  /**
   * Send inventory (room types + rate plans) to RPG.
   * Must be called once during initial setup.
   *
   * @param {string} accessToken
   * @param {string} propertyCode - RPG property_code
   * @param {Array} roomTypes - [{ room_type_code, room_type_name, min_occupancy, max_occupancy, default_occupancy }]
   */
  async sendInventory(accessToken, propertyCode, roomTypes) {
    return this.sendEvent(accessToken, {
      event: "inventory.update",
      tracking_id: uuidv4(),
      property_code: propertyCode,
      data: roomTypes,
    });
  }

  /**
   * Send availability updates to RPG.
   * Call on initial setup (full push, 18 months) and on every booking change.
   *
   * @param {string} accessToken
   * @param {string} propertyCode
   * @param {Array} data - [{
   *   room_type_code, room_type_name,
   *   calendar: [{ start_date, end_date, rooms_left, out_of_order? }]
   * }]
   */
  async sendAvailability(accessToken, propertyCode, data) {
    return this.sendEvent(accessToken, {
      event: "availability.update",
      tracking_id: uuidv4(),
      property_code: propertyCode,
      data,
    });
  }

  /**
   * Send current base rates to RPG.
   * Call on initial setup (full push, 18 months) and on every rate change.
   * Important: do NOT send rates back when RPG sends you rate recommendations.
   *
   * @param {string} accessToken
   * @param {string} propertyCode
   * @param {Array} data - [{
   *   room_type_code, room_type_name,
   *   calendar: [{ start_date, end_date, price }]
   * }]
   */
  async sendRates(accessToken, propertyCode, data) {
    return this.sendEvent(accessToken, {
      event: "rates.update",
      tracking_id: uuidv4(),
      property_code: propertyCode,
      data,
    });
  }
}
