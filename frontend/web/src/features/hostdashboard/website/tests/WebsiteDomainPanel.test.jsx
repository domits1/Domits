import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "react-toastify";
import WebsiteDomainPanel from "../domains/WebsiteDomainPanel";
import { fetchWebsiteSiteByPropertyId } from "../services/websiteSiteService";
import {
  WebsiteDomainError,
  connectWebsiteDomain,
  fetchWebsiteDomains,
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
});
