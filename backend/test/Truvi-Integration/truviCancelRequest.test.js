import { describe, expect, it } from "@jest/globals";
import { toCancelRequest } from "../../functions/Truvi-Integration/util/truviMapper.js";

describe("toCancelRequest", () => {
  it("builds the three required objects with a fresh echo token", () => {
    const now = new Date(Date.UTC(2026, 8, 5, 16, 2, 19, 310));

    const first = toCancelRequest({ verificationId: "9c1f7a20-5b84-4d6e-8a13-7f0c2b95e4d1", reservationId: "RES-88213", now });
    const second = toCancelRequest({ verificationId: "9c1f7a20-5b84-4d6e-8a13-7f0c2b95e4d1", reservationId: "RES-88213", now });

    expect(first).toEqual({
      metadata: { timeStamp: "2026-09-05T16:02:19.31", echoToken: expect.any(String) },
      verification: { verificationId: "9c1f7a20-5b84-4d6e-8a13-7f0c2b95e4d1" },
      reservation: { reservationId: "RES-88213" },
    });
    expect(first.metadata.echoToken).toMatch(/^[0-9a-f-]{36}$/);
    expect(first.metadata.echoToken).not.toBe(second.metadata.echoToken);
  });

  it.each([[{ reservationId: "RES-1" }], [{ verificationId: "9c1f7a20-5b84-4d6e-8a13-7f0c2b95e4d1" }]])(
    "refuses a request without both ids (%p)",
    (ids) => {
      expect(() => toCancelRequest(ids)).toThrow("verificationId and reservationId are required");
    }
  );
});
