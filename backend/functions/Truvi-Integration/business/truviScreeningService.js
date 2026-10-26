import { bookingToCreateRequest, mapCreateResponse } from "../util/truviMapper.js";

const ECHO_TOKEN_USED = "already exists from a previous request";

// A retry of a create that already went through: Truvi refuses the reused token and names the first verification.
export const isEchoTokenReuse = (error) =>
  error?.status === 400 && Boolean(error.verificationId) && String(error.message ?? "").includes(ECHO_TOKEN_USED);

const toErrorResult = (error) => ({
  providerAssessmentId: null,
  status: "ERROR",
  flaggedReason: null,
  error: { status: error.status ?? null, message: String(error.message ?? "Truvi request failed").slice(0, 200) },
});

export class TruviScreeningService {
  constructor({ apiClient }) {
    this.apiClient = apiClient;
  }

  async screenBooking(input) {
    const request = bookingToCreateRequest(input);

    let response;
    try {
      response = await this.apiClient.createVerification(request);
    } catch (error) {
      if (isEchoTokenReuse(error)) {
        return this.#earlierVerification(error.verificationId);
      }
      return toErrorResult(error);
    }

    return mapCreateResponse(response);
  }

  async #earlierVerification(verificationId) {
    try {
      const result = mapCreateResponse(await this.apiClient.getVerification(verificationId));
      return { ...result, providerAssessmentId: result.providerAssessmentId ?? verificationId };
    } catch (error) {
      return { ...toErrorResult(error), providerAssessmentId: verificationId };
    }
  }
}
