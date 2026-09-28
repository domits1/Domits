import { buildWebsiteTemplateModel } from "../../rendering/buildWebsiteTemplateModel";
import { applyWebsiteDraftContentOverrides } from "../../rendering/websiteDraftContentOverrides";
import { buildStaticSiteDocument, canBuildStaticSiteDocument, resolveStaticSiteTemplateKey } from "../buildStaticSiteDocument";
import { APP_SHELL_TEMPLATE, buildPublishedSiteRenderPayload } from "./publishedSiteRenderPayload";

const buildDocumentFor = ({ template = APP_SHELL_TEMPLATE, ...payloadOverrides } = {}) => {
  const renderPayload = buildPublishedSiteRenderPayload(payloadOverrides);
  const baseModel = buildWebsiteTemplateModel({ propertyDetails: renderPayload.propertySnapshot });
  const model = applyWebsiteDraftContentOverrides(
    baseModel,
    renderPayload.contentOverrides,
    renderPayload.site.templateKey
  );
  return buildStaticSiteDocument({ template, renderPayload, model });
};

describe("a complete static document for a published direct booking website", () => {
  it("replaces the shell title and description with the ones for this site", () => {
    const html = buildDocumentFor();

    expect(html).toContain("<title>Wellness Villa Bisous | Ubud, Indonesia</title>");
    expect(html).not.toContain("Domits - Holiday rentals");
    expect(html).not.toContain('content="Book your next stay"');
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html.match(/name="description"/g)).toHaveLength(1);
  });

  it("keeps the built stylesheet and script of the app shell, so the app can still take over", () => {
    const html = buildDocumentFor();

    expect(html).toContain('<link rel="stylesheet" href="/static/css/main.abc123.css" />');
    expect(html).toContain('<script defer src="/static/js/main.def456.js"></script>');
  });

  it("puts the rendered content inside the React root element", () => {
    const html = buildDocumentFor();

    expect(html).toMatch(/<div id="root"><main class="static-site-content">/);
    expect(html).toContain("</main></div>");
    expect(html).toContain("<h1>Wellness Villa Bisous</h1>");
  });

  it("carries the head tags a crawler without JavaScript needs", () => {
    const html = buildDocumentFor();

    expect(html).toContain(
      '<link rel="canonical" href="https://wellness-villa-bisous-bf378265.direct.domits.com/" />'
    );
    expect(html).toContain('<meta name="robots" content="index, follow" />');
    expect(html).toContain('<meta property="og:type" content="website" />');
    expect(html).toContain('<meta property="og:title" content="Wellness Villa Bisous | Ubud, Indonesia" />');
    expect(html).toContain('<script type="application/ld+json">');
    expect(html).toMatch(/<meta property="og:image" content="https:\/\/[^"]+web\.jpg" \/>/);
  });

  it("removes a conflicting robots or Open Graph tag the shell already carries", () => {
    const html = buildDocumentFor({
      template: APP_SHELL_TEMPLATE.replace(
        '<meta charset="utf-8" />',
        '<meta charset="utf-8" /><meta content="noindex" name="robots"><meta property=og:title content="Domits">'
      ),
    });

    expect(html.match(/name="robots"/g)).toHaveLength(1);
    expect(html).toContain('<meta name="robots" content="index, follow" />');
    expect(html).not.toContain('content="noindex"');
    expect(html.match(/property="?og:title/g)).toHaveLength(1);
    expect(html).toContain('<meta charset="utf-8" />');
    expect(html).toContain('<meta name="viewport"');
  });

  it("marks a suspended site as noindex and leaves the canonical out", () => {
    const html = buildDocumentFor({ site: { status: "SUSPENDED" } });

    expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain("application/ld+json");
  });

  it("takes the page language from the locale of the site", () => {
    expect(buildDocumentFor({ site: { primaryLocale: "nl" } })).toContain('<html lang="nl">');
  });

  it("writes a regional locale as a language tag HTML understands", () => {
    ["nl_NL", "nl_nl", "nl-nl"].forEach((primaryLocale) => {
      const html = buildDocumentFor({ site: { primaryLocale } });

      expect(html).toContain('<html lang="nl-NL">');
      expect(html).toContain('<meta property="og:locale" content="nl_NL" />');
    });
  });

  it("keeps JSON-LD from closing the script element", () => {
    const html = buildDocumentFor({
      propertySnapshot: { property: { title: "Villa </script><script>alert(1)</script>" } },
    });
    const jsonLdBlock = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);

    expect(jsonLdBlock).not.toBeNull();
    expect(jsonLdBlock[1]).not.toContain("</script>");
    expect(JSON.parse(jsonLdBlock[1]).name).toBe("Villa </script><script>alert(1)</script>");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("survives a listing title that looks like a replacement pattern", () => {
    const html = buildDocumentFor({ propertySnapshot: { property: { title: "Villa $& $' $` $1" } } });

    expect(html).toContain("<h1>Villa $&amp; $&#39; $` $1</h1>");
    expect(html).toContain("<title>Villa $&amp; $&#39; $` $1 | Ubud, Indonesia</title>");
  });

  it("drops the enable-JavaScript notice, because this page no longer needs JavaScript", () => {
    const html = buildDocumentFor();

    expect(html).not.toContain("You need to enable JavaScript to run this app.");
    expect(html).not.toContain("<noscript>");
  });

  it("keeps a noscript block that is not about enabling JavaScript", () => {
    const html = buildDocumentFor({
      template: APP_SHELL_TEMPLATE.replace(
        '<div id="root"></div>',
        '<noscript><img src="https://example.com/pixel.gif" alt="" /></noscript><div id="root"></div>'
      ),
    });

    expect(html).toContain('<noscript><img src="https://example.com/pixel.gif" alt="" /></noscript>');
    expect(html).not.toContain("You need to enable JavaScript to run this app.");
  });

  it("refuses an app shell without an empty React root", () => {
    expect(() => buildDocumentFor({ template: "<html><head></head><body></body></html>" })).toThrow(TypeError);
    expect(() =>
      buildDocumentFor({ template: '<html><head></head><body><div id="root">already filled</div></body></html>' })
    ).toThrow(TypeError);
  });

  it("leaves a visible page for a crawler that never runs the script", () => {
    const html = buildDocumentFor();
    const bodyText = html
      .replace(/<script[\s\S]*?<\/script>/g, "")
      .replace(/<head>[\s\S]*?<\/head>/, "")
      .replaceAll(/<[^>]*>/g, " ")
      .replaceAll(/\s+/g, " ")
      .trim();

    expect(bodyText).toContain("Escape to a serene four-bedroom private villa");
    expect(bodyText).toContain("Ubud, Indonesia");
    expect(bodyText).toContain("Freezer");
    expect(bodyText).not.toContain("enable JavaScript");
    expect(bodyText.length).toBeGreaterThan(150);
  });
});

describe("which sites get a document at all", () => {
  it("reads the template key from the payload, wherever it sits", () => {
    expect(resolveStaticSiteTemplateKey(buildPublishedSiteRenderPayload())).toBe("panorama-landing");
    expect(resolveStaticSiteTemplateKey({ resolution: { templateKey: "panorama-landing" } })).toBe("panorama-landing");
    expect(resolveStaticSiteTemplateKey(undefined)).toBe("");
  });

  it("says yes only for the template it can mirror", () => {
    expect(canBuildStaticSiteDocument(buildPublishedSiteRenderPayload())).toBe(true);
    ["experience-journey", "trust-signals", ""].forEach((templateKey) => {
      expect(canBuildStaticSiteDocument(buildPublishedSiteRenderPayload({ site: { templateKey } }))).toBe(false);
    });
    expect(canBuildStaticSiteDocument(undefined)).toBe(false);
  });

  it("refuses to assemble a page for a template it cannot mirror", () => {
    expect(() => buildDocumentFor({ site: { templateKey: "experience-journey" } })).toThrow(/Cannot mirror template/);
  });

  it("does not crash when it is called with nothing", () => {
    [undefined, null, {}].forEach((input) => {
      expect(() => buildStaticSiteDocument(input)).toThrow(TypeError);
    });
  });
});
