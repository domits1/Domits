import Database from "database";
import { Faq } from "database/models/Faq";
import "dotenv/config";
  
export default class FaqRepository {
  constructor() {}

  async getFinanceFaqs() {
    const client = await Database.getInstance();
    const records = await client
      .getRepository(Faq)
      .createQueryBuilder("faq")
      .where("faq.section = :section", { section: "finance" })
      .getMany();
      
    return records;
  }
}