import Database from "database";
import { Company_Profile } from "database/models/Company_Profile";

export class CompanyProfileRepository {
  async findByHostId(hostId) {
    const dataSource = await Database.getInstance();
    return await dataSource
      .getRepository(Company_Profile)
      .findOne({ where: { host_id: hostId } });
  }

  async save(record) {
    const dataSource = await Database.getInstance();
    return await dataSource
      .getRepository(Company_Profile)
      .save(record);
  }
}
