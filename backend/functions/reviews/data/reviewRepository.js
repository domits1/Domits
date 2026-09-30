
import Database from "database";
import { Review } from "database/models/Review";

export class ReviewRepository {
    async create(record) {
        const dataSource = await Database.getInstance();
        return await dataSource
            .getRepository(Review)
            .save(record);
    }
}