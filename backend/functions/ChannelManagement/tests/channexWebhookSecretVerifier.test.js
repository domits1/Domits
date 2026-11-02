import ChannexWebhookSecretVerifier from "../../.shared/channelManagement/providers/channex/webhookSecretVerifier.js";

const SECRET_NAME = "domits/channex/webhook/bookings";
const STORED_SECRET = "a-long-random-webhook-secret";
const FIVE_MINUTES_MS = 5 * 60 * 1000;

const buildVerifier = ({ secretString = JSON.stringify({ webhookSecret: STORED_SECRET }), sendError = null } = {}) => {
  let nowMs = 1_000_000;
  const secrets = {
    send: jest.fn(async () => {
      if (sendError) throw sendError;
      return { SecretString: secretString };
    }),
  };
  const verifier = new ChannexWebhookSecretVerifier({ secrets, secretName: SECRET_NAME, now: () => nowMs });
  const advance = (ms) => {
    nowMs += ms;
  };
  return { verifier, secrets, advance };
};

describe("ChannexWebhookSecretVerifier", () => {
  test("accepts the stored secret in the X-Channex-Webhook-Secret header", async () => {
    const { verifier, secrets } = buildVerifier();

    await expect(verifier.verify({ "X-Channex-Webhook-Secret": STORED_SECRET })).resolves.toBe(true);
    expect(secrets.send.mock.calls[0][0].input).toEqual({ SecretId: SECRET_NAME });
  });

  test("matches the header name in any letter case", async () => {
    const { verifier } = buildVerifier();

    await expect(verifier.verify({ "x-channex-webhook-secret": STORED_SECRET })).resolves.toBe(true);
  });

  it.each([
    { description: "a wrong secret of the same length", headers: { "X-Channex-Webhook-Secret": "b-long-random-webhook-secret" } },
    // timingSafeEqual throws on buffers of different length; a wrong header must still be a plain rejection.
    { description: "a wrong secret of a different length", headers: { "X-Channex-Webhook-Secret": "short" } },
    { description: "a missing header", headers: {} },
    { description: "an empty header", headers: { "X-Channex-Webhook-Secret": "" } },
    { description: "no headers at all", headers: undefined },
  ])("rejects $description", async ({ headers }) => {
    const { verifier } = buildVerifier();

    await expect(verifier.verify(headers)).resolves.toBe(false);
  });

  test("reads Secrets Manager once within five minutes", async () => {
    const { verifier, secrets, advance } = buildVerifier();

    await verifier.verify({ "X-Channex-Webhook-Secret": STORED_SECRET });
    advance(FIVE_MINUTES_MS - 1);
    await verifier.verify({ "X-Channex-Webhook-Secret": STORED_SECRET });

    expect(secrets.send).toHaveBeenCalledTimes(1);
  });

  // A rotated secret must take effect without restarting the Lambda.
  test("reads Secrets Manager again after five minutes", async () => {
    const { verifier, secrets, advance } = buildVerifier();

    await verifier.verify({ "X-Channex-Webhook-Secret": STORED_SECRET });
    advance(FIVE_MINUTES_MS);
    await verifier.verify({ "X-Channex-Webhook-Secret": STORED_SECRET });

    expect(secrets.send).toHaveBeenCalledTimes(2);
  });

  test("fails instead of rejecting when the secret cannot be read, so the caller can answer 503", async () => {
    const { verifier } = buildVerifier({ sendError: new Error("AccessDeniedException") });

    await expect(verifier.verify({ "X-Channex-Webhook-Secret": STORED_SECRET })).rejects.toThrow("AccessDeniedException");
  });

  // A badly stored secret is a configuration error; rejecting every webhook with 401 would drop them,
  // while failing lets Channex retry until the secret is fixed. The secret is JSON like every other
  // integration secret, so a plain-text value counts as not configured.
  it.each([
    { description: "empty", secretString: "" },
    { description: "plain text instead of JSON", secretString: STORED_SECRET },
    { description: "JSON without the webhookSecret key", secretString: JSON.stringify({ secret: STORED_SECRET }) },
    { description: "JSON with an empty webhookSecret", secretString: JSON.stringify({ webhookSecret: "" }) },
  ])("fails when the stored secret is $description", async ({ secretString }) => {
    const { verifier } = buildVerifier({ secretString });

    await expect(verifier.verify({ "X-Channex-Webhook-Secret": STORED_SECRET })).rejects.toThrow(
      "Channex webhook secret is not configured."
    );
  });
});
