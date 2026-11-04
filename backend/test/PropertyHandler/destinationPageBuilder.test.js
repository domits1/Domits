import { describe, expect, it } from "@jest/globals";
import {
  buildDestinationNotFoundPage,
  buildDestinationPage,
  buildDestinationUnavailablePage,
  escapeHtml,
} from "../../functions/PropertyHandler/business/service/destinationPageBuilder.js";
import { readDestinationSettings } from "../../functions/PropertyHandler/util/destination/destinationSettings.js";

const MARBELLA = { type: "city", name: "Marbella", path: "/destinations/europe/spain/marbella" };
const PARENTS = [
  { name: "Europe", path: "/destinations/europe" },
  { name: "Spain", path: "/destinations/europe/spain" },
];
const LISTING = {
  id: "11111111-2222-4333-8444-555555555555",
  title: 'Villa <Sol> & "Mar"',
  city: "Marbella",
  country: "Spain",
  nightlyRate: 240,
  imageUrl: "https://accommodation.s3.eu-north-1.amazonaws.com/images/p1/web.jpg",
};

const readJsonLd = (html) => JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/.exec(html)[1]);

describe("the destination page", () => {
  it("renders the title, description, canonical, breadcrumbs with BreadcrumbList data and the listing cards", () => {
    const page = buildDestinationPage({ destination: MARBELLA, parents: PARENTS, listings: [LISTING] });

    expect(page.title).toBe("Holiday rentals in Marbella | Domits");
    expect(page.canonical).toBe("https://www.domits.com/destinations/europe/spain/marbella");
    expect(page.description).toBe("Book 1 holiday rental in Marbella directly with the host on Domits.");
    expect(page.cacheControl).toBe("public, max-age=300");
    expect(page.html).toContain(
      '<link rel="canonical" href="https://www.domits.com/destinations/europe/spain/marbella">'
    );
    expect(page.html).toContain("<h1>Holiday rentals in Marbella</h1>");
    expect(page.html).toContain('<a href="/destinations/europe/spain">Spain</a>');
    expect(page.html).toContain('<li aria-current="page">Marbella</li>');
    expect(page.html).toContain(`<a href="/listingdetails?ID=${LISTING.id}">`);
    expect(page.html).toContain("From &euro;240 per night");
    expect(page.html).not.toContain('name="robots"');
    expect(readJsonLd(page.html)).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Destinations", item: "https://www.domits.com/destinations" },
        { "@type": "ListItem", position: 2, name: "Europe", item: "https://www.domits.com/destinations/europe" },
        { "@type": "ListItem", position: 3, name: "Spain", item: "https://www.domits.com/destinations/europe/spain" },
        {
          "@type": "ListItem",
          position: 4,
          name: "Marbella",
          item: "https://www.domits.com/destinations/europe/spain/marbella",
        },
      ],
    });
  });

  it("escapes everything that comes from a host or a visitor", () => {
    const page = buildDestinationPage({
      destination: { ...MARBELLA, name: 'Marbella <script>alert("x")</script>' },
      parents: PARENTS,
      listings: [{ ...LISTING, imageUrl: 'https://x/"onerror="alert(1)' }],
    });

    expect(page.html).not.toContain("<script>alert");
    expect(page.html).toContain("Marbella &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(page.html).toContain("Villa &lt;Sol&gt; &amp; &quot;Mar&quot;");
    expect(page.html).toContain('src="https://x/&quot;onerror=&quot;alert(1)"');
    expect(readJsonLd(page.html).itemListElement[3].name).toBe('Marbella <script>alert("x")</script>');
    expect(escapeHtml("a&b<c>'d'")).toBe("a&amp;b&lt;c&gt;&#39;d&#39;");
  });

  it("lists the destinations below a country or continent and counts their stays", () => {
    const page = buildDestinationPage({
      destination: { type: "country", name: "Spain", path: "/destinations/europe/spain" },
      parents: [PARENTS[0]],
      children: [
        { name: "Marbella", path: "/destinations/europe/spain/marbella", activeListings: 2 },
        { name: "Málaga", path: "/destinations/europe/spain/malaga", activeListings: 1 },
        { name: "Nowhere", path: "/destinations/europe/spain/nowhere", activeListings: 0 },
      ],
      listings: [LISTING, { ...LISTING, id: "22222222-2222-4333-8444-555555555555", nightlyRate: 0, imageUrl: "" }],
      activeListings: 3,
    });

    expect(page.description).toBe(
      "Book 3 holiday rentals in Spain across 2 destinations directly with the host on Domits."
    );
    expect(page.html).toContain(
      '<a href="/destinations/europe/spain/marbella">Marbella</a> <span class="count">2 holiday rentals</span>'
    );
    expect(page.html).toContain("Málaga");
    expect(page.html).not.toContain("Nowhere");
    expect((page.html.match(/<li class="listing">/g) || []).length).toBe(2);
    expect((page.html.match(/<img src="https:\/\/accommodation\./g) || []).length).toBe(1);
    expect((page.html.match(/per night/g) || []).length).toBe(1);
  });

  it("refuses to render a destination that has no page under the settings", () => {
    expect(() => buildDestinationPage({ destination: MARBELLA, parents: PARENTS, listings: [] })).toThrow(
      "has no active listings"
    );
    expect(() =>
      buildDestinationPage({
        destination: MARBELLA,
        parents: PARENTS,
        listings: [LISTING],
        settings: readDestinationSettings({ DESTINATION_MIN_ACTIVE_LISTINGS: "2" }),
      })
    ).toThrow("has no active listings");
    expect(() =>
      buildDestinationPage({
        destination: { type: "country", name: "Spain", path: "/destinations/europe/spain" },
        children: [{ name: "Marbella", path: "/destinations/europe/spain/marbella", activeListings: 3 }],
        activeListings: 3,
        directListings: 0,
        settings: readDestinationSettings({
          DESTINATION_MIN_ACTIVE_LISTINGS: "2",
          DESTINATION_PARENT_FROM_ANY_CHILD: "false",
        }),
      })
    ).toThrow("has no active listings");
    expect(() => buildDestinationPage({ destination: { name: "x" }, listings: [LISTING] })).toThrow(
      "type, a name and a path"
    );
  });

  it("uses the origin it is given for the canonical and strips a trailing slash from it", () => {
    const page = buildDestinationPage({
      destination: MARBELLA,
      parents: PARENTS,
      listings: [LISTING],
      siteOrigin: "https://acceptance.domits.com/",
    });
    expect(page.canonical).toBe("https://acceptance.domits.com/destinations/europe/spain/marbella");
    expect(readJsonLd(page.html).itemListElement[0].item).toBe("https://acceptance.domits.com/destinations");
  });

  it("renders a not found page that is never indexed and links back to the destinations on the same host", () => {
    const html = buildDestinationNotFoundPage();
    expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(html).toContain('<a href="/destinations">All destinations</a>');
    expect(html).not.toContain("domits.com");
    expect(html).not.toContain("canonical");
  });

  it("renders an unavailable page that is never indexed, asks to try again and names no destination", () => {
    const html = buildDestinationUnavailablePage();
    expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(html).toContain("<title>Destinations unavailable | Domits</title>");
    expect(html).toContain("Please try again in a minute.");
    expect(html).not.toContain("canonical");
    expect(html).not.toContain("No stays here yet");
  });
});

describe("the stay cards", () => {
  const renderStay = (overrides) =>
    buildDestinationPage({ destination: MARBELLA, parents: PARENTS, listings: [{ ...LISTING, ...overrides }] }).html;
  const readCard = (html) => /<li class="listing">.*?<\/li>/.exec(html)[0];
  const readTitle = (html) => /<h3 dir="auto">([^<]*)<\/h3>/.exec(html)[1];
  const readPlace = (html) => /<p class="place" dir="auto">([^<]*)<\/p>/.exec(html)?.[1];

  it("renders a stay as one link around the photo, title, place and price", () => {
    const title = "Villa &lt;Sol&gt; &amp; &quot;Mar&quot;";
    expect(readCard(renderStay({}))).toBe(
      `<li class="listing"><a href="/listingdetails?ID=${LISTING.id}"><img src="${LISTING.imageUrl}" alt="${title}" loading="lazy"><h3 dir="auto">${title}</h3><p class="place" dir="auto">Marbella, Spain</p><p class="price">From &euro;240 per night</p></a></li>`
    );
  });

  it("shows a placeholder without a photo, leaves out a missing price and place, and names an untitled stay", () => {
    const card = readCard(
      renderStay({ title: " \n ", city: "", country: "  ", imageUrl: "", nightlyRate: Number.NaN })
    );
    expect(card).toBe(
      `<li class="listing"><a href="/listingdetails?ID=${LISTING.id}"><span class="photo"></span><h3 dir="auto">Holiday rental</h3></a></li>`
    );
  });

  it("names the place from the parts it has", () => {
    expect(readPlace(renderStay({ country: "" }))).toBe("Marbella");
    expect(readPlace(renderStay({ city: " " }))).toBe("Spain");
  });

  it("keeps a very long title and place to 120 characters without splitting an emoji or an escaped character", () => {
    const palm = "\u{1F334}";
    const html = renderStay({ title: palm.repeat(300), city: "&".repeat(300), country: "" });

    expect(readTitle(html)).toBe(`${palm.repeat(119)}\u2026`);
    expect(readPlace(html)).toBe(`${"&amp;".repeat(119)}\u2026`);
    expect(html).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
    expect(readTitle(renderStay({ title: "a".repeat(120) }))).toBe("a".repeat(120));
  });

  it("keeps right to left text as it is and lets the browser set its direction per title and place", () => {
    const html = renderStay({
      title: "\u0634\u0642\u0629 \u0639\u0644\u0649 \u0627\u0644\u0628\u062D\u0631",
      city: "\u05EA\u05DC \u05D0\u05D1\u05D9\u05D1",
    });
    expect(readTitle(html)).toBe("\u0634\u0642\u0629 \u0639\u0644\u0649 \u0627\u0644\u0628\u062D\u0631");
    expect(readPlace(html)).toBe("\u05EA\u05DC \u05D0\u05D1\u05D9\u05D1, Spain");
  });
});
