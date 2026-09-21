export const DEFAULT_TEAM_MEMBER_ROLE = "Property Operations Manager";

// "Host" and "Admin" must never be settable through inviteMember or
// updateMemberRole: acceptInvite() writes this value straight into the
// invitee's Cognito custom:group attribute, so allowing either here would
// let a host grant account-owner-level group membership to someone else's
// account. Editing a role must not be a bigger privilege-escalation path
// than inviting one, so both operations share this same allow-list.
export const ALLOWED_TEAM_MEMBER_ROLES = Object.freeze([
  "General Manager",
  "Reservation Manager",
  "Guest Experience Manager",
  "Financial Manager",
  "Distribution Manager",
  "Revenue Manager",
  "Sales Manager",
  "Property Operations Manager",
]);
