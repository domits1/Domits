import { TruviApiClient } from "../data/truviApiClient.js";
import { TruviBookingRepository } from "../data/truviBookingRepository.js";
import { GuestRiskAssessmentRepository } from "../data/guestRiskAssessmentRepository.js";
import { TruviSecretRepository } from "../data/truviSecretRepository.js";
import { UserContactRepository } from "../data/userContactRepository.js";
import { TruviScreeningService } from "./truviScreeningService.js";
import { TruviBookingScreener } from "./truviBookingScreener.js";
import { readTruviConfig } from "../util/truviConfig.js";

export const createTruviScreener = async ({ env = process.env, secretRepository } = {}) => {
  const config = readTruviConfig(env);
  const secrets = secretRepository || new TruviSecretRepository({ secretName: config.secretName });
  const subscriptionKey = await secrets.getSubscriptionKey();

  return new TruviBookingScreener({
    bookingRepository: new TruviBookingRepository(),
    screeningService: new TruviScreeningService({
      apiClient: new TruviApiClient({ subscriptionKey, baseUrl: config.baseUrl }),
    }),
    assessmentRepository: new GuestRiskAssessmentRepository(),
    contactLookup: new UserContactRepository(),
    extendedAmount: config.extendedAmount,
  });
};
