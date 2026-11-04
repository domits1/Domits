import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PropertyService } from "../../functions/PropertyHandler/business/service/propertyService.js";
import { NotFoundException } from "../../functions/PropertyHandler/util/exception/NotFoundException.js";
import { TypeException } from "../../functions/PropertyHandler/util/exception/TypeException.js";
import { PROPERTY_STATUS } from "../../functions/PropertyHandler/util/propertyStatus.js";
import {
  decodeReviewQueueCursor,
  encodeReviewQueueCursor,
} from "../../functions/PropertyHandler/util/reviewQueueCursor.js";

const buildPage = (ids, { hasMore = false } = {}) => ({
  identifiers: ids,
  hasMore,
  lastKey: ids.length ? { updatedAt: ids.length * 10, id: ids[ids.length - 1] } : null,
});

const buildService = ({ page = buildPage([]), getCard } = {}) => {
  const service = new PropertyService();
  service.directBookingWebsiteSiteRepository = {};
  service.propertyRepository = {
    getPropertiesByStatusOldestFirst: jest.fn(async () => page),
  };
  service.getCardPropertyAttributes = jest.fn(getCard || (async (id) => ({ property: { id, hostId: "host-1", status: PROPERTY_STATUS.PENDING_REVIEW } })));
  service.getBasePropertyInfo = jest.fn(async (id) => ({ id }));
  return service;
};

const repoCall = (service) => service.propertyRepository.getPropertiesByStatusOldestFirst.mock.calls[0];

describe("PropertyService.getReviewQueue", () => {
  it("returns an empty list and no next cursor when nothing is pending", async () => {
    const service = buildService();

    await expect(service.getReviewQueue({})).resolves.toEqual({ properties: [], nextCursor: null });
    expect(service.getCardPropertyAttributes).not.toHaveBeenCalled();
  });

  it("asks the repository for PENDING_REVIEW only", async () => {
    const service = buildService();

    await service.getReviewQueue({});

    expect(repoCall(service)[0]).toBe(PROPERTY_STATUS.PENDING_REVIEW);
  });

  it("builds one card per identifier and keeps the repository order", async () => {
    const service = buildService({ page: buildPage(["c", "a", "b"]) });

    const result = await service.getReviewQueue({});

    expect(result.properties.map((card) => card.property.id)).toEqual(["c", "a", "b"]);
  });

  it("keeps the repository order even when later cards resolve first", async () => {
    const delays = { a: 30, b: 0, c: 10 };
    const service = buildService({
      page: buildPage(["a", "b", "c"]),
      getCard: (id) => new Promise((resolve) => setTimeout(() => resolve({ property: { id, status: PROPERTY_STATUS.PENDING_REVIEW } }), delays[id])),
    });

    const result = await service.getReviewQueue({});

    expect(result.properties.map((card) => card.property.id)).toEqual(["a", "b", "c"]);
  });

  it("passes the host id through on each card and looks up no host names", async () => {
    const service = buildService({ page: buildPage(["a"]) });

    const result = await service.getReviewQueue({});

    expect(result.properties[0].property.hostId).toBe("host-1");
  });

  it("returns a next cursor encoded from the last key when the repository has more", async () => {
    const service = buildService({ page: buildPage(["a", "b"], { hasMore: true }) });

    const result = await service.getReviewQueue({});

    expect(decodeReviewQueueCursor(result.nextCursor)).toEqual({ updatedAt: 20, id: "b" });
  });

  it("returns a null next cursor on the last page", async () => {
    const service = buildService({ page: buildPage(["a", "b"], { hasMore: false }) });

    const result = await service.getReviewQueue({});

    expect(result.nextCursor).toBeNull();
  });

  it("starts from the beginning when no cursor is given", async () => {
    const service = buildService();

    await service.getReviewQueue({});

    expect(repoCall(service)[1].after).toBeUndefined();
  });

  it.each(["", "   "])("treats the blank cursor %j as the first page", async (cursor) => {
    const service = buildService();

    await service.getReviewQueue({ cursor });

    expect(repoCall(service)[1].after).toBeUndefined();
  });

  it("hands the decoded cursor to the repository", async () => {
    const service = buildService();
    const cursor = encodeReviewQueueCursor({ updatedAt: 1_800_000_000_000, id: "property-7" });

    await service.getReviewQueue({ cursor });

    expect(repoCall(service)[1].after).toEqual({ updatedAt: 1_800_000_000_000, id: "property-7" });
  });

  it.each([
    ["not base64url", "not a cursor!"],
    ["a number", 5],
    ["valid base64url that is not a cursor", Buffer.from("{}", "utf8").toString("base64url")],
  ])("rejects a cursor that is %s with a 400 before any repository call", async (_name, cursor) => {
    const service = buildService();

    const error = await service.getReviewQueue({ cursor }).catch((caught) => caught);

    expect(error).toBeInstanceOf(TypeException);
    expect(error.statusCode).toBe(400);
    expect(service.propertyRepository.getPropertiesByStatusOldestFirst).not.toHaveBeenCalled();
    expect(service.getCardPropertyAttributes).not.toHaveBeenCalled();
  });

  it.each([
    [undefined, 25],
    ["abc", 25],
    ["0", 1],
    ["10", 10],
    ["50", 50],
    ["500", 50],
  ])("turns the limit %j into %i for the repository", async (limit, expected) => {
    const service = buildService();

    await service.getReviewQueue({ limit });

    expect(repoCall(service)[1].limit).toBe(expected);
  });

  it("skips a property that vanished and keeps the others in order", async () => {
    const service = buildService({
      page: buildPage(["a", "gone", "c"]),
      getCard: async (id) => {
        if (id === "gone") {
          throw new NotFoundException("Property gone not found.");
        }
        return { property: { id, status: PROPERTY_STATUS.PENDING_REVIEW } };
      },
    });
    service.getBasePropertyInfo = jest.fn(async (id) => (id === "gone" ? null : { id }));

    const result = await service.getReviewQueue({});

    expect(result.properties.map((card) => card.property.id)).toEqual(["a", "c"]);
  });

  it("drops a card whose property is no longer pending review", async () => {
    const service = buildService({
      page: buildPage(["a", "approved", "c"]),
      getCard: async (id) => ({
        property: { id, status: id === "approved" ? PROPERTY_STATUS.ACTIVE : PROPERTY_STATUS.PENDING_REVIEW },
      }),
    });

    const result = await service.getReviewQueue({});

    expect(result.properties.map((card) => card.property.id)).toEqual(["a", "c"]);
  });

  it("still returns the next cursor when every property on the page vanished", async () => {
    const service = buildService({
      page: buildPage(["gone"], { hasMore: true }),
      getCard: async () => {
        throw new NotFoundException("Property gone not found.");
      },
    });
    service.getBasePropertyInfo = jest.fn(async () => null);

    const result = await service.getReviewQueue({});

    expect(result.properties).toEqual([]);
    expect(decodeReviewQueueCursor(result.nextCursor)).toEqual({ updatedAt: 10, id: "gone" });
  });

  it("does not hide a pending property whose card is incomplete: it rethrows when the property still exists", async () => {
    const notFound = new NotFoundException("Property type not found.");
    const service = buildService({
      page: buildPage(["a", "broken"]),
      getCard: async (id) => {
        if (id === "broken") {
          throw notFound;
        }
        return { property: { id, status: PROPERTY_STATUS.PENDING_REVIEW } };
      },
    });

    await expect(service.getReviewQueue({})).rejects.toBe(notFound);
  });

  it("does not swallow errors other than NotFoundException", async () => {
    const failure = new Error("database down");
    const service = buildService({
      page: buildPage(["a"]),
      getCard: async () => {
        throw failure;
      },
    });

    await expect(service.getReviewQueue({})).rejects.toBe(failure);
    expect(service.getBasePropertyInfo).not.toHaveBeenCalled();
  });

  describe("chunking", () => {
    let inFlight;
    let peakInFlight;
    let service;

    beforeEach(() => {
      inFlight = 0;
      peakInFlight = 0;
      const ids = Array.from({ length: 25 }, (_value, index) => `p${index}`);
      service = buildService({
        page: buildPage(ids),
        getCard: async (id) => {
          inFlight += 1;
          peakInFlight = Math.max(peakInFlight, inFlight);
          await new Promise((resolve) => setTimeout(resolve, 1));
          inFlight -= 1;
          return { property: { id, status: PROPERTY_STATUS.PENDING_REVIEW } };
        },
      });
    });

    it("never builds more than 5 cards at the same time", async () => {
      await service.getReviewQueue({ limit: 25 });

      expect(peakInFlight).toBe(5);
    });

    it("builds every card exactly once, in order, across chunks", async () => {
      const result = await service.getReviewQueue({ limit: 25 });

      expect(result.properties.map((card) => card.property.id)).toEqual(
        Array.from({ length: 25 }, (_value, index) => `p${index}`)
      );
      expect(service.getCardPropertyAttributes).toHaveBeenCalledTimes(25);
    });
  });
});

