import { buildBookingVariables } from "../business/automationService.js";

const booking = (patch = {}) => ({
  guestname: "Taylor",
  arrivaldate: Date.UTC(2026, 5, 20),
  departuredate: Date.UTC(2026, 5, 23),
  guests: 3,
  ...patch,
});

const property = { id: "property-1", title: "Canal Loft" };
const checkIn = { checkInFrom: "15:00:00", checkInTill: "20:00:00", checkOutFrom: "08:00:00", checkOutTill: "11:00:00" };
const location = {
  street: "Keizersgracht",
  housenumber: 12,
  housenumberextension: "A",
  postalcode: "1015 CJ",
  city: "Amsterdam",
};

const build = (patch = {}) => buildBookingVariables({ booking: booking(), property, checkIn, location, ...patch });

describe("buildBookingVariables", () => {
  test("keeps the four existing variables", () => {
    expect(build()).toMatchObject({
      guestName: "Taylor",
      propertyName: "Canal Loft",
      checkInDate: "20 Jun 2026",
      checkOutDate: "23 Jun 2026",
    });
  });

  test("takes the check-in time from the start of the check-in window and the check-out time from the end of the check-out window", () => {
    expect(build()).toMatchObject({ checkInTime: "15:00", checkOutTime: "11:00" });
  });

  test("shows times without seconds", () => {
    const values = build({ checkIn: { checkInFrom: "09:30:00", checkOutTill: "10:05:59" } });

    expect(values).toMatchObject({ checkInTime: "09:30", checkOutTime: "10:05" });
  });

  test("writes the address as street, house number and postal code, without the city", () => {
    expect(build().propertyAddress).toBe("Keizersgracht 12A, 1015 CJ");
  });

  test("writes the address without an extension", () => {
    const values = build({ location: { ...location, housenumberextension: null } });

    expect(values.propertyAddress).toBe("Keizersgracht 12, 1015 CJ");
  });

  test("leaves the postal code out of the address when there is none", () => {
    const values = build({ location: { ...location, postalcode: "" } });

    expect(values.propertyAddress).toBe("Keizersgracht 12A");
  });

  test("gives the city on its own", () => {
    expect(build().propertyCity).toBe("Amsterdam");
  });

  test("gives the number of guests from the booking as text", () => {
    expect(build().numberOfGuests).toBe("3");
  });

  test("gives empty values when the property has no check-in row and no location", () => {
    const values = build({ checkIn: null, location: null });

    expect(values).toMatchObject({ checkInTime: "", checkOutTime: "", propertyAddress: "", propertyCity: "" });
  });

  test("gives an empty address when the street is missing", () => {
    const values = build({ location: { ...location, street: "" } });

    expect(values.propertyAddress).toBe("");
  });

  test.each([[null], [undefined], [""], ["not a time"], [{}]])("gives an empty time for %p", (value) => {
    const values = build({ checkIn: { checkInFrom: value, checkOutTill: value } });

    expect(values).toMatchObject({ checkInTime: "", checkOutTime: "" });
  });

  test.each([[null], [undefined], [0], [-2], [1.5], ["x"]])("gives an empty number of guests for %p", (guests) => {
    expect(build({ booking: booking({ guests }) }).numberOfGuests).toBe("");
  });

  test("copes with a context that has no booking", () => {
    expect(buildBookingVariables({ booking: null, property: null, checkIn: null, location: null })).toEqual({
      guestName: "",
      propertyName: "",
      checkInDate: "",
      checkOutDate: "",
      checkInTime: "",
      checkOutTime: "",
      propertyAddress: "",
      propertyCity: "",
      numberOfGuests: "",
    });
  });
});
