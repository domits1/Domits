jest.mock("./whatsappProviderAdapter.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ sendMessage: jest.fn(), describeFailure: jest.fn() })),
}));

const { createDefaultProviderAdapters, resolveProviderAdapter } = require("./providerAdapterRegistry.js");
const WhatsAppProviderAdapter = require("./whatsappProviderAdapter.js").default;

describe("providerAdapterRegistry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("createDefaultProviderAdapters registers WhatsApp under the WHATSAPP platform key", () => {
    const adapters = createDefaultProviderAdapters();

    expect(WhatsAppProviderAdapter).toHaveBeenCalledTimes(1);
    expect(adapters.WHATSAPP).toBeDefined();
    expect(Object.keys(adapters)).toEqual(["WHATSAPP"]);
  });

  test("resolveProviderAdapter returns the registered adapter for a known platform", () => {
    const fakeAdapter = { sendMessage: jest.fn() };
    const adapters = { WHATSAPP: fakeAdapter };

    expect(resolveProviderAdapter(adapters, "WHATSAPP")).toBe(fakeAdapter);
  });

  test("resolveProviderAdapter throws a 400 UNSUPPORTED_PROVIDER HttpError for an unregistered platform", () => {
    const adapters = { WHATSAPP: { sendMessage: jest.fn() } };

    expect(() => resolveProviderAdapter(adapters, "UNKNOWN_PROVIDER")).toThrow(
      expect.objectContaining({ statusCode: 400, code: "UNSUPPORTED_PROVIDER" })
    );
  });
});
