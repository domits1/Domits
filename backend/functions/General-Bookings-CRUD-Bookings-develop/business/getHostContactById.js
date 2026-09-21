import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const defaultLambdaClient = new LambdaClient({ region: "eu-north-1" });

const readAttribute = (attributes, name) => attributes.find((attribute) => attribute?.Name === name)?.Value;

const getHostContactById = async (hostId, { lambdaClient = defaultLambdaClient } = {}) => {
  const response = await lambdaClient.send(
    new InvokeCommand({
      FunctionName: "GetUserInfo",
      Payload: JSON.stringify({ UserId: hostId }),
    })
  );

  const result = JSON.parse(new TextDecoder("utf-8").decode(response.Payload));
  if (result.statusCode !== 200) {
    throw new Error("GetUserInfo returned a non-200 status.");
  }

  const attributes = JSON.parse(result.body)?.[0]?.Attributes || [];
  const givenName = String(readAttribute(attributes, "given_name") || "").trim();
  const familyName = String(readAttribute(attributes, "family_name") || "").trim();
  const fullName = String(readAttribute(attributes, "name") || "").trim();

  return {
    email: String(readAttribute(attributes, "email") || "").trim() || null,
    name: [givenName, familyName].filter(Boolean).join(" ") || fullName || null,
  };
};

export default getHostContactById;
