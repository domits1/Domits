import { GeneralDetailMapping } from "../../util/mapping/generalDetail.js";
import Database from "database";
import {General_Details} from "database/models/General_Details";
import {
    Property_General_Detail,
    PROPERTY_GENERAL_DETAIL_TABLE_NAMES
} from "database/models/Property_General_Detail";
import { randomUUID } from "node:crypto";

const PROPERTY_GENERAL_DETAIL_TABLE = PROPERTY_GENERAL_DETAIL_TABLE_NAMES.current;
const PROPERTY_GENERAL_DETAIL_COLUMNS = Object.freeze({
    id: "id",
    propertyId: "property_id",
    detail: "detail",
    value: "value"
});

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
            .createQueryBuilder(PROPERTY_GENERAL_DETAIL_TABLE)
            .where(`${PROPERTY_GENERAL_DETAIL_COLUMNS.id} = :id`, { id: id })
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
                [PROPERTY_GENERAL_DETAIL_COLUMNS.id]: detail.id,
                [PROPERTY_GENERAL_DETAIL_COLUMNS.propertyId]: detail.property_id,
                [PROPERTY_GENERAL_DETAIL_COLUMNS.detail]: detail.detail,
                [PROPERTY_GENERAL_DETAIL_COLUMNS.value]: detail.value
            })
            .execute();
        const result = await this.getPropertyGeneralDetailById(detail.id);
        return result ? result : null
    }

    async getPropertyGeneralDetailsByPropertyId(id) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property_General_Detail)
            .createQueryBuilder(PROPERTY_GENERAL_DETAIL_TABLE)
            .where(`${PROPERTY_GENERAL_DETAIL_COLUMNS.propertyId} = :id`, { id: id })
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
                .createQueryBuilder(PROPERTY_GENERAL_DETAIL_TABLE)
                .where(`${PROPERTY_GENERAL_DETAIL_COLUMNS.propertyId} = :propertyId`, { propertyId })
                .andWhere(`${PROPERTY_GENERAL_DETAIL_COLUMNS.detail} = :detail`, { detail: detail.detail })
                .getOne();

            if (existing) {
                await client
                    .createQueryBuilder()
                    .update(Property_General_Detail)
                    .set({ [PROPERTY_GENERAL_DETAIL_COLUMNS.value]: Math.max(0, Math.trunc(normalizedValue)) })
                    .where(`${PROPERTY_GENERAL_DETAIL_COLUMNS.id} = :id`, { id: existing.id })
                    .execute();
            } else {
                await client
                    .createQueryBuilder()
                    .insert()
                    .into(Property_General_Detail)
                    .values({
                        [PROPERTY_GENERAL_DETAIL_COLUMNS.id]: randomUUID(),
                        [PROPERTY_GENERAL_DETAIL_COLUMNS.propertyId]: propertyId,
                        [PROPERTY_GENERAL_DETAIL_COLUMNS.detail]: detail.detail,
                        [PROPERTY_GENERAL_DETAIL_COLUMNS.value]: Math.max(0, Math.trunc(normalizedValue))
                    })
                    .execute();
            }
        }

        return this.getPropertyGeneralDetailsByPropertyId(propertyId);
    }

}
