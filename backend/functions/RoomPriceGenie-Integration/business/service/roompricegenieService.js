import AuthManager from "../../auth/authManager.js";
import { RoomPriceGenieRepository } from "../../data/repository.js";
import RoomPriceGenieCredentialStore from "./roompricegenieCredentialStore.js";
import { RoomPriceGenieApiClient } from "./roompricegenieApiClient.js";
import { SystemManagerRepository } from "../../data/systemManagerRepository.js";
import { BadRequestException } from "../../util/exception/badRequestException.js";
import { NotFoundException } from "../../util/exception/NotFoundException.js";
import { UnauthorizedException } from "../../util/exception/unauthorizedException.js";

// Access token validity minus 5-minute buffer
const TOKEN_VALIDITY_MS = (24 * 60 - 5) * 60 * 1000;

export class RoomPriceGenieService {
  constructor() {
    this.authManager = new AuthManager();
    this.repository = new RoomPriceGenieRepository();
    this.credentialStore = new RoomPriceGenieCredentialStore();
    this.systemManager = new SystemManagerRepository();
  }

  // ─── Auth helpers ──────────────────────────────────────────────────────────

  async _getHostUser(event) {
    const auth = event?.headers?.Authorization || event?.headers?.authorization;
    if (!auth) throw new UnauthorizedException("Missing Authorization header");
    const attrs = await this.authManager.authenticateUser(auth);
    const hostId = attrs["sub"];
    if (!hostId) throw new UnauthorizedException("Could not resolve host ID from token");
    return { hostId, attrs };
  }

  /**
   * Get the global RPG partner API key from SSM Parameter Store.
   * Stored at: /roompricegenie/partner_api_key
   */
  async _getPartnerApiKey() {
    return this.systemManager.getSystemManagerParameter("/roompricegenie/partner_api_key");
  }

  /**
   * Get a valid access token for a property.
   * Uses cached token if still valid, otherwise refreshes or re-authenticates.
   */
  async _getValidAccessToken(integration) {
    const partnerApiKey = await this._getPartnerApiKey();
    const client = new RoomPriceGenieApiClient(partnerApiKey);
    const now = Date.now();

    // Try existing token if not expired
    if (integration.token_secret_ref && integration.token_expires_at > now) {
      const tokens = await this.credentialStore.getTokens(integration.token_secret_ref);
      if (tokens?.accessToken) return { client, accessToken: tokens.accessToken };

      // Try refresh
      if (tokens?.refreshToken) {
        try {
          const refreshed = await client.refreshToken(integration.client_id, tokens.refreshToken);
          const tokenRef = await this.credentialStore.storeTokens(
            integration.domits_property_id,
            refreshed.access_token,
            refreshed.refresh_token
          );
          await this.repository.updateTokenInfo(
            integration.domits_property_id,
            tokenRef,
            now + TOKEN_VALIDITY_MS
          );
          return { client, accessToken: refreshed.access_token };
        } catch {
          // Refresh failed, fall through to re-authenticate
        }
      }
    }

    // Re-authenticate with client_credentials
    const clientSecret = await this.credentialStore.getClientSecret(integration.client_secret_ref);
    if (!clientSecret) throw new NotFoundException("RPG client secret not found. Please reconnect.");

    const tokenData = await client.getToken(integration.client_id, clientSecret);
    const tokenRef = await this.credentialStore.storeTokens(
      integration.domits_property_id,
      tokenData.access_token,
      tokenData.refresh_token
    );
    await this.repository.updateTokenInfo(
      integration.domits_property_id,
      tokenRef,
      now + TOKEN_VALIDITY_MS
    );

    return { client, accessToken: tokenData.access_token };
  }

  async _getIntegrationOrThrow(propertyId) {
    const integration = await this.repository.getByPropertyId(propertyId);
    if (!integration || !integration.is_active) {
      throw new NotFoundException(
        "No active RoomPriceGenie integration found for this property. Please connect first."
      );
    }
    return integration;
  }

