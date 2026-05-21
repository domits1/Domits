import { getAccessToken } from "../../../services/getAccessToken";

const TEAM_API_URL = "https://0jpcbp40hf.execute-api.eu-north-1.amazonaws.com/default";

const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: getAccessToken(),
});

export const fetchTeamMembers = async () => {
    const response = await fetch(TEAM_API_URL, { method: "GET", headers: getHeaders() });
    if (!response.ok) throw new Error(`Failed to fetch team members: ${response.status}`);
    return response.json();
};

export const inviteTeamMember = async (email, role) => {
    const response = await fetch(TEAM_API_URL, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ email, role }),
    });
    if (!response.ok) throw new Error(`Failed to invite team member: ${response.status}`);
    return response.json();
};

export const fetchMemberships = async () => {
    const response = await fetch(`${TEAM_API_URL}?action=memberships`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!response.ok) throw new Error(`Failed to fetch memberships: ${response.status}`);
    return response.json();
};

export const acceptTeamInvite = async (token) => {
    const response = await fetch(`${TEAM_API_URL}?action=accept&token=${token}`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!response.ok) throw new Error(`Failed to accept invite: ${response.status}`);
    return response.json();
};

export const removeTeamMember = async (memberId) => {
    const response = await fetch(`${TEAM_API_URL}?id=${memberId}`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!response.ok) throw new Error(`Failed to remove team member: ${response.status}`);
    return response.json();
};
