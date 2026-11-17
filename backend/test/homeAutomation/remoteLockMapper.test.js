import { describe, expect, it } from "@jest/globals";
import {
  buildGuestName,
  mapAccess,
  mapAccessGuest,
  mapDevice,
  mapDevicePage,
} from "../../functions/.shared/homeAutomation/providers/remotelock/remoteLockMapper.js";

const PIN = "482913";

describe("mapDevice", () => {
  it("maps the id, the raw type and the name, and ignores everything else", () => {
    const raw = { id: "d-1", type: "zwave_lock", attributes: { name: "Front door", model_id: "m", location_id: "l" } };

    expect(mapDevice(raw)).toEqual({ providerDeviceId: "d-1", deviceType: "zwave_lock", name: "Front door" });
  });

  it("keeps a device without a name, with name null", () => {
    expect(mapDevice({ id: "d-1", type: "lock", attributes: {} }).name).toBeNull();
  });

  it.each([{ type: "lock" }, { id: "d-1" }, { id: " ", type: "lock" }, null])("returns null for %j", (raw) => {
    expect(mapDevice(raw)).toBeNull();
  });
});

describe("mapDevicePage", () => {
  it("maps the devices and the paging meta", () => {
    const raw = {
      data: [{ id: "d-1", type: "lock", attributes: { name: "A" } }],
      meta: { page: 1, per_page: 50, total_pages: 2, total_count: 51 },
    };

    expect(mapDevicePage(raw)).toEqual({
      devices: [{ providerDeviceId: "d-1", deviceType: "lock", name: "A" }],
      page: 1,
      perPage: 50,
      totalPages: 2,
      totalCount: 51,
    });
  });

  it("returns null when data is not a list or one device cannot be mapped", () => {
    expect(mapDevicePage({ data: {} })).toBeNull();
    expect(mapDevicePage({ data: [{ type: "lock" }] })).toBeNull();
  });
});

describe("mapAccessGuest", () => {
  const raw = {
    id: "g-1",
    type: "access_guest",
    attributes: { status: "current", starts_at: "2026-10-12T15:00:00", ends_at: "2026-10-15T11:00:00", pin: PIN },
  };

  it("returns exactly the four documented fields, with the times as given", () => {
    expect(mapAccessGuest(raw)).toEqual({
      providerCredentialId: "g-1",
      status: "current",
      startsAt: "2026-10-12T15:00:00",
      endsAt: "2026-10-15T11:00:00",
    });
  });

  it("never carries the pin", () => {
    expect(JSON.stringify(mapAccessGuest(raw))).not.toMatch(/pin|482913/i);
  });

  it("returns null without an id", () => {
    expect(mapAccessGuest({ attributes: { pin: PIN } })).toBeNull();
  });
});

describe("mapAccess", () => {
  it("returns the access id, or null without one", () => {
    expect(mapAccess({ id: "a-1", attributes: { access_person_id: "g-1" } })).toEqual({ providerAccessId: "a-1" });
    expect(mapAccess({})).toBeNull();
  });
});

describe("buildGuestName", () => {
  it("names the guest after the booking only", () => {
    expect(buildGuestName("b-1")).toBe("Domits booking b-1");
  });

  it.each(["", "  ", null, 12])("rejects %j", (bookingId) => {
    expect(() => buildGuestName(bookingId)).toThrow("booking id");
  });
});
