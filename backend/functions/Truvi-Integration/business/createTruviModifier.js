import { TruviApiClient } from "../data/truviApiClient.js";
import { TruviBookingRepository } from "../data/truviBookingRepository.js";
import { GuestRiskAssessmentRepository } from "../data/guestRiskAssessmentRepository.js";
import { TruviSecretRepository } from "../data/truviSecretRepository.js";
import { TruviBookingModifier } from "./truviBookingModifier.js";
import { readTruviConfig } from "../util/truviConfig.js";

export const createTruviModifier = async ({ env = process.env, secretRepository } = {}) => {
  const config = readTruviConfig(env);
  const secrets = secretRepository || new TruviSecretRepository({ secretName: config.secretName });
  const subscriptionKey = await secrets.getSubscriptionKey();

  return new TruviBookingModifier({
    bookingRepository: new TruviBookingRepository(),
    apiClient: new TruviApiClient({ subscriptionKey, baseUrl: config.baseUrl }),
    assessmentRepository: new GuestRiskAssessmentRepository(),
  });
};
