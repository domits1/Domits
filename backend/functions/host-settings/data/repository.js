import { Host_Settings } from "database/models/Host_Settings";

export class Repository {

    async getSettings(dataSource, hostId) {
        return await dataSource
            .getRepository(Host_Settings)
            .findOne({ where: { host_id: hostId } });
    }

    async upsertSettings(dataSource, record) {
        await dataSource
            .getRepository(Host_Settings)
            .save(record);
    }
}