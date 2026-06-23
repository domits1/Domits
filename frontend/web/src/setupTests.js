// jest-dom adds custom Jest matchers for asserting on DOM nodes.
import "@testing-library/jest-dom";

// jsdom does not provide TextEncoder/TextDecoder, which newer AWS SDK
// (@smithy/@aws-sdk) modules require at import time when `aws-amplify`
// is loaded. Polyfill them globally before any test runs.
import { TextEncoder, TextDecoder } from "node:util";

if (globalThis.TextEncoder === undefined) {
  globalThis.TextEncoder = TextEncoder;
}
if (globalThis.TextDecoder === undefined) {
  globalThis.TextDecoder = TextDecoder;
}

Object.defineProperty(Element.prototype, "scrollIntoView", {
  configurable: true,
  value: jest.fn(),
});
