import Database from "database";
import { Team_Member } from "database/models/Team_Member";

export class TeamMemberRepository {
    async findActiveMembershipByMemberAndHost(memberUserId, hostId) {
        const dataSource = await Database.getInstance();
        return await dataSource
            .getRepository(Team_Member)
            .findOne({
                where: {
                    member_user_id: memberUserId,
                    host_id: hostId,
                    status: "active",
                },
            });
    }
}
