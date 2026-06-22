// jest-dom adds custom Jest matchers for asserting on DOM nodes.
import "@testing-library/jest-dom";

Object.defineProperty(Element.prototype, "scrollIntoView", {
  configurable: true,
  value: jest.fn(),
});
