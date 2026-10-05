import { isChannexAriOutboxEvent } from "../../.shared/channelManagement/handler/channelManagementHandler.js";

describe("isChannexAriOutboxEvent", () => {
  test("recognises the scheduled outbox event, bare or wrapped by EventBridge", () => {
    expect(isChannexAriOutboxEvent({ action: "PROCESS_CHANNEX_ARI_OUTBOX" })).toBe(true);
    expect(isChannexAriOutboxEvent({ detail: { action: "PROCESS_CHANNEX_ARI_OUTBOX" } })).toBe(true);
  });

  test("does not mistake an HTTP request or the booking poll for it", () => {
    expect(isChannexAriOutboxEvent({ httpMethod: "GET", path: "/integrations/channex/status" })).toBe(false);
    expect(isChannexAriOutboxEvent({ action: "CHANNEX_BOOKING_POLL" })).toBe(false);
  });
});
