/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Auth } from "aws-amplify";
import HostTeam from "./HostTeam";
import { fetchTeamMembers, fetchMemberships } from "./services/teamService";

jest.mock("aws-amplify", () => ({
    Auth: {
        currentAuthenticatedUser: jest.fn(),
    },
}));

jest.mock("./services/teamService", () => ({
    fetchTeamMembers: jest.fn(),
    fetchMemberships: jest.fn(),
    inviteTeamMember: jest.fn(),
    removeTeamMember: jest.fn(),
}));

const HOST_ATTRS = {
    given_name: "Jamie",
    family_name: "Host",
    email: "jamie.host@example.com",
    phone_number: "",
    picture: "",
    "custom:group": "Host",
};

const activeMember = {
    id: "member-active",
    member_email: "alex@example.com",
    role: "Reservation Manager",
    status: "active",
};

const pendingMember = {
    id: "member-pending",
    member_email: "sam@example.com",
    role: "General Manager",
    status: "pending",
};

const renderHostTeam = () =>
    render(
        <MemoryRouter>
            <HostTeam />
        </MemoryRouter>
    );

beforeEach(() => {
    jest.clearAllMocks();
    Auth.currentAuthenticatedUser.mockResolvedValue({ attributes: HOST_ATTRS });
    fetchMemberships.mockResolvedValue([]);
});

describe("HostTeam member list states", () => {
    test("shows a loading state while the member fetch is in flight", async () => {
        let resolveFetch;
        fetchTeamMembers.mockReturnValue(new Promise((resolve) => { resolveFetch = resolve; }));

        renderHostTeam();

        expect(await screen.findByText("Loading team members…")).toBeInTheDocument();

        resolveFetch([]);
        await waitFor(() => expect(screen.queryByText("Loading team members…")).not.toBeInTheDocument());
    });

    test("shows the load-error state when the fetch fails", async () => {
        fetchTeamMembers.mockRejectedValue(new Error("network down"));

        renderHostTeam();

        expect(await screen.findByText("Failed to load team members. Please refresh the page.")).toBeInTheDocument();
    });

    test("shows the empty state when there are no other team members", async () => {
        fetchTeamMembers.mockResolvedValue([]);

        renderHostTeam();

        expect(
            await screen.findByText("No additional team members yet. Invite a co-host to get started.")
        ).toBeInTheDocument();
    });
});

describe("HostTeam member table row rendering", () => {
    test("renders each member with role badge, permissions summary, and status, active sorted first", async () => {
        fetchTeamMembers.mockResolvedValue([pendingMember, activeMember]);

        renderHostTeam();

        expect(await screen.findByText("alex@example.com")).toBeInTheDocument();
        expect(screen.getByText("sam@example.com")).toBeInTheDocument();

        const reservationBadge = screen.getByText("Reservation Manager");
        expect(reservationBadge).toHaveClass("team-role-badge", "team-role-badge--reservation-manager");

        const generalBadge = screen.getByText("General Manager");
        expect(generalBadge).toHaveClass("team-role-badge", "team-role-badge--general-manager");

        expect(screen.getByText("Manage bookings")).toBeInTheDocument();
        expect(screen.getByText("Guest communication")).toBeInTheDocument();

        expect(screen.getByText("Active")).toBeInTheDocument();
        expect(screen.getByText("Pending")).toBeInTheDocument();

        const rows = document.querySelectorAll(".team-table-row");
        expect(rows).toHaveLength(2);
        expect(rows[0]).toHaveTextContent("alex@example.com");
        expect(rows[1]).toHaveTextContent("sam@example.com");
    });

    test("falls back to the base gray badge and empty-permissions dash for an unrecognized role", async () => {
        fetchTeamMembers.mockResolvedValue([
            { id: "m1", member_email: "x@example.com", role: "Mystery Role", status: "active" },
        ]);

        renderHostTeam();

        const badge = await screen.findByText("Mystery Role");
        expect(badge).toHaveClass("team-role-badge");
        expect(badge.className).toBe("team-role-badge");

        expect(screen.getByText("—")).toBeInTheDocument();
    });

    test("marks overflow permission chips and shows a '+N more' marker beyond the first two", async () => {
        fetchTeamMembers.mockResolvedValue([
            { id: "m1", member_email: "x@example.com", role: "General Manager", status: "active" },
        ]);

        renderHostTeam();

        const thirdChip = await screen.findByText("View finances");
        expect(thirdChip).toHaveClass("team-permission-chip--overflow");
        expect(screen.getByText("+1 more")).toBeInTheDocument();
    });

    test("opens the actions menu and triggers the remove confirmation", async () => {
        fetchTeamMembers.mockResolvedValue([activeMember]);

        renderHostTeam();

        await screen.findByText("alex@example.com");
        fireEvent.click(screen.getByRole("button", { name: "Open actions menu" }));
        fireEvent.click(screen.getByRole("menuitem", { name: "Remove" }));

        expect(await screen.findByText("Remove team member")).toBeInTheDocument();
    });
});

describe("HostTeam responsive collapse markers", () => {
    // jsdom doesn't evaluate CSS media queries, so the mobile stacked-card
    // layout (settingsDashboard.css, @media max-width: 640px) can't be
    // triggered directly here. What we can verify is the DOM contract the
    // CSS depends on: each collapsible cell carries a data-label attribute
    // that the mobile ::before rule reads via content: attr(data-label).
    test("role/permissions/status cells carry the data-label the mobile layout renders", async () => {
        fetchTeamMembers.mockResolvedValue([activeMember]);

        renderHostTeam();

        await screen.findByText("alex@example.com");
        expect(document.querySelector(".team-row-role")).toHaveAttribute("data-label", "Role");
        expect(document.querySelector(".team-row-permissions")).toHaveAttribute("data-label", "Permissions");
        expect(document.querySelector(".team-row-status")).toHaveAttribute("data-label", "Status");
    });
});
