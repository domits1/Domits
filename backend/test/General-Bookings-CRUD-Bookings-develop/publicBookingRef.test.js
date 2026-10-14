import { describe, expect, it } from "@jest/globals";
import {
  PUBLIC_BOOKING_REF_ALPHABET,
  PUBLIC_BOOKING_REF_PREFIX,
  generatePublicBookingRef,
  isPublicBookingRef,
} from "../../functions/General-Bookings-CRUD-Bookings-develop/util/publicBookingRef.js";

describe("generatePublicBookingRef", () => {
  it("produces DBW- followed by ten characters from the unambiguous alphabet", () => {
    const ref = generatePublicBookingRef();
    expect(ref.startsWith(PUBLIC_BOOKING_REF_PREFIX)).toBe(true);
    const body = ref.slice(PUBLIC_BOOKING_REF_PREFIX.length);
    expect(body).toHaveLength(10);
    for (const character of body) {
      expect(PUBLIC_BOOKING_REF_ALPHABET).toContain(character);
    }
  });

  it("never uses the ambiguous characters 0, O, 1, I or lowercase letters", () => {
    expect(PUBLIC_BOOKING_REF_ALPHABET).not.toMatch(/[0O1Ia-z]/);
  });

  it("produces distinct references across calls", () => {
    const refs = new Set(Array.from({ length: 200 }, () => generatePublicBookingRef()));
    expect(refs.size).toBe(200);
  });

  it("derives characters from the supplied random bytes", () => {
    const ref = generatePublicBookingRef(() => Buffer.alloc(10, 0));
    expect(ref).toBe(`${PUBLIC_BOOKING_REF_PREFIX}${PUBLIC_BOOKING_REF_ALPHABET[0].repeat(10)}`);
  });
});

describe("isPublicBookingRef", () => {
  it("accepts generated references and rejects everything else", () => {
    expect(isPublicBookingRef(generatePublicBookingRef())).toBe(true);
    expect(isPublicBookingRef("DBW-ABCDEFGHJK")).toBe(true);
    expect(isPublicBookingRef("DBW-ABCDEFGHJ")).toBe(false);
    expect(isPublicBookingRef("DBW-ABCDEFGHJ0")).toBe(false);
    expect(isPublicBookingRef("abc")).toBe(false);
    expect(isPublicBookingRef(null)).toBe(false);
  });
});
