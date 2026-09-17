import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { toast } from "react-toastify";
import WebsiteDomainPanel from "../domains/WebsiteDomainPanel";
import { fetchWebsiteSiteByPropertyId } from "../services/websiteSiteService";
import {
  WebsiteDomainError,
  connectWebsiteDomain,
  fetchWebsiteDomains,
  promoteWebsiteDomain,
  removeWebsiteDomain,
  verifyWebsiteDomain,
} from "../services/websiteDomainService";

jest.mock("react-toastify", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../services/websiteSiteService", () => ({ fetchWebsiteSiteByPropertyId: jest.fn() }));
jest.mock("../services/websiteDomainService", () => {
  const actual = jest.requireActual("../services/websiteDomainService");
  return {
    ...actual,
    fetchWebsiteDomains: jest.fn(),
    connectWebsiteDomain: jest.fn(),
    verifyWebsiteDomain: jest.fn(),
    removeWebsiteDomain: jest.fn(),
    promoteWebsiteDomain: jest.fn(),
  };
});

const PUBLISHED_SUMMARY = { site: { id: "site-1", status: "PUBLISHED" }, primaryDomain: null, domains: [] };
const FALLBACK = {
  domain: "villa-site1234.direct.domits.com",
  domainType: "FALLBACK",
  status: "ACTIVE",
  isPrimary: true,
  dnsRecord: null,
  dnsVerified: null,
  certificateStatus: null,
  reason: null,
  lastError: null,
  lastCheckedAt: 1,
};
const CUSTOM = {
  domain: "www.example.com",
  domainType: "CUSTOM",
  status: "PENDING",
  isPrimary: false,
  dnsRecord: { type: "CNAME", name: "www.example.com", value: "d3lo.cloudfront.net" },
  dnsVerified: null,
  certificateStatus: "pending-validation",
  reason: "certificate_pending",
  lastError: null,
  lastCheckedAt: Date.UTC(2026, 8, 14, 10, 0, 0),
};

const domainError = (code, message = "") => new WebsiteDomainError({ code, message, status: 409, requestId: "req-1" });

const domainRowOf = (domain) => screen.getAllByRole("listitem").find((item) => within(item).queryByText(domain));

const openPanel = async () => {
  render(<WebsiteDomainPanel propertyId="property-1" />);
  fireEvent.click(screen.getByRole("button", { name: /custom domain/i }));
  await waitFor(() => expect(fetchWebsiteSiteByPropertyId).toHaveBeenCalledWith("property-1"));
};

describe("WebsiteDomainPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchWebsiteSiteByPropertyId.mockResolvedValue(PUBLISHED_SUMMARY);
    fetchWebsiteDomains.mockResolvedValue([FALLBACK]);
    connectWebsiteDomain.mockResolvedValue(CUSTOM);
    verifyWebsiteDomain.mockResolvedValue({
      ...CUSTOM,
      status: "VERIFIED",
      dnsVerified: true,
      certificateStatus: "issued",
    });
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });
  });

  it("loads nothing until the disclosure is opened, then lists the domains with the rules up front", async () => {
    render(<WebsiteDomainPanel propertyId="property-1" />);
    expect(fetchWebsiteSiteByPropertyId).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /custom domain/i }));

    expect(await screen.findByText(FALLBACK.domain)).toBeInTheDocument();
    expect(fetchWebsiteDomains).toHaveBeenCalledWith("site-1");
    expect(screen.getByText(/subdomain such as www\.example\.com/i)).toBeInTheDocument();
    expect(screen.getByText(/one custom domain per website/i)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /your domain/i })).toBeInTheDocument();
  });

  it("asks the host to publish first when the site is not live", async () => {
    fetchWebsiteSiteByPropertyId.mockResolvedValue({ ...PUBLISHED_SUMMARY, site: { id: "site-1", status: "PREVIEW" } });
    await openPanel();

    expect(await screen.findByText(/publish this website first/i)).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /your domain/i })).not.toBeInTheDocument();
    expect(fetchWebsiteDomains).not.toHaveBeenCalled();
  });

  it("lets the host re-check after publishing in another tab", async () => {
    fetchWebsiteSiteByPropertyId
      .mockResolvedValueOnce({ ...PUBLISHED_SUMMARY, site: { id: "site-1", status: "PREVIEW" } })
      .mockResolvedValueOnce(PUBLISHED_SUMMARY);
    await openPanel();
    await screen.findByText(/publish this website first/i);

    fireEvent.click(screen.getByRole("button", { name: /check again/i }));

    expect(await screen.findByText(FALLBACK.domain)).toBeInTheDocument();
    expect(fetchWebsiteSiteByPropertyId).toHaveBeenCalledTimes(2);
  });

  it("shows a verify refusal as a panel notice even though the form is hidden", async () => {
    fetchWebsiteDomains.mockResolvedValue([FALLBACK, CUSTOM]);
    verifyWebsiteDomain.mockRejectedValue(domainError("invalid_domain"));
    await openPanel();
    await screen.findByText("d3lo.cloudfront.net");

    fireEvent.click(screen.getByRole("button", { name: /check again/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/subdomain like www\.example\.com/i);
    expect(screen.queryByRole("textbox", { name: /your domain/i })).not.toBeInTheDocument();
  });

  it("reloads the domains when the server says this website already has one", async () => {
    fetchWebsiteDomains.mockResolvedValueOnce([FALLBACK]).mockResolvedValueOnce([FALLBACK, CUSTOM]);
    connectWebsiteDomain.mockRejectedValue(domainError("domain_limit_reached"));
    await openPanel();
    await screen.findByText(FALLBACK.domain);

    fireEvent.change(screen.getByRole("textbox", { name: /your domain/i }), { target: { value: "www.other.com" } });
    fireEvent.click(screen.getByRole("button", { name: /^connect$/i }));

    expect(await screen.findByText("d3lo.cloudfront.net")).toBeInTheDocument();
    expect(fetchWebsiteDomains).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("alert")).toHaveTextContent(/already has a custom domain/i);
  });

  it("connects a domain and shows the CNAME record with working copy buttons", async () => {
    await openPanel();
    await screen.findByText(FALLBACK.domain);

    fireEvent.change(screen.getByRole("textbox", { name: /your domain/i }), { target: { value: " WWW.Example.com " } });
    fireEvent.click(screen.getByRole("button", { name: /^connect$/i }));

    expect(await screen.findByText("d3lo.cloudfront.net")).toBeInTheDocument();
    expect(connectWebsiteDomain).toHaveBeenCalledWith({ siteId: "site-1", domain: "www.example.com" });
    expect(screen.getByText(/create the cname record/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /check again/i })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /your domain/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /copy value/i }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("d3lo.cloudfront.net"));
    expect(toast.success).toHaveBeenCalled();
  });

  it("rejects an apex domain before calling the server", async () => {
    await openPanel();
    await screen.findByText(FALLBACK.domain);

    fireEvent.change(screen.getByRole("textbox", { name: /your domain/i }), { target: { value: "example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /^connect$/i }));

    expect(screen.getByText(/subdomain like www\.example\.com/i)).toBeInTheDocument();
    expect(connectWebsiteDomain).not.toHaveBeenCalled();
  });

  it("shows a server refusal next to the field", async () => {
    connectWebsiteDomain.mockRejectedValue(domainError("domain_limit_reached"));
    await openPanel();
    await screen.findByText(FALLBACK.domain);

    fireEvent.change(screen.getByRole("textbox", { name: /your domain/i }), { target: { value: "www.other.com" } });
    fireEvent.click(screen.getByRole("button", { name: /^connect$/i }));

    expect(await screen.findByText(/already has a custom domain/i)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /your domain/i })).toBeInTheDocument();
  });

  it("moves the timeline forward after check again", async () => {
    fetchWebsiteDomains.mockResolvedValue([FALLBACK, CUSTOM]);
    await openPanel();
    await screen.findByText("d3lo.cloudfront.net");

    fireEvent.click(screen.getByRole("button", { name: /check again/i }));

    expect(await screen.findByText(/going live/i)).toBeInTheDocument();
    expect(verifyWebsiteDomain).toHaveBeenCalledWith("site-1");
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  it("starts removing a connected domain and swaps the timeline for the removal line", async () => {
    fetchWebsiteDomains.mockResolvedValue([FALLBACK, { ...CUSTOM, status: "ACTIVE", dnsVerified: true }]);
    removeWebsiteDomain.mockResolvedValue({ ...CUSTOM, status: "REMOVING", reason: "removal_requested" });
    await openPanel();
    await screen.findByText("Domain live");

    fireEvent.click(screen.getByRole("button", { name: /remove domain/i }));

    expect(await screen.findByText(/this domain is being removed/i)).toBeInTheDocument();
    expect(removeWebsiteDomain).toHaveBeenCalledWith({ siteId: "site-1", domain: "www.example.com" });
    expect(screen.getByText("www.example.com")).toBeInTheDocument();
    expect(screen.getByText("Removing")).toBeInTheDocument();
    expect(screen.queryByText("Domain live")).not.toBeInTheDocument();
    expect(screen.queryByText("d3lo.cloudfront.net")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove domain/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /check again/i })).toBeInTheDocument();
  });

  it("reloads instead of removing when the shown domain is no longer the stored one", async () => {
    const replacement = {
      ...CUSTOM,
      domain: "www.new.com",
      status: "ACTIVE",
      dnsVerified: true,
      dnsRecord: { ...CUSTOM.dnsRecord, name: "www.new.com" },
    };
    fetchWebsiteDomains
      .mockResolvedValueOnce([FALLBACK, { ...CUSTOM, status: "ACTIVE", dnsVerified: true }])
      .mockResolvedValueOnce([FALLBACK, replacement]);
    removeWebsiteDomain.mockRejectedValue(
      domainError("domain_not_found", "www.example.com is no longer this website's custom domain.")
    );
    await openPanel();
    await screen.findByRole("link", { name: "www.example.com" });

    fireEvent.click(screen.getByRole("button", { name: /remove domain/i }));

    expect(await screen.findByRole("link", { name: "www.new.com" })).toBeInTheDocument();
    expect(removeWebsiteDomain).toHaveBeenCalledWith({ siteId: "site-1", domain: "www.example.com" });
    expect(fetchWebsiteDomains).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("www.example.com")).not.toBeInTheDocument();
    expect(screen.queryByText(/this domain is being removed/i)).not.toBeInTheDocument();
  });

  it("returns to the connect form once check again reports the domain gone", async () => {
    fetchWebsiteDomains.mockResolvedValue([FALLBACK, { ...CUSTOM, status: "REMOVING", reason: "removal_requested" }]);
    verifyWebsiteDomain.mockResolvedValue(null);
    await openPanel();
    await screen.findByText(/this domain is being removed/i);

    fireEvent.click(screen.getByRole("button", { name: /check again/i }));

    expect(await screen.findByRole("textbox", { name: /your domain/i })).toBeInTheDocument();
    expect(screen.queryByText("www.example.com")).not.toBeInTheDocument();
    expect(screen.getByText(FALLBACK.domain)).toBeInTheDocument();
  });

  it("keeps the removal line when the tenant is not rolled out yet", async () => {
    const removing = { ...CUSTOM, status: "REMOVING", reason: "removal_requested" };
    fetchWebsiteDomains.mockResolvedValue([FALLBACK, removing]);
    verifyWebsiteDomain.mockResolvedValue(removing);
    await openPanel();
    await screen.findByText(/this domain is being removed/i);

    fireEvent.click(screen.getByRole("button", { name: /check again/i }));

    await waitFor(() => expect(verifyWebsiteDomain).toHaveBeenCalledWith("site-1"));
    expect(screen.getByText(/press check again in a moment/i)).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /your domain/i })).not.toBeInTheDocument();
  });

  it("tells the host to add the CNAME and press check again while the domain waits for its record", async () => {
    fetchWebsiteDomains.mockResolvedValue([FALLBACK, { ...CUSTOM, reason: "dns_required", certificateStatus: null }]);
    await openPanel();

    expect(await screen.findByText(/then press check again/i)).toBeInTheDocument();
    expect(screen.getByText("d3lo.cloudfront.net")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /check again/i })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /your domain/i })).not.toBeInTheDocument();
  });

  it("explains a failed domain and hides the DNS record", async () => {
    fetchWebsiteDomains.mockResolvedValue([
      FALLBACK,
      { ...CUSTOM, status: "FAILED", reason: "domain_in_use_elsewhere" },
    ]);
    await openPanel();

    expect(await screen.findByText(/already connected to another website or service/i)).toBeInTheDocument();
    expect(screen.queryByText("d3lo.cloudfront.net")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /your domain/i })).not.toBeInTheDocument();
  });

  it("shows a panel notice with a retry when the domain service is unreachable", async () => {
    fetchWebsiteDomains.mockRejectedValueOnce(domainError("sync_failed")).mockResolvedValueOnce([FALLBACK]);
    await openPanel();

    expect(await screen.findByText(/couldn't reach the domain service/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByText(FALLBACK.domain)).toBeInTheDocument();
  });

  it("offers to make a live custom domain the main address and moves the badge once it did", async () => {
    const liveCustom = { ...CUSTOM, status: "ACTIVE", dnsVerified: true, certificateStatus: "issued", reason: null };
    fetchWebsiteDomains.mockResolvedValue([FALLBACK, liveCustom]);
    promoteWebsiteDomain.mockResolvedValue([
      { ...FALLBACK, isPrimary: false },
      { ...liveCustom, isPrimary: true },
    ]);
    await openPanel();
    await screen.findByText("Domain live");
    expect(within(domainRowOf(FALLBACK.domain)).getByText("Main address")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /make main address/i }));

    expect(await within(domainRowOf("www.example.com")).findByText("Main address")).toBeInTheDocument();
    expect(promoteWebsiteDomain).toHaveBeenCalledWith({ siteId: "site-1", domain: "www.example.com" });
    expect(screen.getAllByText("Main address")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /mak(e|ing) main address/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove domain/i })).toBeInTheDocument();
  });

  it("does not offer the main address switch while the custom domain is not live", async () => {
    fetchWebsiteDomains.mockResolvedValue([FALLBACK, CUSTOM]);
    await openPanel();
    await screen.findByText("Pending");

    expect(screen.queryByRole("button", { name: /make main address/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /check again/i })).toBeInTheDocument();
  });

  it("explains a refused switch and keeps the button so the host can retry after check again", async () => {
    const liveCustom = { ...CUSTOM, status: "ACTIVE", dnsVerified: true, certificateStatus: "issued", reason: null };
    fetchWebsiteDomains.mockResolvedValue([FALLBACK, liveCustom]);
    promoteWebsiteDomain.mockRejectedValue(
      domainError("domain_not_active", "www.example.com is no longer live, so it cannot be the main address.")
    );
    await openPanel();
    await screen.findByText("Domain live");

    fireEvent.click(screen.getByRole("button", { name: /make main address/i }));

    expect(await screen.findByText(/only a live domain can be the main address/i)).toBeInTheDocument();
    expect(screen.getByText(/reference: req-1/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /make main address/i })).toBeEnabled();
  });
});
