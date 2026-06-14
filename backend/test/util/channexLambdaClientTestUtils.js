import {
  afterAll,
  afterEach,
  beforeEach,
  expect,
  jest,
} from "@jest/globals";

const INTERNAL_TOKEN_ENV = "CHANNEX_BOOKING_AVAILABILITY_INTERNAL_TOKEN";
const INTERNAL_TOKEN = "internal-token";

export const useChannexLambdaClientTestEnvironment = () => {
  const originalToken = process.env[INTERNAL_TOKEN_ENV];

  beforeEach(() => {
    process.env[INTERNAL_TOKEN_ENV] = INTERNAL_TOKEN;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    if (originalToken === undefined) {
      delete process.env[INTERNAL_TOKEN_ENV];
      return;
    }
    process.env[INTERNAL_TOKEN_ENV] = originalToken;
  });
};

export const createLambdaMock = ({
  body,
  statusCode = 200,
  functionError,
} = {}) => {
  const response = {
    Payload: new TextEncoder().encode(
      JSON.stringify({
        statusCode,
        body: JSON.stringify(body),
      })
    ),
  };
  if (functionError) response.FunctionError = functionError;

  return {
    send: jest.fn().mockResolvedValue(response),
  };
};

export const expectChannexLambdaInvocation = (
  lambda,
  { path, payload, functionName = "UnifiedMessaging" }
) => {
  const commandInput = lambda.send.mock.calls[0][0].input;

  expect(commandInput.FunctionName).toBe(functionName);
  expect(JSON.parse(commandInput.Payload)).toEqual({
    httpMethod: "POST",
    path,
    headers: { "x-domits-internal-token": INTERNAL_TOKEN },
    queryStringParameters: {},
    body: JSON.stringify(payload),
  });
};

export const expectMissingInternalTokenSkip = async ({ lambda, invoke }) => {
  delete process.env[INTERNAL_TOKEN_ENV];

  const result = await invoke();

  expect(lambda.send).not.toHaveBeenCalled();
  expect(result).toEqual(
    expect.objectContaining({
      skipped: true,
      reason: "CHANNEX_BOOKING_AVAILABILITY_INTERNAL_TOKEN_MISSING",
    })
  );
};
