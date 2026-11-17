import { afterEach, describe, expect, it, jest } from "@jest/globals";
import Database from "../../functions/.shared/integrations/ORM/index.js";
import IntegrationAccountRepository from "../../functions/.shared/integrations/repositories/integrationAccountRepository.js";

const ACCOUNT = "account-1";

const clientReturning = (affected) => {
  const builder = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected }),
  };
  jest.spyOn(Database, "getInstance").mockResolvedValue({ createQueryBuilder: () => builder });
  return builder;
};

afterEach(() => jest.restoreAllMocks());

describe("IntegrationAccountRepository.updateStatusIfCurrent", () => {
  it("changes the status in one statement that only matches the expected status", async () => {
    const builder = clientReturning(1);

    const changed = await new IntegrationAccountRepository().updateStatusIfCurrent(
      ACCOUNT,
      "CONNECTED",
      "EXPIRED_CREDENTIALS",
      { lastErrorCode: "REFRESH_TOKEN_REJECTED", lastErrorMessage: "rejected" }
    );

    expect(changed).toBe(true);
    expect(builder.where).toHaveBeenCalledWith("id = :id AND status = :expectedStatus", {
      id: ACCOUNT,
      expectedStatus: "CONNECTED",
    });
    expect(builder.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "EXPIRED_CREDENTIALS",
        lastErrorCode: "REFRESH_TOKEN_REJECTED",
        lastErrorMessage: "rejected",
      })
    );
    expect(builder.execute).toHaveBeenCalledTimes(1);
  });

  it("reports false when no row matched, because the status had already changed", async () => {
    clientReturning(0);

    await expect(
      new IntegrationAccountRepository().updateStatusIfCurrent(ACCOUNT, "CONNECTED", "EXPIRED_CREDENTIALS")
    ).resolves.toBe(false);
  });
});
