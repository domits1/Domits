import { ROLES, HOST_ROLES } from "../../auth/roles.js";

// The roles a host can actually assign through the team-invite flow: every
// HOST_ROLES entry except Admin and Host, which must never be grantable
// through that flow (see backend/functions/host-team/util/roles.js — the
// backend allow-list that actually enforces this).
export const TEAM_INVITABLE_ROLES = HOST_ROLES.filter(
    (role) => role !== ROLES.ADMIN && role !== ROLES.HOST
);

// Display-only text shown in the team table's "Permissions" column.
// This is cosmetic labeling, NOT an enforced permission set — the backend
// does not gate any action based on these strings. Real authorization is
// still the plain ownership/role checks in each Lambda's auth layer (see
// backend/functions/host-team and PropertyHandler auth managers).
export const ROLE_PERMISSIONS_SUMMARY = {
    [ROLES.GENERAL_MANAGER]: ["Full access", "Team", "Finances"],
    [ROLES.RESERVATION_MANAGER]: ["Bookings", "Messaging"],
    [ROLES.GUEST_EXPERIENCE_MANAGER]: ["Messaging", "Reviews"],
    [ROLES.FINANCIAL_MANAGER]: ["Finances", "Payouts"],
    [ROLES.DISTRIBUTION_MANAGER]: ["Channels", "Pricing"],
    [ROLES.REVENUE_MANAGER]: ["Pricing", "Finances"],
    [ROLES.SALES_MANAGER]: ["Bookings", "Messaging"],
    [ROLES.PROPERTY_OPERATIONS_MANAGER]: ["Bookings", "Listings"],
};

export const getRolePermissionsSummary = (role) => ROLE_PERMISSIONS_SUMMARY[role] || [];
