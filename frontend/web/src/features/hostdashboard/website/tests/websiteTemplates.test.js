import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LanguageContext } from "../../../../context/LanguageContext";
import WebsiteBuilderPage from "../WebsiteBuilderPage";
import {
  DEFAULT_WEBSITE_TEMPLATE_ID,
  WEBSITE_TEMPLATE_OPTIONS,
  getWebsiteTemplateById,
  getWebsiteTemplateCopy,
  isWebsiteTemplateBuilderEnabled,
} from "../websiteTemplates";
import { getWebsiteTemplateRenderer } from "../rendering/templateRegistry";
import PanoramaLandingTemplate from "../rendering/templates/PanoramaLandingTemplate";
import ExperienceJourneyTemplate from "../rendering/templates/ExperienceJourneyTemplate";
import { upsertWebsiteDraft } from "../services/websiteDraftService";

jest.mock("../../../../services/getAccessToken", () => ({ getAccessToken: () => "test-token" }));
jest.mock("../../services/hostTaskPropertyService", () => ({
  fetchHostPropertySelectOptions: async () => [{ value: "test-property", title: "Test listing" }],
}));
jest.mock("../services/websiteDraftService", () => ({
  ...jest.requireActual("../services/websiteDraftService"),
  fetchWebsiteDrafts: async () => [],
}));
jest.mock("../analytics/websiteAnalyticsService", () => ({
  recordWebsiteHostAnalyticsEventSafely: jest.fn(),
  recordWebsiteHostAnalyticsEventWithRetry: jest.fn(),
}));

it.each(["en", "nl", "de", "es"])("renders two cards and keeps Essentials selected in %s", async (language) => {
  const copy = getWebsiteTemplateCopy(language);
  render(
    <LanguageContext.Provider value={{ language }}>
      <MemoryRouter initialEntries={["/?propertyId=test-property"]}>
        <WebsiteBuilderPage />
      </MemoryRouter>
    </LanguageContext.Provider>
  );
  const step = (await screen.findByRole("heading", { name: copy.title })).closest("section");
  const essentials = within(step).getByRole("button", { name: /Essentials/ });
  const elite = within(step).getByRole("button", { name: /Elite/ });
  expect(within(step).getAllByRole("button", { pressed: false })).toEqual([elite]);
  expect(within(step).getAllByRole("button", { pressed: true })).toEqual([essentials]);
  expect(elite).toBeDisabled();
  expect(elite).toHaveTextContent(copy.comingSoon);
  fireEvent.click(elite);
  expect(essentials).toHaveAttribute("aria-pressed", "true");
  expect(within(step).getByText(copy.currentPick).nextElementSibling).toHaveTextContent(/^Essentials$/);
  expect(within(step).getByText(copy.availabilityHint)).toBeInTheDocument();
});

it("offers only Essentials and the disabled Elite with their original IDs", () => {
  expect(WEBSITE_TEMPLATE_OPTIONS.map(({ id, name }) => [id, name])).toEqual([
    ["panorama-landing", "Essentials"],
    ["trust-signals", "Elite"],
  ]);
  expect(DEFAULT_WEBSITE_TEMPLATE_ID).toBe("panorama-landing");
  expect(isWebsiteTemplateBuilderEnabled("panorama-landing")).toBe(true);
  expect(isWebsiteTemplateBuilderEnabled("trust-signals")).toBe(false);
});

it.each([
  ["en", "Single-page website, basic customization and essential features", "Multi-everything website, advanced customization and elite features"],
  ["nl", "Website met één pagina, basisaanpassingen en essentiële functies", "Veelzijdige website, uitgebreide aanpassingsmogelijkheden en exclusieve functies"],
  ["de", "Website mit einer Seite, grundlegenden Anpassungsmöglichkeiten und wesentlichen Funktionen", "Vielseitige Website mit erweiterten Anpassungsmöglichkeiten und exklusiven Funktionen"],
  ["es", "Sitio web de una sola página, personalización básica y funciones esenciales", "Sitio web multifuncional, personalización avanzada y funciones exclusivas"],
])("localizes descriptions and the current-pick explanation in %s", (language, essentials, elite) => {
  expect(getWebsiteTemplateById("panorama-landing", language)).toMatchObject({ name: "Essentials", description: essentials });
  expect(getWebsiteTemplateById("trust-signals", language)).toMatchObject({ name: "Elite", description: elite });
  expect(getWebsiteTemplateCopy(language).availabilityHint).toMatch(/Essentials.*Elite/);
});

it("preserves renderer lookup for saved drafts and published template keys", () => {
  expect(getWebsiteTemplateRenderer(getWebsiteTemplateById("panorama-landing").id)).toBe(PanoramaLandingTemplate);
  expect(getWebsiteTemplateRenderer(getWebsiteTemplateById("experience-journey").id)).toBe(ExperienceJourneyTemplate);
  expect(isWebsiteTemplateBuilderEnabled("experience-journey")).toBe(false);
  expect(getWebsiteTemplateById("unknown").id).toBe("panorama-landing");
  expect(getWebsiteTemplateCopy("unknown")).toEqual(getWebsiteTemplateCopy("en"));
});

it("saves the original key when the host chooses Essentials", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ templateKey: "panorama-landing" }) });
  try {
    await upsertWebsiteDraft({ propertyId: "test-property", templateKey: WEBSITE_TEMPLATE_OPTIONS[0].id });
    expect(JSON.parse(globalThis.fetch.mock.calls[0][1].body).templateKey).toBe("panorama-landing");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
