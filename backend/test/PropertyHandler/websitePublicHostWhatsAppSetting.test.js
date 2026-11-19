import { describe, expect, it, jest } from "@jest/globals";
import { servePublicWebsiteHostForSite } from "../../functions/PropertyHandler/business/service/websitePublicHostService.js";
import {
  EXISTING_DOMAIN,
  EXISTING_SITE,
  EXISTING_SITE_RENDER_BODY,
  buildExistingSiteController,
  renderEvent,
} from "./support/existingSiteRender.js";

const HOST_WITH_WHATSAPP = Object.freeze({
  displayName: "Amara",
  profileImage: "https://images.example/amara.jpg",
  whatsapp: Object.freeze({ isAvailable: true, phoneNumber: "+31 6 1234 5678", phoneNumberDigits: "31612345678" }),
});
const NO_WHATSAPP = { isAvailable: false, phoneNumber: "", phoneNumberDigits: "" };

const withWidget = (chatWidget) => ({
  ...EXISTING_SITE.publishedContentOverrides,
  visibility: { ...EXISTING_SITE.publishedContentOverrides.visibility, chatWidget },
});

const renderWithOverrides = async (publishedContentOverrides, host = HOST_WITH_WHATSAPP) => {
  const controller = buildExistingSiteController({ site: { ...EXISTING_SITE, publishedContentOverrides } });
  controller.websitePublicHostService = { loadPublicHost: jest.fn(async () => host) };
  const response = await controller.getPublicWebsiteRenderModel(renderEvent({ domain: EXISTING_DOMAIN.domain }));
  return { response, body: JSON.parse(response.body) };
};

describe("the WhatsApp contact of a host on one website", () => {
  it("leaves the number out when the host turned the WhatsApp widget off, and keeps the rest of the host block", () => {
    const served = servePublicWebsiteHostForSite(HOST_WITH_WHATSAPP, { visibility: { chatWidget: false } });

    expect(served).toEqual({ displayName: "Amara", profileImage: HOST_WITH_WHATSAPP.profileImage, whatsapp: NO_WHATSAPP });
    expect(HOST_WITH_WHATSAPP.whatsapp.isAvailable).toBe(true);
  });

  it.each([
    ["the widget on", { visibility: { chatWidget: true } }],
    ["no widget setting", { visibility: { heroSection: true } }],
    ["no visibility settings", { heroTitle: "Villa" }],
    ["a setting that is not true or false, which the site treats as the default", { visibility: { chatWidget: "false" } }],
    ["no overrides", undefined],
  ])("keeps the number with %s, as the site shows the widget then", (_label, contentOverrides) => {
    expect(servePublicWebsiteHostForSite(HOST_WITH_WHATSAPP, contentOverrides)).toBe(HOST_WITH_WHATSAPP);
  });

  it("answers a missing host block as it is", () => {
    expect(servePublicWebsiteHostForSite(null, { visibility: { chatWidget: false } })).toBeNull();
  });
});

describe("the public render and the WhatsApp widget setting", () => {
  it("sends no number for a site whose host turned the widget off", async () => {
    const { response, body } = await renderWithOverrides(withWidget(false));

    expect(response.statusCode).toBe(200);
    expect(body.host).toEqual({ displayName: "Amara", profileImage: HOST_WITH_WHATSAPP.profileImage, whatsapp: NO_WHATSAPP });
    expect(response.body).not.toContain("31612345678");
    expect(body.contentOverrides.visibility.chatWidget).toBe(false);
  });

  it("sends the number for a site with the widget on", async () => {
    const { body } = await renderWithOverrides(withWidget(true));

    expect(body.host).toEqual(HOST_WITH_WHATSAPP);
  });

  it("renders an existing site byte for byte as before", async () => {
    const controller = buildExistingSiteController();

    const response = await controller.getPublicWebsiteRenderModel(renderEvent({ domain: EXISTING_DOMAIN.domain }));

    expect(response.body).toBe(EXISTING_SITE_RENDER_BODY);
  });
});
