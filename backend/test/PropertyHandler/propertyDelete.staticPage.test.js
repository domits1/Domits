import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import { StaticPageWithdrawal } from "../../functions/PropertyHandler/business/service/staticPageWithdrawal.js";
import { StaticPageStore } from "../../functions/PropertyHandler/data/repository/staticPageStore.js";

const HOST = "finca-los-olivos-1a2b3c4d.direct.domits.com";
const PAGE_KEY = `sites/by-host/${HOST}/index.html`;
const SITEMAP_KEY = `sites/by-host/${HOST}/sitemap.xml`;

const buildS3 = (calls, { failSitemapWrites = 0 } = {}) => {
  let remainingFailures = failSitemapWrites;
  return {
    send: jest.fn(async (command) => {
      calls.push(`${command.constructor.name} ${command.input.Key}`);
      if (command.constructor.name === "PutObjectCommand" && remainingFailures > 0) {
        remainingFailures -= 1;
        throw new Error("S3 is unavailable");
      }
      return {};
    }),
  };
};

const buildController = ({ site = { id: "site-1" }, bookingCount = 0, failSitemapWrites = 0 } = {}) => {
  const calls = [];
  const s3 = buildS3(calls, { failSitemapWrites });
  const controller = new PropertyController();
  const service = controller.propertyService;
  let deleted = false;
  controller.authManager = { authorizeOwnerRequest: jest.fn(async () => "host-1") };
  service.getBasePropertyInfo = jest.fn(async () => (deleted ? null : { id: "property-1" }));
  service.propertyDeletionRepository = {
    getBookingCountByPropertyId: jest.fn(async () => bookingCount),
    deletePropertyById: jest.fn(async () => {
      calls.push("delete rows");
      deleted = true;
    }),
  };
  service.updatePropertyStatus = jest.fn(async () => calls.push("archive"));
  service.propertyImageRepository = { deleteImagesByPropertyId: jest.fn(async () => calls.push("delete images")) };
  service.directBookingWebsiteSiteRepository = { getSiteByPropertyIdAndHostId: jest.fn(async () => site) };
  service.createStaticPageWithdrawal = () =>
    new StaticPageWithdrawal({
      pageStore: new StaticPageStore({ client: s3 }),
      tenantRepository: {
        getTenantByDomain: jest.fn(async () => null),
        listTenantsForDistribution: jest.fn(async () => [{ id: "dt_wildcard", domains: ["*.direct.domits.com"] }]),
        createInvalidation: jest.fn(async () => {
          calls.push("invalidate");
          return "I1";
        }),
      },
      domainRepository: { listDomainsBySiteId: jest.fn(async () => [{ domain: HOST }]) },
      distributionId: "E18DIST",
    });
  const remove = (body = { propertyId: "property-1" }) =>
    controller.delete({ headers: { Authorization: "token" }, body: JSON.stringify(body) });
  return { controller, service, calls, remove };
};

describe("deleting a listing takes its static page offline first", () => {
  beforeEach(() => {
    process.env.DIRECT_BOOKING_WEBSITE_SITES_BUCKET = "sites-bucket-under-test";
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("removes the page and empties the sitemap of the host's own site before any image or row is deleted", async () => {
    const { service, calls, remove } = buildController();

    const response = await remove({ propertyId: "property-1", hostId: "someone-else" });

    expect(response.statusCode).toBe(204);
    expect(service.directBookingWebsiteSiteRepository.getSiteByPropertyIdAndHostId).toHaveBeenCalledWith(
      "property-1",
      "host-1"
    );
    expect(calls).toEqual([
      `DeleteObjectCommand ${PAGE_KEY}`,
      `PutObjectCommand ${SITEMAP_KEY}`,
      "invalidate",
      "delete images",
      "delete rows",
    ]);
  });

  it("refuses the deletion with a 503 when the sitemap cannot be emptied after the page was removed, and deletes nothing", async () => {
    const { service, calls, remove } = buildController({ failSitemapWrites: 1 });

    const response = await remove();

    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body)).toBe(
      "The website of this listing could not be taken offline, so the listing was not deleted. Please try again in a few minutes."
    );
    expect(calls).toEqual([`DeleteObjectCommand ${PAGE_KEY}`, `PutObjectCommand ${SITEMAP_KEY}`]);
    expect(service.propertyDeletionRepository.deletePropertyById).not.toHaveBeenCalled();

    const retry = await remove();

    expect(retry.statusCode).toBe(204);
    expect(calls.slice(2)).toEqual([
      `DeleteObjectCommand ${PAGE_KEY}`,
      `PutObjectCommand ${SITEMAP_KEY}`,
      "invalidate",
      "delete images",
      "delete rows",
    ]);
  });

  it("deletes a listing without a website without touching the bucket", async () => {
    const { calls, remove } = buildController({ site: null });

    expect((await remove()).statusCode).toBe(204);
    expect(calls).toEqual(["delete images", "delete rows"]);
  });

  it("archives a listing with booking history without looking up or withdrawing its website", async () => {
    const { service, calls, remove } = buildController({ bookingCount: 2 });

    expect((await remove()).statusCode).toBe(200);
    expect(calls).toEqual(["archive"]);
    expect(service.directBookingWebsiteSiteRepository.getSiteByPropertyIdAndHostId).not.toHaveBeenCalled();
  });
});
