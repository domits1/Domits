import Database from "database";
import { Team_Member } from "database/models/Team_Member";
import { UnauthorizedException } from "../../util/exception/unauthorizedException.js";

const OWN_HOST_ROLES = new Set(["Admin", "Host", "General Manager", "Reservation Manager",
    "Guest Experience Manager", "Financial Manager", "Distribution Manager",
    "Revenue Manager", "Sales Manager"]);

export const resolveEffectiveHostId = async (callerUsername, callerRole, asHostId) => {
    const dataSource = await Database.getInstance();
    const repo = dataSource.getRepository(Team_Member);

    if (asHostId) {
        const membership = await repo.findOne({
            where: { member_user_id: callerUsername, host_id: asHostId, status: "active" },
        });
        if (!membership) {
            throw new UnauthorizedException("You are not a co-host for this host.");
        }
        return { effectiveHostId: asHostId, isPOM: true };
    }

    if (OWN_HOST_ROLES.has(callerRole)) {
        return { effectiveHostId: callerUsername, isPOM: false };
    }

    const membership = await repo.findOne({
        where: { member_user_id: callerUsername, status: "active" },
    });
    return {
        effectiveHostId: membership ? membership.host_id : callerUsername,
        isPOM: !!membership,
    };
};
