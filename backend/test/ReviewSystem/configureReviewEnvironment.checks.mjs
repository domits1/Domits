import test from "node:test";
import assert from "node:assert/strict";
import { configureReviewEnvironment } from "../../CD/npm/configureReviewEnvironment.js";

const variables = { REVIEW_DECLINE_THRESHOLD: "0.5", REVIEW_TREND_MIN_REVIEWS: "3",
  REVIEW_EDIT_WINDOW_MS: "86400000", UNRELATED: "keep" };

test("retains and verifies existing configuration without writing", async () => {
  const commands = [];
  const client = { send: async (command) => {
    commands.push(command);
    return { Environment: { Variables: variables } };
  } };
  await configureReviewEnvironment(client, {});
  assert.deepEqual(commands.map((command) => command.constructor.name),
    ["GetFunctionConfigurationCommand", "GetFunctionConfigurationCommand"]);
});

test("merges overrides, preserves unrelated values, waits and verifies", async () => {
  const commands = [];
  let saved = { ...variables };
  let waited = false;
  const client = { send: async (command) => {
    commands.push(command);
    if (command.constructor.name === "UpdateFunctionConfigurationCommand") {
      assert.equal(command.input.RevisionId, "revision-1");
      saved = command.input.Environment.Variables;
      return {};
    }
    return { RevisionId: "revision-1", Environment: { Variables: saved } };
  } };
  await configureReviewEnvironment(client, { REVIEW_DECLINE_THRESHOLD: "0.3", REVIEW_TREND_MIN_REVIEWS: "" },
    async () => { waited = true; });
  assert.equal(waited, true);
  assert.deepEqual(saved, { ...variables, REVIEW_DECLINE_THRESHOLD: "0.3" });
  assert.equal(commands.length, 3);
});

test("rejects missing or invalid policy before writing", async () => {
  for (const settings of [{}, { ...variables, REVIEW_TREND_MIN_REVIEWS: "0" },
    { ...variables, REVIEW_EDIT_WINDOW_MS: "" }]) {
    const commands = [];
    const client = { send: async (command) => {
      commands.push(command);
      return { Environment: { Variables: settings } };
    } };
    await assert.rejects(configureReviewEnvironment(client, {}), /not configured/);
    assert.equal(commands.length, 1);
  }
});

test("rejects an environment readback mismatch", async () => {
  let calls = 0;
  const client = { send: async () => {
    calls += 1;
    return { Environment: { Variables: calls === 1 ? variables : {} } };
  } };
  await assert.rejects(configureReviewEnvironment(client, {}), /verification failed/);
});
