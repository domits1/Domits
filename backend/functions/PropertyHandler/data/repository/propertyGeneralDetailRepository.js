import { GeneralDetailMapping } from "../../util/mapping/generalDetail.js";
import Database from "database";
import {General_Details} from "database/models/General_Details";
import {Property_General_Detail} from "database/models/Property_General_Detail";
import { randomUUID } from "node:crypto";

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

    async upsertPropertyGeneralDetailsByPropertyId(propertyId, details) {
        const client = await Database.getInstance();

        for (const detail of details) {
            const normalizedValue = Number(detail.value);
            if (!Number.isFinite(normalizedValue)) {
                throw new TypeError(`Failed to update ${detail.detail}: value must be a number.`);
            }

            const existing = await client
                .getRepository(Property_General_Detail)
                .createQueryBuilder("property_generaldetail")
                .where("property_id = :propertyId", { propertyId })
                .andWhere("detail = :detail", { detail: detail.detail })
                .getOne();

            if (existing) {
                await client
                    .createQueryBuilder()
                    .update(Property_General_Detail)
                    .set({ value: Math.max(0, Math.trunc(normalizedValue)) })
                    .where("id = :id", { id: existing.id })
                    .execute();
            } else {
                await client
                    .createQueryBuilder()
                    .insert()
                    .into(Property_General_Detail)
                    .values({
                        id: randomUUID(),
                        property_id: propertyId,
                        detail: detail.detail,
                        value: Math.max(0, Math.trunc(normalizedValue))
                    })
                    .execute();
            }
        }

        return this.getPropertyGeneralDetailsByPropertyId(propertyId);
    }

}
