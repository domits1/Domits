import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import ChannexCertificationAdminPage from "./ChannexCertificationAdminPage";
import { useAuth } from "../hostmessages/hooks/useAuth";
import { getChannexAdminAccess } from "../hostintegrations/channexApi";

jest.mock("../hostmessages/context/AuthContext", () => {
  const React = require("react");
  const PropTypes = require("prop-types");
  function MockUserProvider({ children }) {
    return React.createElement(React.Fragment, null, children);
  }
  MockUserProvider.propTypes = {
    children: PropTypes.node,
  };
  return {
    UserProvider: MockUserProvider,
  };
});

jest.mock("../hostmessages/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../hostintegrations/ChannexDiagnosticsPanel", () => {
  const React = require("react");
  return function MockChannexDiagnosticsPanel() {
    return React.createElement("div", null, "Channex diagnostics loaded");
  };
});

jest.mock("../hostintegrations/channexApi", () => ({
  getChannexAdminAccess: jest.fn(),
}));

describe("ChannexCertificationAdminPage", () => {
  beforeEach(() => {
    delete process.env.REACT_APP_CHANNEX_CERTIFICATION_USER_IDS;
    jest.clearAllMocks();
    useAuth.mockReturnValue({ userId: "allowed-user" });
  });

  test("shows Channex admin page when backend admin-access allows the user", async () => {
    getChannexAdminAccess.mockResolvedValue({ allowed: true });

    render(<ChannexCertificationAdminPage />);

    expect(screen.getByText("Checking access")).toBeTruthy();
    expect(await screen.findByText("Channex diagnostics loaded")).toBeTruthy();
    expect(getChannexAdminAccess).toHaveBeenCalledWith({ userId: "allowed-user" });
  });

  test("shows not authorized when backend admin-access denies the user", async () => {
    getChannexAdminAccess.mockResolvedValue({ allowed: false });

    render(<ChannexCertificationAdminPage />);

    expect(await screen.findByText("Not authorized")).toBeTruthy();
    expect(screen.queryByText("Channex diagnostics loaded")).toBeNull();
  });

  test("denies access safely when backend admin-access check fails", async () => {
    getChannexAdminAccess.mockRejectedValue(new Error("network unavailable"));

    render(<ChannexCertificationAdminPage />);

    await waitFor(() => expect(getChannexAdminAccess).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Not authorized")).toBeTruthy();
    expect(screen.queryByText("Channex diagnostics loaded")).toBeNull();
  });
});
