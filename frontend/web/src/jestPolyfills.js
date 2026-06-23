const util = require("util");

Object.defineProperty(global, "TextEncoder", {
  writable: true,
  value: util.TextEncoder,
});

Object.defineProperty(global, "TextDecoder", {
  writable: true,
  value: util.TextDecoder,
});
