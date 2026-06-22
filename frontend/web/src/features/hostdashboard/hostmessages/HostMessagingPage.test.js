/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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
