import {
  SCHEDULE_OPTIONS,
  buildSchedulePayload,
  describeSchedule,
  optionFromRule,
  ruleFromOption,
  timeOfDayHint,
} from "./scheduleOptions";

const form = (patch) => ({ scheduleOption: "BOOKING_PAID", offsetAmount: 0, offsetUnit: "MINUTES", sendTime: "", ...patch });

describe("schedule options", () => {
  test("lists the six options in the order the host reads them", () => {
    expect(SCHEDULE_OPTIONS.map(({ label }) => label)).toEqual([
      "Booking paid",
      "Before check-in",
      "On check-in day",
      "After check-in",
      "Before check-out",
      "After check-out",
    ]);
  });

  test.each([
    [undefined, "BOOKING_PAID"],
    [null, "BOOKING_PAID"],
    [{}, "BOOKING_PAID"],
    [{ triggerType: "BOOKING_PAID", offsetDirection: null, offsetAmount: 2 }, "BOOKING_PAID"],
    [{ triggerType: "CHECK_IN", offsetDirection: "BEFORE", offsetAmount: 3 }, "BEFORE_CHECK_IN"],
    [{ triggerType: "CHECK_IN", offsetDirection: "AFTER", offsetAmount: 0 }, "ON_CHECK_IN"],
    [{ triggerType: "CHECK_IN", offsetDirection: null, offsetAmount: 0 }, "ON_CHECK_IN"],
    [{ triggerType: "CHECK_IN", offsetDirection: "AFTER", offsetAmount: 2 }, "AFTER_CHECK_IN"],
    [{ triggerType: "CHECK_OUT", offsetDirection: "BEFORE", offsetAmount: 1 }, "BEFORE_CHECK_OUT"],
    [{ triggerType: "CHECK_OUT", offsetDirection: "AFTER", offsetAmount: 0 }, "AFTER_CHECK_OUT"],
  ])("reads the stored rule %j as %s", (rule, option) => {
    expect(optionFromRule(rule)).toBe(option);
  });

  test("every rule the API allows maps to an option that stores the same trigger and direction", () => {
    const triggers = ["CHECK_IN", "CHECK_OUT"];
    const directions = ["BEFORE", "AFTER"];
    const amounts = [0, 1, 365];

    for (const triggerType of triggers) {
      for (const offsetDirection of directions) {
        for (const offsetAmount of amounts) {
          const stored = { triggerType, offsetDirection, offsetAmount };
          expect(ruleFromOption(optionFromRule(stored))).toEqual({ triggerType, offsetDirection });
        }
      }
    }
    expect(ruleFromOption(optionFromRule({ triggerType: "BOOKING_PAID", offsetDirection: "AFTER" }))).toEqual({
      triggerType: "BOOKING_PAID",
      offsetDirection: null,
    });
  });

  describe("buildSchedulePayload", () => {
    test("sends a booking-paid rule without a direction or a time", () => {
      expect(
        buildSchedulePayload(form({ offsetAmount: "2", offsetUnit: "HOURS", sendTime: "10:00" }))
      ).toEqual({ triggerType: "BOOKING_PAID", offsetDirection: null, offsetAmount: 2, offsetUnit: "HOURS", sendTime: null });
    });

    test("keeps a time of day with days", () => {
      expect(
        buildSchedulePayload(
          form({ scheduleOption: "BEFORE_CHECK_IN", offsetAmount: "3", offsetUnit: "DAYS", sendTime: "10:00" })
        )
      ).toEqual({ triggerType: "CHECK_IN", offsetDirection: "BEFORE", offsetAmount: 3, offsetUnit: "DAYS", sendTime: "10:00" });
    });

    test("drops the time of day with hours or minutes", () => {
      const payload = buildSchedulePayload(
        form({ scheduleOption: "AFTER_CHECK_OUT", offsetAmount: "2", offsetUnit: "HOURS", sendTime: "10:00" })
      );

      expect(payload).toMatchObject({ triggerType: "CHECK_OUT", offsetDirection: "AFTER", offsetUnit: "HOURS", sendTime: null });
    });

    test("on the check-in day the amount is zero and the time of day is kept", () => {
      expect(
        buildSchedulePayload(form({ scheduleOption: "ON_CHECK_IN", offsetAmount: "4", offsetUnit: "DAYS", sendTime: "09:30" }))
      ).toEqual({ triggerType: "CHECK_IN", offsetDirection: "AFTER", offsetAmount: 0, offsetUnit: "MINUTES", sendTime: "09:30" });
    });

    test("an empty time of day is sent as none", () => {
      expect(buildSchedulePayload(form({ scheduleOption: "BEFORE_CHECK_OUT", offsetAmount: 1, offsetUnit: "DAYS" })).sendTime).toBeNull();
    });
  });

  describe("describeSchedule", () => {
    test.each([
      [form({ offsetAmount: 0 }), "As soon as the booking is paid"],
      [form({ offsetAmount: 2, offsetUnit: "HOURS" }), "2 hours after the booking is paid"],
      [form({ offsetAmount: 1, offsetUnit: "DAYS" }), "1 day after the booking is paid"],
      [
        form({ scheduleOption: "BEFORE_CHECK_IN", offsetAmount: 3, offsetUnit: "DAYS", sendTime: "10:00" }),
        "3 days before check-in, at 10:00 (Amsterdam time)",
      ],
      [
        form({ scheduleOption: "BEFORE_CHECK_IN", offsetAmount: 3, offsetUnit: "DAYS" }),
        "3 days before check-in, at the property's check-in time (Amsterdam time)",
      ],
      [
        form({ scheduleOption: "AFTER_CHECK_OUT", offsetAmount: 1, offsetUnit: "DAYS", sendTime: "09:00" }),
        "1 day after check-out, at 09:00 (Amsterdam time)",
      ],
      [form({ scheduleOption: "AFTER_CHECK_IN", offsetAmount: 30, offsetUnit: "MINUTES" }), "30 minutes after check-in"],
      [
        form({ scheduleOption: "BEFORE_CHECK_OUT", offsetAmount: 2, offsetUnit: "HOURS", sendTime: "10:00" }),
        "2 hours before check-out",
      ],
      [
        form({ scheduleOption: "ON_CHECK_IN", sendTime: "08:15" }),
        "On the day of check-in, at 08:15 (Amsterdam time)",
      ],
      [
        form({ scheduleOption: "ON_CHECK_IN" }),
        "On the day of check-in, at the property's check-in time (Amsterdam time)",
      ],
      [
        form({ scheduleOption: "BEFORE_CHECK_OUT", offsetAmount: 0, sendTime: "07:00" }),
        "On the day of check-out, at 07:00 (Amsterdam time)",
      ],
    ])("describes %j", (value, sentence) => {
      expect(describeSchedule(value)).toBe(sentence);
    });
  });

  describe("timeOfDayHint", () => {
    test("is empty when a time of day can be chosen", () => {
      expect(timeOfDayHint(form({ scheduleOption: "BEFORE_CHECK_IN", offsetAmount: 1, offsetUnit: "DAYS" }))).toBe("");
      expect(timeOfDayHint(form({ scheduleOption: "ON_CHECK_IN" }))).toBe("");
    });

    test("explains why it is unavailable", () => {
      expect(timeOfDayHint(form())).toBe("Only for check-in and check-out messages.");
      expect(timeOfDayHint(form({ scheduleOption: "AFTER_CHECK_IN", offsetAmount: 2, offsetUnit: "HOURS" }))).toBe(
        "A time of day works with days, or on the day of check-in or check-out."
      );
    });
  });
});
