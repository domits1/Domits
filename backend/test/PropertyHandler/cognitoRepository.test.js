import { describe, expect, it, jest } from "@jest/globals";
import { CognitoRepository } from "../../functions/PropertyHandler/data/repository/cognitoRepository.js";
import { NotFoundException } from "../../functions/PropertyHandler/util/exception/NotFoundException.js";

const KNOWN_USER = { Username: "user-1", UserAttributes: [{ Name: "given_name", Value: "Ada" }] };

const buildRepository = (response) => {
  const repository = new CognitoRepository();
  repository.cognitoClient = { send: jest.fn(async () => response) };
  return repository;
};

describe("CognitoRepository", () => {
  describe.each([
    ["getUserById", "unknown-user-id"],
    ["getUserByAccessToken", "unknown-access-token"],
  ])("%s", (method, argument) => {
    it.each([
      ["an empty response", {}],
      ["no response", undefined],
    ])("rejects with a 404 NotFoundException for %s", async (_label, response) => {
      const repository = buildRepository(response);

      const error = await repository[method](argument).catch((caught) => caught);

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error).not.toBeInstanceOf(TypeError);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("User not found.");
    });

    it("returns the Cognito user as is when it exists", async () => {
      const repository = buildRepository(KNOWN_USER);

      await expect(repository[method](argument)).resolves.toBe(KNOWN_USER);
    });
  });
});
