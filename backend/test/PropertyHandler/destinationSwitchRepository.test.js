import { describe, expect, it, jest } from "@jest/globals";
import {
  DESTINATION_PAGES_SWITCH_PARAMETER,
  DestinationSwitchRepository,
} from "../../functions/PropertyHandler/data/repository/destinationSwitchRepository.js";

const awsError = (name) => Object.assign(new Error(`${name} from SSM`), { name });

const repositoryReading = (read) => {
  const systemManagerRepository = { getSystemManagerParameter: jest.fn(read) };
  return { repository: new DestinationSwitchRepository(systemManagerRepository), systemManagerRepository };
};

describe("the destination pages switch", () => {
  it("reads the one switch parameter and is on only for the value true", async () => {
    const { repository, systemManagerRepository } = repositoryReading(async () => " true\n");
    expect(await repository.isDestinationPagesSwitchOn()).toBe(true);
    expect(systemManagerRepository.getSystemManagerParameter).toHaveBeenCalledWith("/destinations/pages/enabled");
    expect(DESTINATION_PAGES_SWITCH_PARAMETER).toBe("/destinations/pages/enabled");
  });

  it.each(["false", "", "yes", "1", "TRUE", "true, false", undefined])("is off for the value %p", async (value) => {
    const { repository } = repositoryReading(async () => value);
    expect(await repository.isDestinationPagesSwitchOn()).toBe(false);
  });

  it("is off when the parameter does not exist", async () => {
    const { repository } = repositoryReading(async () => {
      throw awsError("ParameterNotFound");
    });
    expect(await repository.isDestinationPagesSwitchOn()).toBe(false);
  });

  it.each(["AccessDeniedException", "ThrottlingException", "InternalServerError"])(
    "lets %s reach the caller instead of reading it as off",
    async (name) => {
      const { repository } = repositoryReading(async () => {
        throw awsError(name);
      });
      await expect(repository.isDestinationPagesSwitchOn()).rejects.toThrow(`${name} from SSM`);
    }
  );
});
