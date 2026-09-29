jest.mock("../../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import ChannexAriOutboxWriter, {
  buildForwardSyncRange,
} from "../../.shared/channelManagement/services/channexAriOutboxWriter.js";

const NOW = Date.UTC(2026, 9, 1, 12); // 1 October 2026, 12:00 UTC

const buildManager = (mappedCount = 1) => {
  const builder = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(mappedCount),
  };
  return { builder, getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => builder) })) };
};

const buildWriter = () => {
  const outbox = { insert: jest.fn().mockResolvedValue(undefined) };
  return { outbox, writer: new ChannexAriOutboxWriter({ outbox, now: () => NOW }) };
};

const change = (overrides = {}) => ({
  domitsPropertyId: "property-1",
  changeTypes: ["availability"],
  dateFrom: "2026-10-05",
  dateTo: "2026-10-08",
  source: "CALENDAR",
  ...overrides,
});

describe("ChannexAriOutboxWriter.enqueueChannexAriChange", () => {
  test("writes a PENDING change row with integer dates, using the caller's transaction", async () => {
    const manager = buildManager();
    const { outbox, writer } = buildWriter();

    await expect(writer.enqueueChannexAriChange(manager, change())).resolves.toBe(true);

    expect(outbox.insert).toHaveBeenCalledWith(manager, {
      domitsPropertyId: "property-1",
      kind: "CHANGE",
      changeTypes: ["availability"],
      dateFrom: 20261005,
      dateTo: 20261008,
      source: "CALENDAR",
      now: NOW,
    });
  });

  test("writes nothing for a property that is not mapped to Channex", async () => {
    const { outbox, writer } = buildWriter();

    await expect(writer.enqueueChannexAriChange(buildManager(0), change())).resolves.toBe(false);
    expect(outbox.insert).not.toHaveBeenCalled();
  });

  test("only counts active mappings on a Channex account", async () => {
    const manager = buildManager();
    const { writer } = buildWriter();

    await writer.enqueueChannexAriChange(manager, change());

    expect(manager.builder.where).toHaveBeenCalledWith("p.domitsPropertyId = :d", { d: "property-1" });
    expect(manager.builder.andWhere).toHaveBeenCalledWith("p.status = :s", { s: "ACTIVE" });
    expect(manager.builder.andWhere).toHaveBeenCalledWith("a.channel = :c", { c: "CHANNEX" });
  });

  test("moves a start date in the past up to today, because Channex refuses past dates", async () => {
    const { outbox, writer } = buildWriter();

    await writer.enqueueChannexAriChange(buildManager(), change({ dateFrom: "2026-09-20", dateTo: "2026-10-03" }));

    expect(outbox.insert).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ dateFrom: 20261001, dateTo: 20261003 }));
  });

  test("writes nothing when the whole range is in the past, without reading the mapping", async () => {
    const manager = buildManager();
    const { outbox, writer } = buildWriter();

    await expect(
      writer.enqueueChannexAriChange(manager, change({ dateFrom: "2026-09-20", dateTo: "2026-09-30" }))
    ).resolves.toBe(false);
    expect(manager.getRepository).not.toHaveBeenCalled();
    expect(outbox.insert).not.toHaveBeenCalled();
  });

  test("writes nothing when there are no change types", async () => {
    const manager = buildManager();
    const { outbox, writer } = buildWriter();

    await expect(writer.enqueueChannexAriChange(manager, change({ changeTypes: [] }))).resolves.toBe(false);
    expect(manager.getRepository).not.toHaveBeenCalled();
    expect(outbox.insert).not.toHaveBeenCalled();
  });
});

describe("buildForwardSyncRange", () => {
  test("covers today and the next 499 days", () => {
    expect(buildForwardSyncRange(NOW)).toEqual({ dateFrom: "2026-10-01", dateTo: "2028-02-12" });
  });
});
