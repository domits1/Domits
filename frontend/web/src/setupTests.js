// jsdom does not provide TextEncoder/TextDecoder, which newer AWS SDK
// (@smithy/@aws-sdk) modules require at import time when `aws-amplify`
// is loaded. Polyfill them globally before any test runs.
import { TextEncoder, TextDecoder } from "util";

if (typeof global.TextEncoder === "undefined") {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === "undefined") {
  global.TextDecoder = TextDecoder;
}
