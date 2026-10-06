import { describe, expect, it } from "@jest/globals";
import {
  buildDestinationNotFoundPage,
  buildDestinationPage,
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
    expect(page.cacheControl).toBe("public, max-age=60");
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
    expect((page.html.match(/<img /g) || []).length).toBe(1);
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

  it("renders a not found page that is never indexed and links back to the destinations", () => {
    const html = buildDestinationNotFoundPage();
    expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(html).toContain('<a href="https://www.domits.com/destinations">All destinations</a>');
    expect(html).not.toContain("canonical");
  });
});
