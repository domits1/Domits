jest.mock("../../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import ChannelManagementSchemaRepository from "../../.shared/channelManagement/repositories/channelManagementSchemaRepository.js";
import { mockClient } from "./support/outboxTestSupport.js";

describe("ChannelManagementSchemaRepository.inspect", () => {
  test("only reports indexes that finished building, since an ASYNC index is listed before it is usable", async () => {
    const client = mockClient([]);

    await new ChannelManagementSchemaRepository().inspect();

    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toContain("indisvalid");
    expect(params).toEqual(["main"]);
  });
});
