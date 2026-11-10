import fs from "fs";
import path from "path";
import {
  REMOTELOCK_UI_ENABLED,
  STATUS_PRESENTATION,
  UNKNOWN_STATUS_PRESENTATION,
  getStatusPresentation,
} from "./homeAutomationConstants";

const sourceFilesIn = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFilesIn(entryPath);
    return /\.jsx?$/.test(entry.name) && !/\.test\.jsx?$/.test(entry.name) ? [entryPath] : [];
  });

describe("homeAutomationConstants", () => {
  // CRA does not polyfill Object.hasOwn, so Safari before 15.4 throws on it.
  it("does not use Object.hasOwn anywhere in the feature", () => {
    const offenders = sourceFilesIn(path.resolve(__dirname, "..")).filter((file) =>
      /Object\s*\.\s*hasOwn\b/.test(fs.readFileSync(file, "utf8"))
    );

    expect(offenders).toEqual([]);
  });

  it("ships switched off", () => {
    expect(REMOTELOCK_UI_ENABLED).toBe(false);
  });

  it.each([
    ["NOT_CONNECTED", "neutral", "notConnected", ["connect"]],
    ["CONNECTING", "pending", "connecting", ["connect"]],
    ["CONNECTED", "success", "connected", ["disconnect"]],
    ["AUTHENTICATION_ERROR", "error", "authenticationError", ["reconnect", "disconnect"]],
    ["CONNECTION_ERROR", "error", "connectionError", ["reconnect", "disconnect"]],
    ["DISCONNECTED", "neutral", "disconnected", ["connect"]],
    ["EXPIRED_CREDENTIALS", "error", "expiredCredentials", ["reconnect", "disconnect"]],
  ])("%s has tone %s, label key %s and actions %j", (status, tone, labelKey, actions) => {
    expect(getStatusPresentation(status)).toEqual({ tone, labelKey, actions });
  });

  it("knows exactly seven statuses", () => {
    expect(Object.keys(STATUS_PRESENTATION)).toHaveLength(7);
  });

  it.each([undefined, null, "", "SOMETHING_NEW", "constructor", "__proto__", "toString"])(
    "treats %j as unknown: neutral and no actions",
    (status) => {
      expect(getStatusPresentation(status)).toBe(UNKNOWN_STATUS_PRESENTATION);
      expect(UNKNOWN_STATUS_PRESENTATION).toEqual({ tone: "neutral", labelKey: "unknown", actions: [] });
    }
  );
});
