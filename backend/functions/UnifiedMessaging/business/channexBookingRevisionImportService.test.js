const ChannexBookingRevisionImportService =
  require("../.shared/channelManagement/services/channexBookingRevisionImportService.js").default;

describe("ChannexBookingRevisionImportService", () => {
  test("is importable from the shared ChannelManagement boundary", () => {
    expect(typeof ChannexBookingRevisionImportService).toBe("function");
  });
});
