jest.mock("../../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import ChannexAriOutboxRepository from "../../.shared/channelManagement/repositories/channexAriOutboxRepository.js";
import { mockClient } from "./support/outboxTestSupport.js";

// Design note D7 (#506): an active OTA shows "Syncing…" while the listing still has changes on the way.
describe("ChannexAriOutboxRepository.hasWaitingRows", () => {
  test.each([
    ["1", true],
    ["0", false],
  ])("with %p waiting rows for the listing it answers %p", async (count, expected) => {
    const client = mockClient();
    client.query.mockResolvedValue([{ waiting: count }]);

    await expect(new ChannexAriOutboxRepository().hasWaitingRows("listing-1")).resolves.toBe(expected);
  });

  test("counts PENDING and PROCESSING rows of that one listing", async () => {
    const client = mockClient();
    client.query.mockResolvedValue([{ waiting: "0" }]);

    await new ChannexAriOutboxRepository().hasWaitingRows("listing-1");

    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toMatch(/domitspropertyid = \$1/);
    expect(sql).toMatch(/status IN \(\$2, \$3\)/);
    expect(params).toEqual(["listing-1", "PENDING", "PROCESSING"]);
  });
});