describe("PropertyService.getFullPropertyForReview", () => {
  let service;

  beforeEach(() => {
    service = new PropertyService();
    service.directBookingWebsiteSiteRepository = {};
    service.getBasePropertyInfo = jest.fn();
    service.getFullPropertyAttributesWithFullLocation = jest.fn(async (id) => ({ property: { id } }));
  });

  it("throws a 404 and loads nothing else when the property does not exist", async () => {
    service.getBasePropertyInfo.mockResolvedValue(null);

    const error = await service.getFullPropertyForReview("missing").catch((caught) => caught);

    expect(error).toBeInstanceOf(NotFoundException);
    expect(error.statusCode).toBe(404);
    expect(service.getFullPropertyAttributesWithFullLocation).not.toHaveBeenCalled();
  });

  it.each(Object.values(PROPERTY_STATUS))("returns the full property with its full location when it is %s", async (status) => {
    service.getBasePropertyInfo.mockResolvedValue({ id: "property-1", status });

    const result = await service.getFullPropertyForReview("property-1");

    expect(result).toEqual({ property: { id: "property-1" } });
    expect(service.getFullPropertyAttributesWithFullLocation).toHaveBeenCalledWith("property-1");
  });

  it("does not ask for calendar availability", async () => {
    service.getBasePropertyInfo.mockResolvedValue({ id: "property-1", status: "PENDING_REVIEW" });

    await service.getFullPropertyForReview("property-1");

    expect(service.getFullPropertyAttributesWithFullLocation.mock.calls[0]).toHaveLength(1);
  });
});