  // ─── Endpoints ────────────────────────────────────────────────────────────

  /**
   * Connect a Domits property to RoomPriceGenie.
   * Requires: propertyId, rpgPropertyCode, clientId, clientSecret from RPG onboarding.
   */
  async connect(event) {
    const { hostId } = await this._getHostUser(event);
    const body = JSON.parse(event.body || "{}");
    const { propertyId, rpgPropertyCode, clientId, clientSecret, syncMode, minPrice, maxPrice } = body;

    if (!propertyId) throw new BadRequestException("propertyId is required");
    if (!rpgPropertyCode) throw new BadRequestException("rpgPropertyCode is required (from RPG onboarding)");
    if (!clientId) throw new BadRequestException("clientId is required (from RPG onboarding)");
    if (!clientSecret) throw new BadRequestException("clientSecret is required (from RPG onboarding)");

    // Validate credentials by getting a token
    const partnerApiKey = await this._getPartnerApiKey();
    const apiClient = new RoomPriceGenieApiClient(partnerApiKey);

    let tokenData;
    try {
      tokenData = await apiClient.getToken(clientId, clientSecret);
    } catch (err) {
      throw new BadRequestException(
        `Invalid RPG credentials: ${err.message}. Please check your client_id and client_secret.`
      );
    }

    const now = Date.now();

    // Store secrets
    const clientSecretRef = await this.credentialStore.storeClientSecret(propertyId, clientSecret);
    const tokenRef = await this.credentialStore.storeTokens(
      propertyId,
      tokenData.access_token,
      tokenData.refresh_token
    );

    // Save integration record
    const integration = await this.repository.upsertIntegration(propertyId, {
      host_id: hostId,
      rpg_property_code: rpgPropertyCode,
      client_id: clientId,
      client_secret_ref: clientSecretRef,
      token_secret_ref: tokenRef,
      token_expires_at: now + TOKEN_VALIDITY_MS,
      is_active: true,
      sync_mode: syncMode || "manual",
      min_price: minPrice || null,
      max_price: maxPrice || null,
      last_sync_status: "connected",
    });

    return {
      message: "RoomPriceGenie successfully connected",
      property_id: propertyId,
      rpg_property_code: rpgPropertyCode,
      sync_mode: integration.sync_mode,
    };
  }

  /**
   * Disconnect a property from RoomPriceGenie.
   */
  async disconnect(event) {
    const { hostId } = await this._getHostUser(event);
    const propertyId = event?.queryStringParameters?.propertyId;
    if (!propertyId) throw new BadRequestException("propertyId query parameter is required");

    const integration = await this.repository.getByPropertyId(propertyId);
    if (!integration) throw new NotFoundException("No RPG integration found for this property");
    if (integration.host_id !== hostId) throw new UnauthorizedException("Not authorized");

    await this.credentialStore.deleteAll(propertyId);
    await this.repository.deactivate(propertyId);

    return { message: "RoomPriceGenie disconnected", property_id: propertyId };
  }

  /**
   * Get RPG integration status for all properties of a host.
   */
  async getStatus(event) {
    const { hostId } = await this._getHostUser(event);
    const integrations = await this.repository.getAllByHost(hostId);

    return {
      integrations: integrations.map((i) => ({
        property_id: i.domits_property_id,
        rpg_property_code: i.rpg_property_code,
        is_active: i.is_active,
        sync_mode: i.sync_mode,
        min_price: i.min_price,
        max_price: i.max_price,
        last_sync_at: i.last_sync_at,
        last_sync_status: i.last_sync_status,
        last_sync_error: i.last_sync_error,
      })),
    };
  }

