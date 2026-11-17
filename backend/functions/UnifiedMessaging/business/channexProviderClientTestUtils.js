const ChannexProviderClient = require("../.shared/channelManagement/providers/channex/providerClient.js").default;

const CREDENTIALS = { apiKey: "test-api-key" };

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

const useMockedFetch = () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });
};

module.exports = { ChannexProviderClient, CREDENTIALS, jsonResponse, useMockedFetch };
