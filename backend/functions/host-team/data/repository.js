import { Team_Member } from "database/models/Team_Member";

export class Repository {

    async findByHostId(dataSource, hostId) {
        return await dataSource
            .getRepository(Team_Member)
            .find({ where: { host_id: hostId } });
    }

    async findById(dataSource, id) {
        return await dataSource
            .getRepository(Team_Member)
            .findOne({ where: { id } });
    }

    async findByToken(dataSource, token) {
        return await dataSource
            .getRepository(Team_Member)
            .findOne({ where: { invite_token: token } });
    }

    async findByMemberId(dataSource, userId) {
        return await dataSource
            .getRepository(Team_Member)
            .find({ where: { member_user_id: userId, status: "active" } });
    }

    async findByHostAndEmail(dataSource, hostId, email) {
        return await dataSource
            .getRepository(Team_Member)
            .findOne({ where: { host_id: hostId, member_email: email } });
    }

    async create(dataSource, record) {
        return await dataSource
            .getRepository(Team_Member)
            .save(record);
    }

    async update(dataSource, id, data) {
        await dataSource
            .getRepository(Team_Member)
            .update({ id }, data);
    }

    async delete(dataSource, id) {
        await dataSource
            .getRepository(Team_Member)
            .delete({ id });
    }
}
