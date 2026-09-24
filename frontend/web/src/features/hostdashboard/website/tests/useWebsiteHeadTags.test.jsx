import React from "react";
import { render } from "@testing-library/react";
import { useWebsiteHeadTags } from "../seo/useWebsiteHeadTags";
import { isWebsitePublicSitePageActive } from "../seo/websiteHeadTagsRegistry";

const MARKETPLACE_TITLE = "Domits - Holiday rentals, campers, boats and more...";
const MARKETPLACE_DESCRIPTION = "Explore the perfect holiday rental on Domits.";

const HeadTagsHarness = ({ headKey, tags }) => {
  useWebsiteHeadTags({ key: headKey, tags });
  return null;
};

const buildTags = (title, description, image) => ({
  title,
  metaByName: { description },
  metaByProperty: {
    "og:type": "website",
    "og:title": title,
    "og:description": description,
    "og:image": image,
  },
});

const readMetaContent = (attributeName, attributeValue) =>
  document.head.querySelector(`meta[${attributeName}="${attributeValue}"]`)?.getAttribute("content") ?? null;

describe("useWebsiteHeadTags", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.title = MARKETPLACE_TITLE;

    const descriptionElement = document.createElement("meta");
    descriptionElement.setAttribute("name", "description");
    descriptionElement.setAttribute("content", MARKETPLACE_DESCRIPTION);
    document.head.append(descriptionElement);
  });

  it("updates the existing description instead of adding a second one", () => {
    render(<HeadTagsHarness headKey="site-a" tags={buildTags("Villa A", "Description A", "https://img/a.jpg")} />);

    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(readMetaContent("name", "description")).toBe("Description A");
    expect(readMetaContent("property", "og:title")).toBe("Villa A");
    expect(document.title).toBe("Villa A");
  });

  it("keeps valid tags while the same site refreshes", () => {
    const { rerender } = render(
      <HeadTagsHarness headKey="site-a" tags={buildTags("Villa A", "Description A", "https://img/a.jpg")} />
    );

    rerender(<HeadTagsHarness headKey="site-a" tags={null} />);

    expect(document.title).toBe("Villa A");
    expect(readMetaContent("name", "description")).toBe("Description A");
    expect(readMetaContent("property", "og:image")).toBe("https://img/a.jpg");
  });

  it("clears the previous tags when another site takes over while loading", () => {
    const { rerender } = render(
      <HeadTagsHarness headKey="site-a" tags={buildTags("Villa A", "Description A", "https://img/a.jpg")} />
    );

    rerender(<HeadTagsHarness headKey="site-b" tags={null} />);

    expect(document.title).toBe(MARKETPLACE_TITLE);
    expect(readMetaContent("name", "description")).toBe(MARKETPLACE_DESCRIPTION);
    expect(document.head.querySelector('meta[property="og:title"]')).toBeNull();
  });

  it("replaces the tags when another site loads", () => {
    const { rerender } = render(
      <HeadTagsHarness headKey="site-a" tags={buildTags("Villa A", "Description A", "https://img/a.jpg")} />
    );

    rerender(<HeadTagsHarness headKey="site-b" tags={buildTags("Villa B", "Description B", "https://img/b.jpg")} />);

    expect(document.title).toBe("Villa B");
    expect(readMetaContent("name", "description")).toBe("Description B");
    expect(readMetaContent("property", "og:image")).toBe("https://img/b.jpg");
    expect(document.head.querySelectorAll('meta[property="og:image"]')).toHaveLength(1);
  });

  it("goes from success to failure to success without leaking open graph tags", () => {
    const { rerender } = render(
      <HeadTagsHarness headKey="site-a" tags={buildTags("Villa A", "Description A", "https://img/a.jpg")} />
    );

    rerender(
      <HeadTagsHarness
        headKey="site-a"
        tags={{ title: "Villa A", metaByName: { robots: "noindex, nofollow" }, metaByProperty: {} }}
      />
    );

    expect(readMetaContent("name", "robots")).toBe("noindex, nofollow");
    expect(document.head.querySelector('meta[property="og:title"]')).toBeNull();
    expect(readMetaContent("name", "description")).toBe(MARKETPLACE_DESCRIPTION);

    rerender(<HeadTagsHarness headKey="site-a" tags={buildTags("Villa A", "Description A", "https://img/a.jpg")} />);

    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
    expect(readMetaContent("property", "og:title")).toBe("Villa A");
    expect(readMetaContent("name", "description")).toBe("Description A");
  });

  it("restores the original head when it leaves, after a site change", () => {
    const { rerender, unmount } = render(
      <HeadTagsHarness headKey="site-a" tags={buildTags("Villa A", "Description A", "https://img/a.jpg")} />
    );

    rerender(<HeadTagsHarness headKey="site-b" tags={buildTags("Villa B", "Description B", "https://img/b.jpg")} />);
    unmount();

    expect(document.title).toBe(MARKETPLACE_TITLE);
    expect(readMetaContent("name", "description")).toBe(MARKETPLACE_DESCRIPTION);
    expect(document.head.querySelector('meta[property="og:title"]')).toBeNull();
    expect(document.head.querySelector('meta[property="og:image"]')).toBeNull();
    expect(document.head.querySelectorAll("meta")).toHaveLength(1);
  });

  it("is already active when a parent effect runs, so the parent can stand down", () => {
    const observedByParent = [];

    const ParentHarness = () => {
      React.useEffect(() => {
        observedByParent.push(isWebsitePublicSitePageActive());
      });

      return <HeadTagsHarness headKey="site-a" tags={null} />;
    };

    render(<ParentHarness />);

    expect(observedByParent).toEqual([true]);
  });

  it("reports the page as active only while it is mounted", () => {
    expect(isWebsitePublicSitePageActive()).toBe(false);

    const { unmount } = render(<HeadTagsHarness headKey="site-a" tags={null} />);
    expect(isWebsitePublicSitePageActive()).toBe(true);

    unmount();
    expect(isWebsitePublicSitePageActive()).toBe(false);
  });
});
