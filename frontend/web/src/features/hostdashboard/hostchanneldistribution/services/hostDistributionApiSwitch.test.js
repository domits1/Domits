jest.mock("../../hostintegrations/channexApi", () => ({ requestChannex: jest.fn() }));

const loadWithEnv = (value) => {
  const previous = process.env.REACT_APP_REAL_DISTRIBUTION;
  if (value === undefined) delete process.env.REACT_APP_REAL_DISTRIBUTION;
  else process.env.REACT_APP_REAL_DISTRIBUTION = value;
  let loaded;
  jest.isolateModules(() => {
    loaded = {
      api: require("./hostDistributionApi"),
      channex: require("../../hostintegrations/channexApi"),
    };
  });
  if (previous === undefined) delete process.env.REACT_APP_REAL_DISTRIBUTION;
  else process.env.REACT_APP_REAL_DISTRIBUTION = previous;
  return loaded;
};

describe("REACT_APP_REAL_DISTRIBUTION switch", () => {
  test('is off when the variable is unset or not exactly "true"', () => {
    expect(loadWithEnv(undefined).api.MOCK_HOST_DISTRIBUTION_ENABLED).toBe(false);
    expect(loadWithEnv("false").api.MOCK_HOST_DISTRIBUTION_ENABLED).toBe(false);
    expect(loadWithEnv("1").api.MOCK_HOST_DISTRIBUTION_ENABLED).toBe(false);
  });

  test('shows the cards and calls the real routes when the variable is "true"', async () => {
    const { api, channex } = loadWithEnv("true");
    channex.requestChannex.mockResolvedValue({ listings: [] });

    expect(api.MOCK_HOST_DISTRIBUTION_ENABLED).toBe(true);
    await api.getHostListings();
    expect(channex.requestChannex).toHaveBeenCalledWith("/integrations/channex/host/listings");
  });

  test('enableDistribution stays mock even when the variable is "true"', async () => {
    const { api, channex } = loadWithEnv("true");
    jest.spyOn(global, "setTimeout").mockImplementation((callback) => {
      callback();
      return 0;
    });

    await api.enableDistribution({ propertyId: "mock-property" }).catch(() => {});
    expect(channex.requestChannex).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});
