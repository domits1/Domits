import { readGuestNote } from "../../../../../../../backend/functions/General-Bookings-CRUD-Bookings-develop/business/bookingRequestGuestNote";
import {
  EMPTY_REQUEST_DETAILS,
  REQUEST_DETAIL_MESSAGES,
  validateRequestDetails,
} from "../rendering/templates/elite/eliteSitePropertyRequestDetails";

const NO_RULES = { hasHouseRules: false };

const details = (changes = {}) => ({
  ...EMPTY_REQUEST_DETAILS,
  firstName: "Ana",
  lastName: "Silva",
  email: "ana@example.com",
  ...changes,
});

const serverAccepts = (note) => {
  try {
    readGuestNote(note);
    return true;
  } catch {
    return false;
  }
};

describe("the details of a request to book", () => {
  it("joins the first and last name, and leaves an empty phone and message out", () => {
    expect(validateRequestDetails(details({ firstName: "  Ana ", lastName: " de Vries " }), NO_RULES)).toEqual({
      guest: { name: "Ana de Vries", email: "ana@example.com" },
      message: "",
      errors: {},
    });
  });

  it("refuses a first name of only spaces", () => {
    expect(validateRequestDetails(details({ firstName: "   " }), NO_RULES).errors).toEqual({
      firstName: REQUEST_DETAIL_MESSAGES.firstName,
    });
  });

  it.each([
    ["no last name", ""],
    ["a last name of only spaces", "\t \n"],
  ])("sends the first name alone for %s", (_, lastName) => {
    expect(validateRequestDetails(details({ firstName: " Ana ", lastName }), NO_RULES)).toEqual({
      guest: { name: "Ana", email: "ana@example.com" },
      message: "",
      errors: {},
    });
  });

  it("refuses a name longer than the server takes", () => {
    const longest = details({ firstName: "a".repeat(127), lastName: "b".repeat(127) });

    expect(validateRequestDetails(longest, NO_RULES).errors).toEqual({});
    expect(validateRequestDetails({ ...longest, lastName: "b".repeat(128) }, NO_RULES).errors).toEqual({
      lastName: REQUEST_DETAIL_MESSAGES.nameLength,
    });
    expect(validateRequestDetails(details({ firstName: "a".repeat(255), lastName: "" }), NO_RULES).errors).toEqual({});
    expect(validateRequestDetails(details({ firstName: "a".repeat(256), lastName: "" }), NO_RULES).errors).toEqual({
      firstName: REQUEST_DETAIL_MESSAGES.nameLength,
    });
  });

  it.each([
    "+31 6 1234 5678",
    "(020) 123-4567",
    " 0612345678 ",
    "12345",
    "123456",
    "123456789012345",
    "1234567890123456",
    "+1 234.567.8901 ext",
    "++31612345678",
    "0".repeat(15).padEnd(33, " ").concat("1"),
    "+31-6-12-34-56-78-90-12",
  ])("judges the phone %j as the server does", (phone) => {
    expect(!validateRequestDetails(details({ phone }), NO_RULES).errors.phone).toBe(serverAccepts({ phone }));
  });

  it.each([
    ["2000 characters", "x".repeat(2000)],
    ["2001 characters", "x".repeat(2001)],
    ["2000 characters inside spaces", ` ${"x".repeat(2000)} `],
    ["2000 characters once blank lines are joined", `${"a".repeat(1997)}\n\n\nb`],
    ["2000 characters with Windows line breaks", `${"a".repeat(1998)}\r\nb`],
    ["2000 characters and an invisible one", `${"a".repeat(1999)}\u0007b`],
    ["2001 characters after cleaning", `${"a".repeat(1998)}\r\nbc`],
  ])("judges a message of %s as the server does", (_, message) => {
    expect(!validateRequestDetails(details({ message }), NO_RULES).errors.message).toBe(serverAccepts({ message }));
  });

  it("needs the house rules accepted only when the listing has them", () => {
    expect(validateRequestDetails(details(), { hasHouseRules: true }).errors).toEqual({
      acceptsHouseRules: REQUEST_DETAIL_MESSAGES.houseRules,
    });
    expect(validateRequestDetails(details({ acceptsHouseRules: true }), { hasHouseRules: true }).errors).toEqual({});
    expect(validateRequestDetails(details(), NO_RULES).errors).toEqual({});
  });

  it("sends the message as the server keeps it", () => {
    expect(validateRequestDetails(details({ message: " Hi\r\n\n\n\nthere\t! " }), NO_RULES).message).toBe(
      "Hi\n\nthere !"
    );
  });
});
