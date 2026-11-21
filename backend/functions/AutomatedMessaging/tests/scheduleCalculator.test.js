import { calculateStayScheduledFor } from "../business/scheduleCalculator.js";
import {
  AUTOMATION_TRIGGERS,
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
  STAY_TIME_ZONE,
} from "../util/constants.js";

const utc = (iso) => Date.parse(iso);
const NOW = utc("2026-01-01T00:00:00Z");
const SUMMER_STAY = { arrivaldate: utc("2026-06-20T00:00:00Z"), departuredate: utc("2026-06-23T00:00:00Z") };
const PROPERTY_TIMES = { checkInFrom: "15:00:00", checkOutTill: "11:00:00" };

const schedule = (rule, { booking = SUMMER_STAY, checkIn = PROPERTY_TIMES, now = NOW } = {}) =>
  calculateStayScheduledFor({ booking, checkIn, now, ...rule });

describe("stay-date schedule calculator", () => {
  test("uses Amsterdam time with the agreed fallback times", () => {
    expect(STAY_TIME_ZONE).toBe("Europe/Amsterdam");
    expect(DEFAULT_CHECK_IN_TIME).toBe("15:00");
    expect(DEFAULT_CHECK_OUT_TIME).toBe("11:00");
  });

  describe("use cases", () => {
    test.each([
      [
        "3 days before check-in at 10:00",
        { triggerType: "CHECK_IN", offsetDirection: "BEFORE", offsetAmount: 3, offsetUnit: "DAYS", sendTime: "10:00" },
        "2026-06-17T08:00:00Z",
      ],
      [
        "2 hours before check-in",
        { triggerType: "CHECK_IN", offsetDirection: "BEFORE", offsetAmount: 2, offsetUnit: "HOURS" },
        "2026-06-20T11:00:00Z",
      ],
      [
        "30 minutes before check-in",
        { triggerType: "CHECK_IN", offsetDirection: "BEFORE", offsetAmount: 30, offsetUnit: "MINUTES" },
        "2026-06-20T12:30:00Z",
      ],
      [
        "on check-in day at 10:00",
        { triggerType: "CHECK_IN", offsetDirection: "AFTER", offsetAmount: 0, offsetUnit: "MINUTES", sendTime: "10:00" },
        "2026-06-20T08:00:00Z",
      ],
      [
        "at the check-in time itself",
        { triggerType: "CHECK_IN", offsetDirection: "AFTER", offsetAmount: 0, offsetUnit: "MINUTES" },
        "2026-06-20T13:00:00Z",
      ],
      [
        "1 day before check-out at 18:00",
        { triggerType: "CHECK_OUT", offsetDirection: "BEFORE", offsetAmount: 1, offsetUnit: "DAYS", sendTime: "18:00" },
        "2026-06-22T16:00:00Z",
      ],
      [
        "3 hours before check-out",
        { triggerType: "CHECK_OUT", offsetDirection: "BEFORE", offsetAmount: 3, offsetUnit: "HOURS" },
        "2026-06-23T06:00:00Z",
      ],
      [
        "1 day after check-out at 10:00 (review request)",
        { triggerType: "CHECK_OUT", offsetDirection: "AFTER", offsetAmount: 1, offsetUnit: "DAYS", sendTime: "10:00" },
        "2026-06-24T08:00:00Z",
      ],
      [
        "3 hours after check-out",
        { triggerType: "CHECK_OUT", offsetDirection: "AFTER", offsetAmount: 3, offsetUnit: "HOURS" },
        "2026-06-23T12:00:00Z",
      ],
      [
        "2 days after check-in without a send time keeps the check-in time",
        { triggerType: "CHECK_IN", offsetDirection: "AFTER", offsetAmount: 2, offsetUnit: "DAYS" },
        "2026-06-22T13:00:00Z",
      ],
    ])("%s", (_label, rule, expectedIso) => {
      expect(schedule(rule).scheduledFor).toBe(utc(expectedIso));
    });

    test("treats a missing direction as AFTER", () => {
      const rule = { triggerType: "CHECK_IN", offsetAmount: 2, offsetUnit: "HOURS" };

      expect(schedule({ ...rule, offsetDirection: null }).scheduledFor).toBe(utc("2026-06-20T15:00:00Z"));
      expect(schedule({ ...rule, offsetDirection: undefined }).scheduledFor).toBe(utc("2026-06-20T15:00:00Z"));
    });

    test("accepts times with and without seconds", () => {
      const rule = { triggerType: "CHECK_IN", offsetDirection: "AFTER", offsetAmount: 0, offsetUnit: "MINUTES" };

      expect(schedule(rule, { checkIn: { checkInFrom: "16:30" } }).scheduledFor).toBe(utc("2026-06-20T14:30:00Z"));
      expect(schedule(rule, { checkIn: { checkInFrom: "16:30:00" } }).scheduledFor).toBe(utc("2026-06-20T14:30:00Z"));
    });

    test("does not need the property times when a send time is set", () => {
      const rule = { triggerType: "CHECK_IN", offsetDirection: "AFTER", offsetAmount: 0, offsetUnit: "MINUTES", sendTime: "10:00" };

      expect(schedule(rule, { checkIn: null }).scheduledFor).toBe(utc("2026-06-20T08:00:00Z"));
    });
  });

  describe("missing property times", () => {
    const checkInRule = { triggerType: "CHECK_IN", offsetDirection: "AFTER", offsetAmount: 0, offsetUnit: "MINUTES" };
    const checkOutRule = { triggerType: "CHECK_OUT", offsetDirection: "AFTER", offsetAmount: 0, offsetUnit: "MINUTES" };

    test.each([
      ["no check-in row", null],
      ["an empty check-in row", {}],
      ["empty times", { checkInFrom: "", checkOutTill: null }],
      ["unreadable times", { checkInFrom: "afternoon", checkOutTill: "noon" }],
      ["out-of-range times", { checkInFrom: "25:00", checkOutTill: "11:75" }],
    ])("falls back to 15:00 for check-in and 11:00 for check-out with %s", (_label, checkIn) => {
      expect(schedule(checkInRule, { checkIn }).scheduledFor).toBe(utc("2026-06-20T13:00:00Z"));
      expect(schedule(checkOutRule, { checkIn }).scheduledFor).toBe(utc("2026-06-23T09:00:00Z"));
    });
  });

  describe("time zone", () => {
    const rule = { triggerType: "CHECK_IN", offsetDirection: "AFTER", offsetAmount: 0, offsetUnit: "MINUTES", sendTime: "10:00" };

    test("is UTC+1 in winter and UTC+2 in summer", () => {
      const winter = { arrivaldate: utc("2026-01-15T00:00:00Z"), departuredate: utc("2026-01-18T00:00:00Z") };

      expect(schedule(rule, { booking: winter }).scheduledFor).toBe(utc("2026-01-15T09:00:00Z"));
      expect(schedule(rule).scheduledFor).toBe(utc("2026-06-20T08:00:00Z"));
    });

    test("reads the stay date as the UTC calendar date of the booking", () => {
      const lateEvening = { arrivaldate: utc("2026-06-20T22:30:00Z"), departuredate: utc("2026-06-23T22:30:00Z") };

      expect(schedule(rule, { booking: lateEvening }).scheduledFor).toBe(utc("2026-06-20T08:00:00Z"));
    });

    describe("spring change on 29 March 2026", () => {
      const booking = { arrivaldate: utc("2026-03-30T00:00:00Z"), departuredate: utc("2026-04-02T00:00:00Z") };
      const daysBefore = (amount) => ({
        triggerType: "CHECK_IN",
        offsetDirection: "BEFORE",
        offsetAmount: amount,
        offsetUnit: "DAYS",
        sendTime: "10:00",
      });

      test("keeps 10:00 local time on both sides of the change", () => {
        expect(schedule(daysBefore(2), { booking }).scheduledFor).toBe(utc("2026-03-28T09:00:00Z"));
        expect(schedule(daysBefore(1), { booking }).scheduledFor).toBe(utc("2026-03-29T08:00:00Z"));
        expect(schedule(daysBefore(0), { booking }).scheduledFor).toBe(utc("2026-03-30T08:00:00Z"));
      });

      test("moves a time inside the skipped hour forward", () => {
        const rule = { ...daysBefore(1), sendTime: "02:30" };

        expect(schedule(rule, { booking }).scheduledFor).toBe(utc("2026-03-29T01:30:00Z"));
      });
    });

    describe("autumn change on 25 October 2026", () => {
      const booking = { arrivaldate: utc("2026-10-25T00:00:00Z"), departuredate: utc("2026-10-28T00:00:00Z") };

      test("keeps local time for days and counts elapsed time for hours", () => {
        const base = { triggerType: "CHECK_IN", offsetDirection: "BEFORE", offsetAmount: 1 };

        expect(schedule({ ...base, offsetUnit: "DAYS" }, { booking }).scheduledFor).toBe(utc("2026-10-24T13:00:00Z"));
        expect(schedule({ ...base, offsetAmount: 24, offsetUnit: "HOURS" }, { booking }).scheduledFor).toBe(
          utc("2026-10-24T14:00:00Z")
        );
      });

      test("keeps 10:00 local time on both sides of the change", () => {
        const rule = (amount) => ({
          triggerType: "CHECK_IN",
          offsetDirection: "BEFORE",
          offsetAmount: amount,
          offsetUnit: "DAYS",
          sendTime: "10:00",
        });

        expect(schedule(rule(1), { booking }).scheduledFor).toBe(utc("2026-10-24T08:00:00Z"));
        expect(schedule(rule(0), { booking }).scheduledFor).toBe(utc("2026-10-25T09:00:00Z"));
      });

      test("uses the first occurrence of a time that happens twice", () => {
        const rule = {
          triggerType: "CHECK_IN",
          offsetDirection: "AFTER",
          offsetAmount: 0,
          offsetUnit: "MINUTES",
          sendTime: "02:30",
        };

        expect(schedule(rule, { booking }).scheduledFor).toBe(utc("2026-10-25T00:30:00Z"));
      });
    });
  });

  describe("time already passed", () => {
    const rule = { triggerType: "CHECK_IN", offsetDirection: "BEFORE", offsetAmount: 3, offsetUnit: "DAYS", sendTime: "10:00" };
    const scheduledFor = utc("2026-06-17T08:00:00Z");

    test("is not past before the computed moment", () => {
      expect(schedule(rule, { now: scheduledFor - 1 })).toEqual({ scheduledFor, isPast: false });
    });

    test.each([
      ["exactly at it", scheduledFor],
      ["after it", scheduledFor + 1],
      ["long after it", utc("2026-06-19T00:00:00Z")],
    ])("is past %s", (_label, now) => {
      expect(schedule(rule, { now })).toEqual({ scheduledFor, isPast: true });
    });

    test("compares against the current time when none is given", () => {
      const result = calculateStayScheduledFor({ ...rule, booking: SUMMER_STAY, checkIn: PROPERTY_TIMES });

      expect(result.isPast).toBe(scheduledFor <= Date.now());
    });
  });

  describe("input that is not a stay-date rule", () => {
    test("rejects the booking-paid trigger, which is scheduled from the event time", () => {
      expect(() => schedule({ triggerType: AUTOMATION_TRIGGERS.BOOKING_PAID, offsetAmount: 1, offsetUnit: "HOURS" })).toThrow(
        "Unsupported stay-date trigger"
      );
    });

    test("rejects an unknown trigger", () => {
      expect(() => schedule({ triggerType: "CHECK_UP", offsetAmount: 1, offsetUnit: "HOURS" })).toThrow(
        "Unsupported stay-date trigger"
      );
    });

    test.each([
      ["hours", { offsetAmount: 2, offsetUnit: "HOURS" }],
      ["minutes", { offsetAmount: 30, offsetUnit: "MINUTES" }],
    ])("rejects a send time combined with an offset in %s", (_label, offset) => {
      expect(() =>
        schedule({ triggerType: "CHECK_IN", offsetDirection: "BEFORE", sendTime: "10:00", ...offset })
      ).toThrow("A send time needs an offset in days or no offset");
    });

    test.each(["10", "24:00", "10:60", "ten", "10:5"])("rejects the send time %s", (sendTime) => {
      expect(() =>
        schedule({ triggerType: "CHECK_IN", offsetDirection: "AFTER", offsetAmount: 0, offsetUnit: "MINUTES", sendTime })
      ).toThrow("Invalid send time");
    });

    test.each([-1, 1.5, Number.NaN])("rejects the offset amount %s", (offsetAmount) => {
      expect(() =>
        schedule({ triggerType: "CHECK_IN", offsetDirection: "AFTER", offsetAmount, offsetUnit: "HOURS" })
      ).toThrow("Offset amount must be a whole number of 0 or more");
    });

    test("rejects an unknown offset unit", () => {
      expect(() => schedule({ triggerType: "CHECK_IN", offsetDirection: "AFTER", offsetAmount: 1, offsetUnit: "WEEKS" })).toThrow(
        "Unsupported offset unit"
      );
    });

    test("rejects a booking without usable dates", () => {
      expect(() =>
        schedule(
          { triggerType: "CHECK_IN", offsetDirection: "AFTER", offsetAmount: 0, offsetUnit: "MINUTES" },
          { booking: { arrivaldate: Number.NaN, departuredate: Number.NaN } }
        )
      ).toThrow("Booking dates are not valid");
    });
  });
});
