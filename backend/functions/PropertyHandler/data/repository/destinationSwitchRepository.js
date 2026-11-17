import { SystemManagerRepository } from "./systemManagerRepository.js";

export const DESTINATION_PAGES_SWITCH_PARAMETER = "/destinations/pages/enabled";

export class DestinationSwitchRepository {
  constructor(systemManagerRepository = new SystemManagerRepository()) {
    this.systemManagerRepository = systemManagerRepository;
  }

  async isDestinationPagesSwitchOn() {
    try {
      const value = await this.systemManagerRepository.getSystemManagerParameter(DESTINATION_PAGES_SWITCH_PARAMETER);
      return String(value ?? "").trim() === "true";
    } catch (error) {
      if (error?.name === "ParameterNotFound") {
        return false;
      }
      throw error;
    }
  }
}
