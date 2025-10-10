import { Repository } from "../../data/repository.js";

export class Service {
  repository;

  constructor() {
    this.repository = new Repository();
  }

  async createProperty(row) {
    console.log("service create", row.id, row.registrationnumber, row.hostid);
    return await this.repository.createProperty(row);
  }
}