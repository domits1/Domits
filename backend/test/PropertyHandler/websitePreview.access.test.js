import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import { Forbidden } from "../../functions/PropertyHandler/util/exception/Forbidden.js";
import { NotFoundException } from "../../functions/PropertyHandler/util/exception/NotFoundException.js";
import { Unauthorized } from "../../functions/PropertyHandler/util/exception/Unauthorized.js";

const OWNER = "host-1";
const PUBLIC_HOST = Object.freeze({
  displayName: "Karim",
  profileImage: "",
  whatsapp: { isAvailable: false, phoneNumber: "", phoneNumberDigits: "" },
});
const LISTING = Object.freeze({
  property: {
    id: "property-1",
    hostId: OWNER,
    title: "Cliff House",
    status: "ACTIVE",
    registrationNumber: "REG-1",
    bookingType: "direct",
  },
  images: [{ key: "images/property-1/a.jpg" }],
  location: { country: "Indonesia", city: "Ubud" },
  calendarAvailability: {
    unavailableDateKeys: ["2027-01-15"],
    syncSources: [{ name: "Airbnb", calendarUrl: "https://ical.example/property-1.ics" }],
  },
});
const draftRow = (overrides = {}) => ({
  id: "draft-1",
  propertyId: "property-1",
  hostId: OWNER,
  templateKey: "panorama-landing",
  status: "PREVIEW",
  contentOverrides: { heroTitle: "Draft villa" },
  themeOverrides: {},
  publishedContentOverrides: {},
  publishedThemeOverrides: {},
  ...overrides,
});

const buildPreview = ({ draft = draftRow(), hostId = OWNER, groupError = null, ownerError = null } = {}) => {
  const controller = new PropertyController();
  controller.authManager = {
    authorizeGroupRequest: jest.fn(async () => {
      if (groupError) throw groupError;
      return hostId;
    }),
    authorizeOwnerRequest: jest.fn(async () => {
      if (ownerError) throw ownerError;
      return hostId;
    }),
  };
  controller.directBookingWebsiteDraftRepository = { getDraftById: jest.fn(async () => draft) };
  controller.directBookingWebsiteEventRepository = { recordEvent: jest.fn(async () => undefined) };
  controller.propertyService = {
    getFullPropertyAttributes: jest.fn(async () => LISTING),
    getFullPropertyAttributesWithFullLocation: jest.fn(async () => LISTING),
  };
  controller.websitePublicHostService = { loadPublicHost: jest.fn(async () => PUBLIC_HOST) };
  const open = (headers = { Authorization: "host-token" }) =>
    controller.getWebsitePreviewByDraftId({ httpMethod: "GET", headers, queryStringParameters: { draft: "draft-1" } });
  return { controller, open };
};

const expectNothingRead = (controller) => {
  expect(controller.propertyService.getFullPropertyAttributes).not.toHaveBeenCalled();
  expect(controller.directBookingWebsiteEventRepository.recordEvent).not.toHaveBeenCalled();
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("who can open the preview of a website draft", () => {
  it("shows the preview to the host who owns the draft, checked with the request's own token", async () => {
    const { controller, open } = buildPreview();

    const response = await open();

    expect(response.statusCode).toBe(200);
    expect(controller.authManager.authorizeGroupRequest).toHaveBeenCalledWith("host-token", "Host");
    expect(controller.authManager.authorizeOwnerRequest).toHaveBeenCalledWith("host-token", "property-1");
    expect(controller.directBookingWebsiteEventRepository.recordEvent).toHaveBeenCalledTimes(1);
  });

  it("asks for a login without a token, and reads no draft", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const { controller, open } = buildPreview({ groupError: new Unauthorized("Unauthorized.") });

    const response = await open({});

    expect(response.statusCode).toBe(401);
    expect(controller.directBookingWebsiteDraftRepository.getDraftById).not.toHaveBeenCalled();
    expectNothingRead(controller);
  });

  it.each([
    ["a draft of another host", { draft: draftRow({ hostId: "host-2" }) }],
    ["a suspended draft", { draft: draftRow({ status: "SUSPENDED" }) }],
    ["a missing draft", { draft: null }],
  ])("answers not found for %s, without reading the listing", async (_label, options) => {
    const { controller, open } = buildPreview(options);

    const response = await open();

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toEqual({ message: "Website preview not found." });
    expectNothingRead(controller);
  });

  it("answers not found when the listing of the draft no longer exists", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const { controller, open } = buildPreview({ ownerError: new NotFoundException("Property not found.") });

    const response = await open();

    expect(response.statusCode).toBe(404);
    expectNothingRead(controller);
  });

  it("refuses a host who no longer owns the listing of the draft", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const { controller, open } = buildPreview({ ownerError: new Forbidden("You must be the owner of the property.") });

    const response = await open();

    expect(response.statusCode).toBe(403);
    expectNothingRead(controller);
  });
});

describe("what the preview of a website draft contains", () => {
  it("sends the listing through the public site view, with the host block of the live site", async () => {
    const { controller, open } = buildPreview();

    const body = JSON.parse((await open()).body);

    expect(body.draft).toEqual(draftRow());
    expect(body.host).toEqual(PUBLIC_HOST);
    expect(body.propertyDetails).toEqual({
      property: { id: "property-1", title: "Cliff House", status: "ACTIVE" },
      images: [{ key: "images/property-1/a.jpg" }],
      location: { country: "Indonesia", city: "Ubud" },
      calendarAvailability: { unavailableDateKeys: ["2027-01-15"] },
    });
    expect(controller.propertyService.getFullPropertyAttributes).toHaveBeenCalledWith("property-1", {
      includeCalendarAvailability: true,
    });
    expect(controller.propertyService.getFullPropertyAttributesWithFullLocation).not.toHaveBeenCalled();
    expect(controller.websitePublicHostService.loadPublicHost).toHaveBeenCalledWith(OWNER);
  });
});
