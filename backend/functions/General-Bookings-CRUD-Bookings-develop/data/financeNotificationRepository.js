import Database from "database";
import { Team_Member } from "database/models/Team_Member";

class FinanceNotificationRepository {
  async getActiveTeamMembers(hostId) {
    const dataSource = await Database.getInstance();
    return dataSource.getRepository(Team_Member).find({
      where: { host_id: hostId, status: "active" },
    });
  }
}

export default FinanceNotificationRepository;
