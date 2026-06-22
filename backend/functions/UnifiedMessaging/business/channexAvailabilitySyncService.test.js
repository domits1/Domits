const ChannexAvailabilitySyncService =
  require("../.shared/channelManagement/services/channexAvailabilitySyncService.js").default;

describe("ChannexAvailabilitySyncService", () => {
  test("is importable from the shared ChannelManagement boundary", () => {
    expect(typeof ChannexAvailabilitySyncService).toBe("function");
  });
});
