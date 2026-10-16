import { bookingToCreateRequest, mapCreateResponse } from "../util/truviMapper.js";

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
      return {
        providerAssessmentId: null,
        status: "ERROR",
        flaggedReason: null,
        error: { status: error.status ?? null, message: error.message },
      };
    }

    return mapCreateResponse(response);
  }
}