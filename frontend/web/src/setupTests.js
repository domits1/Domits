// jest-dom adds custom Jest matchers for asserting on DOM nodes.
import "@testing-library/jest-dom";

// jsdom does not provide TextEncoder/TextDecoder, which newer AWS SDK
// (@smithy/@aws-sdk) modules require at import time when `aws-amplify`
// is loaded. Polyfill them globally before any test runs.
import { TextEncoder, TextDecoder } from "node:util";
import { webcrypto } from "node:crypto";

if (!("TextEncoder" in globalThis)) {
  globalThis.TextEncoder = TextEncoder;
}
if (!("TextDecoder" in globalThis)) {
  globalThis.TextDecoder = TextDecoder;
}
if (!("crypto" in globalThis)) {
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: webcrypto });
}

Object.defineProperty(Element.prototype, "scrollIntoView", {
  configurable: true,
  value: jest.fn(),
});
