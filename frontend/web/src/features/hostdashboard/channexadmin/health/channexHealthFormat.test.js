import { describeReason } from "./channexHealthFormat";

describe("describeReason", () => {
  test.each([
    [{ code: "CRITICAL_ALARM", alarm: "channex-webhook-errors" }, "Critical alarm: channex-webhook-errors"],
    [{ code: "WARNING_ALARM", alarm: "channex-webhook-rejected" }, "Warning alarm: channex-webhook-rejected"],
    [{ code: "ALARMS_UNAVAILABLE" }, "Alarm states could not be read"],
    [{ code: "ALARM_MISSING", alarm: "channex-webhook-missed" }, "Alarm not found in CloudWatch: channex-webhook-missed"],
    [{ code: "FAILED_CHANGES", count: 1 }, "1 failed change in the last 24 hours"],
    [{ code: "FAILED_CHANGES", count: 2 }, "2 failed changes in the last 24 hours"],
    [{ code: "STUCK_QUEUE", waitingMs: 9 * 60 * 1000 }, "Oldest change waiting 9 min"],
    [{ code: "RECONNECT_REQUIRED", count: 1 }, "1 account needs to reconnect"],
    [{ code: "RECONNECT_REQUIRED", count: 2 }, "2 accounts need to reconnect"],
    [{ code: "POLL_FAILED" }, "Last booking poll failed"],
  ])("%o reads as %p", (reason, sentence) => {
    expect(describeReason(reason)).toBe(sentence);
  });

  test("shows an unknown code as it is, so a reason added later in the backend is not hidden", () => {
    expect(describeReason({ code: "SOMETHING_NEW" })).toBe("SOMETHING_NEW");
  });
});
