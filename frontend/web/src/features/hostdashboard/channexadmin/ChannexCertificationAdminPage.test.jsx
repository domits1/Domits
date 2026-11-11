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

jest.mock("./health/ChannexHealthSection", () => {
  const React = require("react");
  return function MockChannexHealthSection() {
    return React.createElement("div", null, "Channex health loaded");
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

    const { container } = render(<ChannexCertificationAdminPage />);

    expect(screen.getByText("Checking access")).toBeTruthy();
    expect(await screen.findByText("Channex diagnostics loaded")).toBeTruthy();
    expect(getChannexAdminAccess).toHaveBeenCalledWith({ userId: "allowed-user" });
    expect(screen.getByRole("heading", { level: 1, name: "Channex diagnostics" })).toBeTruthy();
    expect(container.textContent).not.toMatch(/certification/i);
  });

  test("shows the health section above the diagnostics panel for an allowed user (#2869)", async () => {
    getChannexAdminAccess.mockResolvedValue({ allowed: true });

    render(<ChannexCertificationAdminPage />);

    const health = await screen.findByText("Channex health loaded");
    const diagnostics = screen.getByText("Channex diagnostics loaded");
    expect(health.compareDocumentPosition(diagnostics) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test("shows not authorized when backend admin-access denies the user", async () => {
    getChannexAdminAccess.mockResolvedValue({ allowed: false });

    const { container } = render(<ChannexCertificationAdminPage />);

    expect(await screen.findByText("Not authorized")).toBeTruthy();
    expect(screen.queryByText("Channex diagnostics loaded")).toBeNull();
    expect(screen.queryByText("Channex health loaded")).toBeNull();
    expect(container.textContent).not.toMatch(/certification/i);
  });

  test("denies access safely when backend admin-access check fails", async () => {
    getChannexAdminAccess.mockRejectedValue(new Error("network unavailable"));

    render(<ChannexCertificationAdminPage />);

    await waitFor(() => expect(getChannexAdminAccess).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Not authorized")).toBeTruthy();
    expect(screen.queryByText("Channex diagnostics loaded")).toBeNull();
  });
});
