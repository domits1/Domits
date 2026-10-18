import { waitFor } from "@testing-library/react";

export const mockJsonResponse = (body, ok = true) => ({
  ok,
  status: ok ? 200 : 400,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

export const createGetAccessTokenMock = () => ({
  __esModule: true,
  getIdToken: jest.fn(),
});

export const createAuthContextMock = () => {
  const React = require("react");
  return {
    __esModule: true,
    UserProvider: ({ children }) => React.createElement(React.Fragment, null, children),
  };
};

export const createUseAuthMock = (userId = "host-1") => ({
  __esModule: true,
  useAuth: () => ({ userId }),
});

export const expectAuthorizedCall = (pathFragment, token = "id-token-1") =>
  waitFor(() =>
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining(pathFragment),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${token}` }),
      })
    )
  );
