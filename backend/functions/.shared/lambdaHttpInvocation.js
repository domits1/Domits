import { InvokeCommand } from "@aws-sdk/client-lambda";

const parseJsonSafely = (value) => {
  try {
    if (!value) return null;
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return null;
  }
};

const decodePayload = (payload) => {
  if (!payload) return null;
  if (typeof payload === "string") return payload;
  return new TextDecoder("utf-8").decode(payload);
};

export const invokeLambdaHttpEvent = async ({ lambda, functionName, event }) => {
  const response = await lambda.send(
    new InvokeCommand({
      FunctionName: functionName,
      Payload: JSON.stringify(event),
    })
  );
  const lambdaBody = parseJsonSafely(decodePayload(response?.Payload)) || {};
  const responseBody = parseJsonSafely(lambdaBody?.body) || lambdaBody?.response || null;

  return {
    response,
    lambdaBody,
    responseBody,
  };
};