  /**
   * Send inventory (room types) to RPG.
   * Must be called once after connect, before sending availability/rates.
   */
  async sendInventory(event) {
    const { hostId } = await this._getHostUser(event);
    const body = JSON.parse(event.body || "{}");
    const { propertyId, roomTypes } = body;

    if (!propertyId) throw new BadRequestException("propertyId is required");
    if (!roomTypes?.length) throw new BadRequestException("roomTypes array is required");

    const integration = await this._getIntegrationOrThrow(propertyId);
    if (integration.host_id !== hostId) throw new UnauthorizedException("Not authorized");

    const { client, accessToken } = await this._getValidAccessToken(integration);
    await client.sendInventory(accessToken, integration.rpg_property_code, roomTypes);

    return { message: "Inventory sent to RoomPriceGenie", property_id: propertyId };
  }

  /**
   * Push current availability data from Domits to RPG.
   */
  async pushAvailability(event) {
    const { hostId } = await this._getHostUser(event);
    const body = JSON.parse(event.body || "{}");
    const propertyId = body.propertyId || event?.queryStringParameters?.propertyId;

    if (!propertyId) throw new BadRequestException("propertyId is required");

    const integration = await this._getIntegrationOrThrow(propertyId);
    if (integration.host_id !== hostId) throw new UnauthorizedException("Not authorized");

    // Fetch availability from Domits DB
    const availabilityRecords = await this.repository.getAvailabilityForProperty(propertyId, 548);
    const property = await this.repository.getProperty(propertyId);

    // Format into RPG payload (collapse into date ranges for efficiency)
    const data = this._formatAvailabilityPayload(property, availabilityRecords);

    const { client, accessToken } = await this._getValidAccessToken(integration);
    await client.sendAvailability(accessToken, integration.rpg_property_code, data);

    await this.repository.updateSyncStatus(propertyId, "availability_pushed");

    return {
      message: "Availability pushed to RoomPriceGenie",
      property_id: propertyId,
      dates_sent: availabilityRecords.length,
    };
  }

  /**
   * Push current base rates from Domits to RPG.
   */
  async pushRates(event) {
    const { hostId } = await this._getHostUser(event);
    const body = JSON.parse(event.body || "{}");
    const propertyId = body.propertyId || event?.queryStringParameters?.propertyId;

    if (!propertyId) throw new BadRequestException("propertyId is required");

    const integration = await this._getIntegrationOrThrow(propertyId);
    if (integration.host_id !== hostId) throw new UnauthorizedException("Not authorized");

    const pricing = await this.repository.getPricingForProperty(propertyId);
    const property = await this.repository.getProperty(propertyId);

    if (!pricing) throw new NotFoundException("No pricing found for this property");

    const data = this._formatRatesPayload(property, pricing);

    const { client, accessToken } = await this._getValidAccessToken(integration);
    await client.sendRates(accessToken, integration.rpg_property_code, data);

    await this.repository.updateSyncStatus(propertyId, "rates_pushed");

    return { message: "Rates pushed to RoomPriceGenie", property_id: propertyId };
  }

  /**
   * Webhook handler: receive price recommendations FROM RoomPriceGenie.
   * RPG will POST to: POST /roompricegenie/webhook/prices
   *
   * RPG sends: { event: "rates.update", property_code, data: [{ room_type_code, calendar: [{ start_date, end_date, price }] }] }
   */
  async receivePriceRecommendations(event) {
    // Validate the incoming RPG request with the partner API key
    const incomingApiKey = event?.headers?.["X-API-Key"] || event?.headers?.["x-api-key"];
    const partnerApiKey = await this._getPartnerApiKey();

    if (!incomingApiKey || incomingApiKey !== partnerApiKey) {
      throw new UnauthorizedException("Invalid or missing X-API-Key");
    }

    const body = JSON.parse(event.body || "{}");
    const { event: eventType, property_code: rpgPropertyCode, tracking_id, data } = body;

    if (eventType !== "rates.update") {
      return { message: `Event type ${eventType} received but not processed` };
    }

    if (!rpgPropertyCode || !data?.length) {
      throw new BadRequestException("Invalid payload: property_code and data are required");
    }

    // Find the Domits property linked to this RPG property_code
    const integrations = await this._getIntegrationByRpgCode(rpgPropertyCode);
    if (!integrations) {
      throw new NotFoundException(`No active integration found for RPG property: ${rpgPropertyCode}`);
    }

    const domitsPropertyId = integrations.domits_property_id;
    let totalDatesUpdated = 0;

    // Process each room type's price calendar
    for (const roomTypeData of data) {
      const recommendations = roomTypeData.calendar || [];
      const updated = await this.repository.applyPriceRecommendations(domitsPropertyId, recommendations);
      totalDatesUpdated += updated;
    }

    await this.repository.updateSyncStatus(domitsPropertyId, "success");

    return {
      event: eventType,
      tracking_id,
      property_code: rpgPropertyCode,
      dates_updated: totalDatesUpdated,
    };
  }

