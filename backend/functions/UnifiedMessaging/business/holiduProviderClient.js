const UNSUPPORTED_MESSAGE =
  "Provider validation is not executable from current repo/docs because no verified Holidu auth or endpoint contract is present.";

export default class HoliduProviderClient {
  async validateAccount() {
    return {
      success: false,
      canValidate: false,
      externalAccountId: null,
      providerStatus: "UNSUPPORTED_IN_REPO_DOCS",
      errorCode: null,
      errorMessage: UNSUPPORTED_MESSAGE,
    };
  }
}
