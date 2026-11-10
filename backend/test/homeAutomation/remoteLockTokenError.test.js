import { describe, expect, it } from "@jest/globals";
import {
  REMOTELOCK_TOKEN_ERROR_CODE,
  RemoteLockTokenError,
} from "../../functions/.shared/homeAutomation/providers/remotelock/remoteLockTokenError.js";

describe("RemoteLockTokenError", () => {
  it.each(Object.values(REMOTELOCK_TOKEN_ERROR_CODE))(
    "has fixed text for %s and carries only the code and the flag",
    (code) => {
      const error = new RemoteLockTokenError({ code, retryable: true, cause: new Error("secret"), token: "t" });

      expect(error).toBeInstanceOf(Error);
      expect(error).toMatchObject({ code, retryable: true });
      expect(error.message).toMatch(/^[A-Z][^$]+\.$/);
      expect(error.message).not.toContain(code);
      expect(Object.keys(error).sort()).toEqual(["code", "name", "retryable"]);
      expect(error).not.toHaveProperty("cause");
    }
  );
});