  /**
   * Update sync settings (min/max price, sync mode) for a property.
   */
  async updateSettings(event) {
    const { hostId } = await this._getHostUser(event);
    const body = JSON.parse(event.body || "{}");
    const { propertyId, syncMode, minPrice, maxPrice } = body;

    if (!propertyId) throw new BadRequestException("propertyId is required");

    const integration = await this.repository.getByPropertyId(propertyId);
    if (!integration) throw new NotFoundException("No RPG integration found for this property");
    if (integration.host_id !== hostId) throw new UnauthorizedException("Not authorized");

    await this.repository.upsertIntegration(propertyId, {
      ...(syncMode !== undefined && { sync_mode: syncMode }),
      ...(minPrice !== undefined && { min_price: minPrice }),
      ...(maxPrice !== undefined && { max_price: maxPrice }),
    });

    return { message: "Settings updated", property_id: propertyId };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  async _getIntegrationByRpgCode(rpgPropertyCode) {
    const db = await (await import("database")).default.getInstance();
    const { RoomPriceGenie_Integration } = await import("database/models/RoomPriceGenie_Integration.js");
    return db.getRepository(RoomPriceGenie_Integration).findOne({
      where: { rpg_property_code: rpgPropertyCode, is_active: true },
    });
  }

  /**
   * Format Domits availability records into RPG payload format.
   * RPG expects date ranges, not one entry per day.
   */
  _formatAvailabilityPayload(property, availabilityRecords) {
    if (!availabilityRecords?.length) return [];

    // Collapse consecutive dates with the same rooms_left into ranges
    const calendar = [];
    let rangeStart = null;
    let rangeRoomsLeft = null;
    let rangeDate = null;

    for (const rec of availabilityRecords) {
      const roomsLeft = rec.rooms_available ?? 0;
      if (rangeStart === null) {
        rangeStart = rec.date;
        rangeDate = rec.date;
        rangeRoomsLeft = roomsLeft;
      } else if (roomsLeft === rangeRoomsLeft) {
        rangeDate = rec.date; // extend range
      } else {
        calendar.push({ start_date: rangeStart, end_date: rangeDate, rooms_left: rangeRoomsLeft });
        rangeStart = rec.date;
        rangeDate = rec.date;
        rangeRoomsLeft = roomsLeft;
      }
    }
    if (rangeStart) {
      calendar.push({ start_date: rangeStart, end_date: rangeDate, rooms_left: rangeRoomsLeft });
    }

    return [
      {
        room_type_code: property.id,
        room_type_name: property.unitname || "Room",
        calendar,
      },
    ];
  }

  /**
   * Format Domits base pricing into RPG rates payload format.
   * Sends the base rate for the next 18 months (548 days).
   */
  _formatRatesPayload(property, pricing) {
    const startDate = new Date().toISOString().split("T")[0];
    const endDate = new Date(Date.now() + 548 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    return [
      {
        room_type_code: property.id,
        room_type_name: property.unitname || "Room",
        calendar: [
          {
            start_date: startDate,
            end_date: endDate,
            price: Math.round(pricing.roomrate),
          },
        ],
      },
    ];
  }
}
