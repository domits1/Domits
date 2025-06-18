import { GeneralDetailMapping } from "../../util/mapping/generalDetail.js";
import Database from "database";
import {General_Details} from "database/models/General_Details";
import {Property_General_Detail} from "database/models/Property_General_Detail";

export class PropertyGeneralDetailRepository {

    constructor(systemManager) {
        this.systemManager = systemManager
    }

    async getGeneralDetailById(id) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(General_Details)
            .createQueryBuilder("general_details")
            .where("detail = :id", { id: id })
            .getOne();
        return result ? result : null;
    }

    async getPropertyGeneralDetailById(id) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property_General_Detail)
            .createQueryBuilder("property_generaldetail")
            .where("id = :id", { id: id })
            .getOne();
        return result ? result : null
    }

    async create(detail) {
        const client = await Database.getInstance();
        await client
            .createQueryBuilder()
            .insert()
            .into(Property_General_Detail)
            .values({
                id: detail.id,
                property_id: detail.property_id,
                detail: detail.detail,
                value: detail.value
            })
            .execute();
        const result = await this.getPropertyGeneralDetailById(detail.id);
        return result ? result : null
    }

    async getPropertyGeneralDetailsByPropertyId(id) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property_General_Detail)
            .createQueryBuilder("property_generaldetail")
            .where("property_id = :id", { id: id })
            .getMany();
        return result.length > 0 ? result.map(item => GeneralDetailMapping.mapDatabaseEntryToGeneralDetail(item)) : null;
    }

}