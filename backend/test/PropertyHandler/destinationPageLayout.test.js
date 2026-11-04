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
  continent: buildDestinationPage({
    destination: { type: "continent", ...EUROPE },
    children: [{ ...SPAIN, activeListings: 3 }],
    listings: [stay(3)],
    activeListings: 3,
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
const withoutAbsoluteHead = (html) =>
  html
    .replaceAll(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "")
    .replace(/<link rel="canonical" href="[^"]*">/, "")
    .replace(/<meta property="og:url" content="[^"]*">/, "");
const readUrls = (html) =>
  [
    ...withoutAbsoluteHead(html).matchAll(
      /\s(href|src|srcset|action|formaction|poster)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi
    ),
  ].map(([, attribute, double, single, bare]) => ({ attribute, value: double ?? single ?? bare }));
const readAll = (html, pattern) => [...html.matchAll(pattern)].map((match) => match[1]);
const hasOnlyAmpersandEntities = (value) => !/&[#a-z]/i.test(value.replaceAll("&amp;", ""));
const isSamePath = (value) => /^\/(?![/\\])/.test(value) && !/[\s\\]/.test(value);

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

  it("styles every class the pages use and sets no fixed width wider than a 390 px screen", () => {
    const pages = Object.values(renderPages());
    const [style] = readStyle(pages[0]);
    const classes = new Set(
      pages.flatMap((html) => readAll(html, /\sclass="([^"]*)"/g).flatMap((name) => name.split(" ")))
    );

    expect(classes.size).toBeGreaterThan(15);
    for (const name of classes) {
      expect({ name, styled: new RegExp(String.raw`\.${name}(?![\w-])`).test(style) }).toEqual({ name, styled: true });
    }
    expect(style).not.toMatch(
      /(?<![\w-])(?:min-)?width:\s*(?:(?:39[1-9]|[4-9]\d\d|\d{4,})px|(?:2[5-9]|[3-9]\d|\d{3,})(?:\.\d+)?r?em)/
    );
  });

  it.each(Object.entries(renderPages()))(
    "has no script on the %s page other than the breadcrumb data, and nothing that runs code",
    (name, html) => {
      const scripts = [...html.matchAll(/<script\b[^>]*>/gi)].map(([tag]) => tag);

      const hasBreadcrumbs = !["root", "notFound", "unavailable"].includes(name);
      expect(scripts).toEqual(hasBreadcrumbs ? ['<script type="application/ld+json">'] : []);
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
      const links = readUrls(html);
      const rest = withoutAbsoluteHead(html).replaceAll(`src="${ACCOMMODATION_IMAGE_BASE_URL}`, 'src="/');

      expect(links.length).toBeGreaterThan(15);
      for (const { attribute, value } of links) {
        const plain = value.replaceAll("&amp;", "&");
        const isPhoto = attribute === "src" && plain.startsWith(ACCOMMODATION_IMAGE_BASE_URL);
        const relative = hasOnlyAmpersandEntities(value) && (isPhoto || isSamePath(plain));
        expect({ attribute, value, relative }).toEqual({ attribute, value, relative: true });
      }
      expect(rest).not.toMatch(/https?:|["'(=]\s*\/\/|\sstyle\s*=/i);
      const canonical = readAll(html, /<link rel="canonical" href="([^"]*)">/g);
      const indexed = name !== "notFound" && name !== "unavailable";
      expect(canonical).toEqual(readAll(html, /<meta property="og:url" content="([^"]*)">/g));
      expect(canonical).toHaveLength(indexed ? 1 : 0);
      expect(canonical.every((value) => value.startsWith("https://www.domits.com/destinations"))).toBe(true);
    }
  );

  it("keeps a page with 24 stays of the longest titles and places under 72 KiB, and the notices under 6 KiB", () => {
    const longest = { title: '"'.repeat(5000), city: '"'.repeat(5000), country: '"'.repeat(5000) };
    const page = buildDestinationPage({
      destination: { type: "city", name: "Marbella", path: "/destinations/europe/spain/marbella" },
      parents: [EUROPE, SPAIN],
      listings: Array.from({ length: 24 }, (_, index) => stay(index, longest)),
    });

    expect(page.html.match(/<li class="listing">/g)).toHaveLength(24);
    expect(Buffer.byteLength(page.html, "utf8")).toBeLessThanOrEqual(72 * 1024);
    expect(Buffer.byteLength(buildDestinationNotFoundPage(), "utf8")).toBeLessThanOrEqual(6 * 1024);
    expect(Buffer.byteLength(buildDestinationUnavailablePage(), "utf8")).toBeLessThanOrEqual(6 * 1024);
  });
});
