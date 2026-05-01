import { describe, expect, it } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";

describe("PropertyController calendar override normalization", () => {
  it("normalizes per-date restriction fields to camelCase values", () => {
    const controller = new PropertyController();

    const [override] = controller.normalizeCalendarOverridesPayload([
      {
        date: "2026-05-01",
        isAvailable: false,
        nightlyPrice: "125",
        stopSell: true,
        closedToArrival: "1",
        closedToDeparture: 0,
        minStay: "2",
        maxStay: "7",
      },
    ]);

    expect(override).toEqual({
      calendarDate: 20260501,
      isAvailable: false,
      nightlyPrice: 125,
      stopSell: true,
      closedToArrival: true,
      closedToDeparture: false,
      minStay: 2,
      maxStay: 7,
    });
  });

  it("leaves new restriction fields unset when omitted", () => {
    const controller = new PropertyController();

    const [override] = controller.normalizeCalendarOverridesPayload([
      {
        date: 20260502,
        isAvailable: false,
        nightlyPrice: 150,
      },
    ]);

    expect(override).toMatchObject({
      calendarDate: 20260502,
      isAvailable: false,
      nightlyPrice: 150,
      stopSell: null,
      closedToArrival: null,
      closedToDeparture: null,
      minStay: null,
      maxStay: null,
    });
  });

  it("rejects invalid restriction values", () => {
    const controller = new PropertyController();

    expect(() =>
      controller.normalizeCalendarOverridesPayload([
        {
          date: 20260503,
          stopSell: "sometimes",
        },
      ])
    ).toThrow("Calendar override stopSell must be a boolean.");

    expect(() =>
      controller.normalizeCalendarOverridesPayload([
        {
          date: 20260503,
          minStay: -1,
        },
      ])
    ).toThrow("Calendar override minStay must be a number greater than or equal to 0.");
  });
});
