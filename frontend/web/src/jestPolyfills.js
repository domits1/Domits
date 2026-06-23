const util = require("node:util");

Object.defineProperty(globalThis, "TextEncoder", {
  writable: true,
  value: util.TextEncoder,
});

Object.defineProperty(globalThis, "TextDecoder", {
  writable: true,
  value: util.TextDecoder,
});
