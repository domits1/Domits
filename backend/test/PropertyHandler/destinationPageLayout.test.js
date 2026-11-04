import { describe, expect, it } from "@jest/globals";
import {
  buildDestinationNotFoundPage,
  buildDestinationPage,
  buildDestinationRootPage,
  buildDestinationUnavailablePage,
} from "../../functions/PropertyHandler/business/service/destinationPageBuilder.js";
import { ACCOMMODATION_IMAGE_BASE_URL } from "../../functions/PropertyHandler/util/destination/accommodationImage.js";

const EUROPE = { name: "Europe", path: "/destinations/europe" };
const SPAIN = { name: "Spain", path: "/destinations/europe/spain" };
const stay = (index, overrides = {}) => ({
  id: `${String(index).padStart(8, "0")}-2222-4333-8444-555555555555`,
  title: `Sea-view apartment ${index}`,
  city: "Marbella",
  country: "Spain",
  nightlyRate: 120 + index,
  imageUrl: `${ACCOMMODATION_IMAGE_BASE_URL}images/p${index}/web.webp`,
  ...overrides,
});

const renderPages = () => ({
  root: buildDestinationRootPage({
    continents: [{ ...EUROPE, hasPage: true, countries: [{ ...SPAIN, hasPage: true, activeListings: 3 }] }],
  }).html,
  country: buildDestinationPage({
    destination: { type: "country", ...SPAIN },
    parents: [EUROPE],
    children: [{ name: "Marbella", path: "/destinations/europe/spain/marbella", activeListings: 3 }],
    listings: [stay(1), stay(2)],
    activeListings: 3,
  }).html,
  city: buildDestinationPage({
    destination: { type: "city", name: "Marbella", path: "/destinations/europe/spain/marbella" },
    parents: [EUROPE, SPAIN],
    listings: [stay(1), stay(2, { imageUrl: "", nightlyRate: 0 })],
  }).html,
  notFound: buildDestinationNotFoundPage(),
  unavailable: buildDestinationUnavailablePage(),
});

const readStyle = (html) => [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((match) => match[1]);
const withoutBreadcrumbData = (html) => html.replaceAll(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");
const readUrls = (html) =>
  [...withoutBreadcrumbData(html).matchAll(/<([a-z]+)\b[^>]*?\s(href|src|action|srcset)="([^"]*)"/g)].map(
    ([tag, element, attribute, value]) => ({ tag, element, attribute, value })
  );
const isCanonical = ({ tag }) => tag.startsWith('<link rel="canonical"');
const isSamePath = (value) => value.startsWith("/") && !value.startsWith("//") && !value.includes("\\");

describe("the shared layout of the destination pages", () => {
  it.each(Object.entries(renderPages()))("puts the Domits header and footer around the %s page", (_, html) => {
    const header = html.indexOf('<header class="site-header">');
    const main = html.indexOf("<main");
    const footer = html.indexOf('<footer class="site-footer">');

    expect(html.match(/<header /g)).toHaveLength(1);
    expect(html.match(/<footer /g)).toHaveLength(1);
    expect(header).toBeGreaterThan(html.indexOf("<body>"));
    expect(main).toBeGreaterThan(header);
    expect(footer).toBeGreaterThan(html.indexOf("</main>"));
    expect(html).toContain('<a class="brand" href="/"><img src="/logo.svg" alt="" width="36" height="36">Domits</a>');
    expect(html).toContain('<nav class="site-nav" aria-label="Main"><a href="/destinations">Destinations</a>');
    expect(html).toContain('<a href="/landing">Become a host</a></nav></header>');
    for (const link of [
      '<a href="/why-domits">Why Domits</a>',
      '<a href="/about">About us</a>',
      '<a href="/contact">Contact</a>',
      '<a href="/">Search and book</a>',
      '<a href="/helpdesk-guest">Helpdesk for guests</a>',
      '<a href="/helpdesk-host">Helpdesk for hosts</a>',
      '<a href="/policy">Privacy policy</a>',
      '<a href="/terms">Terms and Conditions</a>',
      '<a href="/sitemap.xml">Sitemap</a>',
    ]) {
      expect(html.slice(footer)).toContain(link);
    }
  });

  it("uses one small shared style on every page, the not found and unavailable pages included", () => {
    const styles = Object.values(renderPages()).map(readStyle);

    for (const style of styles) {
      expect(style).toHaveLength(1);
      expect(style[0]).toBe(styles[0][0]);
    }
    expect(Buffer.byteLength(styles[0][0], "utf8")).toBeLessThanOrEqual(4096);
    expect(styles[0][0]).not.toMatch(/@import|@font-face|url\(/);
  });

  it.each(Object.entries(renderPages()))(
    "has no script on the %s page other than the breadcrumb data, and nothing that runs code",
    (name, html) => {
      const scripts = [...html.matchAll(/<script\b[^>]*>/gi)].map(([tag]) => tag);

      expect(scripts).toEqual(name === "country" || name === "city" ? ['<script type="application/ld+json">'] : []);
      expect(html).not.toMatch(/<[^>]*\son[a-z]+\s*=/i);
      expect(html).not.toMatch(/javascript:/i);
      expect(html).not.toMatch(/<(iframe|object|embed|base|form)\b/i);
      expect([...html.matchAll(/<link\b[^>]*>/gi)].every(([tag]) => tag.startsWith('<link rel="canonical"'))).toBe(
        true
      );
    }
  );

  it.each(Object.entries(renderPages()))(
    "links only to paths on the same host on the %s page, apart from the canonical, og:url and breadcrumb data",
    (name, html) => {
      const urls = readUrls(html);
      const links = urls.filter((url) => !isCanonical(url));

      expect(links.length).toBeGreaterThan(15);
      for (const { element, attribute, value } of links) {
        const isPhoto = element === "img" && attribute === "src" && value.startsWith(ACCOMMODATION_IMAGE_BASE_URL);
        expect({ element, attribute, value, relative: isPhoto || isSamePath(value) }).toEqual({
          element,
          attribute,
          value,
          relative: true,
        });
      }
      const canonical = urls.filter(isCanonical).map(({ value }) => value);
      const ogUrl = [...html.matchAll(/<meta property="og:url" content="([^"]*)">/g)].map((match) => match[1]);
      const indexed = name !== "notFound" && name !== "unavailable";
      expect(canonical).toEqual(ogUrl);
      expect(canonical).toHaveLength(indexed ? 1 : 0);
      expect(canonical.every((value) => value.startsWith("https://www.domits.com/destinations"))).toBe(true);
    }
  );
});
