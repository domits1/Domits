require("../jestPolyfills");

// jest-dom adds custom Jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
require("@testing-library/jest-dom");

Object.defineProperty(Element.prototype, "scrollIntoView", {
  configurable: true,
  value: jest.fn(),
});
