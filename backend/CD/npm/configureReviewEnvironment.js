import { pathToFileURL } from "node:url";
import { LambdaClient, GetFunctionConfigurationCommand, UpdateFunctionConfigurationCommand,
  waitUntilFunctionUpdatedV2 } from "@aws-sdk/client-lambda";
import { readTrendPolicy } from "../../functions/ReviewSystem/business/ratingTrends.js";

export async function configureReviewEnvironment(client, env = process.env, waitForUpdate = waitUntilFunctionUpdatedV2) {
  const FunctionName = "ReviewSystem";
  const before = await client.send(new GetFunctionConfigurationCommand({ FunctionName }));
  if (before.Environment?.Error) throw new Error("Cannot read ReviewSystem environment configuration.");
  const variables = { ...before.Environment?.Variables };
  const keys = ["REVIEW_DECLINE_THRESHOLD", "REVIEW_TREND_MIN_REVIEWS"];
  for (const key of keys) {
    if (env[key] !== undefined && env[key] !== "") variables[key] = env[key];
  }
  readTrendPolicy(variables);
  const changed = keys.some((key) => variables[key] !== before.Environment?.Variables?.[key]);
  if (changed) {
    await client.send(new UpdateFunctionConfigurationCommand({ FunctionName,
      RevisionId: before.RevisionId, Environment: { Variables: variables } }));
    await waitForUpdate({ client, maxWaitTime: 120 }, { FunctionName });
  }
  const after = await client.send(new GetFunctionConfigurationCommand({ FunctionName }));
  if (after.Environment?.Error || keys.some((key) => after.Environment?.Variables?.[key] !== variables[key])) {
    throw new Error("ReviewSystem environment verification failed.");
  }
  console.log("ReviewSystem trend policy verified.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  configureReviewEnvironment(new LambdaClient({})).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
