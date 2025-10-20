import { Repository } from "../../data/repository.js";

export class Service {
  repository;

  constructor() {
    this.repository = new Repository();
  }

  async createProperty(row) {
    return await this.repository.createProperty(row);
  }
}