import { Controller } from "./controller/controller.js";

let controller = null;

const OPTIONS_RESPONSE = {
    statusCode: 200,
    headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
    }
};

export const handler = async (event) => {
    try {
        if (!controller) {
            controller = new Controller();
        }

        const method = event.httpMethod;
        const path = event.path || "";

        if (method === "OPTIONS") return OPTIONS_RESPONSE;

        // GET /team/accept?token=xxx  — POM accepts an invite
        if (method === "GET" && path.endsWith("/accept")) {
            return await controller.acceptInvite(event);
        }

        // GET /team  — host lists their team members
        if (method === "GET") {
            return await controller.getTeamMembers(event);
        }

        // POST /team  — host invites a new member
        if (method === "POST") {
            return await controller.inviteMember(event);
        }

        // DELETE /team/{memberId}  — host removes a team member
        if (method === "DELETE") {
            return await controller.removeMember(event);
        }

        return {
            statusCode: 405,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: `Method ${method} not supported.` })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Internal Server Error", error: error.message })
        };
    }
};
