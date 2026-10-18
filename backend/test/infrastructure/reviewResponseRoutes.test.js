import fs from "node:fs";
import path from "node:path";

const template = JSON.parse(fs.readFileSync(path.join(__dirname,
  "../../infrastructure/review-response/template.json"), "utf8"));
const resources = template.Resources;

test.each([
  ["SaveDraft", "ResponseResource", "POST", "response"],
  ["EditResponse", "ResponseResource", "PATCH", "response"],
  ["PublishResponse", "PublishResource", "POST", "response/publish"],
])("%s requires the existing authorizer and grants invocation only for its API route", (name, resource, method, suffix) => {
  const config = resources[`${name}Method`].Properties;
  expect(config).toMatchObject({ RestApiId: { Ref: "RestApiId" }, ResourceId: { Ref: resource },
    HttpMethod: method, AuthorizationType: "COGNITO_USER_POOLS", AuthorizerId: { Ref: "AuthorizerId" },
    RequestParameters: { "method.request.path.id": true }, Integration: { Type: "AWS_PROXY", IntegrationHttpMethod: "POST" } });
  expect(config.AuthorizationScopes["Fn::If"]).toEqual([
    "HasAuthorizationScopes", { Ref: "AuthorizationScopes" }, { Ref: "AWS::NoValue" },
  ]);
  expect(config.Integration.Uri["Fn::Sub"]).toContain("${ReviewSystemLambdaArn}/invocations");
  const permission = resources[`${name}Permission`].Properties;
  expect(permission.Principal).toBe("apigateway.amazonaws.com");
  expect(permission.SourceArn["Fn::Sub"]).toBe(
    "arn:${AWS::Partition}:execute-api:${AWS::Region}:${AWS::AccountId}:${RestApiId}/*/" + method + "/reviews/*/" + suffix);
});

test.each(["Response", "Publish"])("%s preflight is unauthenticated and allows authorization headers", (name) => {
  const config = resources[`${name}OptionsMethod`].Properties;
  expect(config).toMatchObject({ HttpMethod: "OPTIONS", AuthorizationType: "NONE", ApiKeyRequired: false });
  expect(config.Integration.Type).toBe("MOCK");
  expect(config.Integration.IntegrationResponses[0].ResponseParameters)
    .toMatchObject({ "method.response.header.Access-Control-Allow-Headers": "'Content-Type,Authorization'" });
});

test("extends the existing review resource without replacing the API or stage", () => {
  expect(resources.ResponseResource.Properties.ParentId).toEqual({ Ref: "ReviewResourceId" });
  expect(resources.PublishResource.Properties.ParentId).toEqual({ Ref: "ResponseResource" });
  expect(Object.values(resources).some(({ Type }) => ["AWS::ApiGateway::RestApi", "AWS::ApiGateway::Stage"].includes(Type))).toBe(false);
});
