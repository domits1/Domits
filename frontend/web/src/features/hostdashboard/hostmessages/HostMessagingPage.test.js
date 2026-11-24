/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import HostMessagingPage from "./HostMessagingPage";

jest.mock("../../../components/messages/Messages", () => () => <div>Host inbox</div>);
jest.mock("./automations/AutomationsPage", () => () => <div>Host automations area</div>);

describe("HostMessagingPage routing", () => {
  test("exposes Automations only inside the host messaging wrapper", () => {
    render(
      <MemoryRouter initialEntries={["/automations"]}>
        <HostMessagingPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "Inbox" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Automations" })).toBeInTheDocument();
    expect(screen.getByText("Host automations area")).toBeInTheDocument();
  });
});

describe("HostMessagingPage inside the host dashboard routes", () => {
  const renderAt = (path) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/hostdashboard/*" element={<Routes><Route path="messages/*" element={<HostMessagingPage />} /></Routes>} />
        </Routes>
      </MemoryRouter>
    );

  test("tabs link to the inbox and automations, also from the automations page", () => {
    renderAt("/hostdashboard/messages/automations");
    expect(screen.getByRole("link", { name: "Inbox" })).toHaveAttribute("href", "/hostdashboard/messages");
    expect(screen.getByRole("link", { name: "Automations" })).toHaveAttribute("href", "/hostdashboard/messages/automations");
  });

  test("an unknown messaging URL goes back to the inbox", () => {
    renderAt("/hostdashboard/messages/does-not-exist");
    expect(screen.getByText("Host inbox")).toBeInTheDocument();
  });
});
