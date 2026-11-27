import { CHANNEL_LABEL, channelDisplayLabel } from "../../.shared/channelManagement/utils/channelDisplayLabel.js";

// Design note D7 (#506): what the host sees per OTA. Channex says whether the channel is active;
// the outbox says whether Domits still has changes waiting for the listing. "Disconnecting…" and
// "Needs attention" need Domits' own channel row, which comes with disconnect (D5).
describe("channelDisplayLabel", () => {
  test.each([
    [{ isActive: true, pendingOutbox: true }, CHANNEL_LABEL.SYNCING],
    [{ isActive: true, pendingOutbox: false }, CHANNEL_LABEL.LIVE],
    [{ isActive: false, pendingOutbox: false }, CHANNEL_LABEL.DISCONNECTED],
    // An inactive channel sells nothing, whatever Domits still has to send.
    [{ isActive: false, pendingOutbox: true }, CHANNEL_LABEL.DISCONNECTED],
  ])("%p is %p", (input, label) => {
    expect(channelDisplayLabel(input)).toBe(label);
  });

  // Unknown is never shown as Live: when Channex did not answer, the host must not think the OTA sells.
  test.each([[{}], [{ isActive: null, pendingOutbox: false }], [{ isActive: "yes", pendingOutbox: false }]])(
    "an unknown channel state %p is UNKNOWN",
    (input) => {
      expect(channelDisplayLabel(input)).toBe(CHANNEL_LABEL.UNKNOWN);
    }
  );

  test("the labels are the ones the frontend contract names", () => {
    expect(Object.values(CHANNEL_LABEL).sort()).toEqual(["DISCONNECTED", "LIVE", "SYNCING", "UNKNOWN"]);
  });
});
