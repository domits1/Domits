import {NotFoundException} from "../../util/exception/NotFoundException.js";
import {PropertyBaseInfoMapping} from "../../util/mapping/propertyBaseInfo.js";
import Database from "database";
import {Property} from "database/models/Property";

export class PropertyRepository {

    constructor(systemManager) {
        this.systemManager = systemManager
    }

    async create(property) {
        const client = await Database.getInstance();
        await client
            .createQueryBuilder()
            .insert()
            .into(Property)
            .values({
                id: property.id,
                title: property.title,
                subtitle: property.subtitle,
                description: property.description,
                registrationnumber: property.registrationNumber,
                hostid: property.hostId,
                status: property.status,
                createdat: property.createdAt,
                updatedat: 0
            })
            .execute();
        const result = await this.getPropertyById(property.id);
        return result ? result : null;
    }

    async activateProperty(propertyId) {
        const client = await Database.getInstance();
        await client
            .createQueryBuilder()
            .update(Property)
            .set({ status: "ACTIVE" })
            .where("id = :id", { id: propertyId })
            .execute();
    }

    async getArchiveMetadataColumns(client) {
        const result = await client.query(
            `SELECT column_name
             FROM information_schema.columns
             WHERE table_schema = current_schema()
               AND table_name = 'property'
               AND column_name IN ('archivedat', 'archivedby', 'archivereason')`
        );
        const columns = new Set();
        (Array.isArray(result) ? result : []).forEach((row) => {
            if (row?.column_name) {
                columns.add(String(row.column_name).toLowerCase());
            }
        });
        return columns;
    }

    async updatePropertyStatus(propertyId, status, metadata = {}) {
        const client = await Database.getInstance();
        const now = Date.now();
        await client
            .createQueryBuilder()
            .update(Property)
            .set({
                status,
                updatedat: now,
            })
            .where("id = :id", { id: propertyId })
            .execute();

        const archiveColumns = await this.getArchiveMetadataColumns(client);
        if (archiveColumns.size === 0) {
            return;
        }

        const metadataUpdates = [];
        const metadataParams = [propertyId];

        if (status === "ARCHIVED") {
            if (archiveColumns.has("archivedat")) {
                metadataParams.push(now);
                metadataUpdates.push(`archivedat = $${metadataParams.length}`);
            }
            if (archiveColumns.has("archivedby")) {
                metadataParams.push(String(metadata.archivedBy || ""));
                metadataUpdates.push(`archivedby = $${metadataParams.length}`);
            }
            if (archiveColumns.has("archivereason")) {
                metadataParams.push(String(metadata.archiveReason || ""));
                metadataUpdates.push(`archivereason = $${metadataParams.length}`);
            }
        } else {
            if (archiveColumns.has("archivedat")) {
                metadataUpdates.push("archivedat = NULL");
            }
            if (archiveColumns.has("archivedby")) {
                metadataUpdates.push("archivedby = NULL");
            }
            if (archiveColumns.has("archivereason")) {
                metadataUpdates.push("archivereason = NULL");
            }
        }

        if (metadataUpdates.length === 0) {
            return;
        }

        await client.query(
            `UPDATE property SET ${metadataUpdates.join(", ")} WHERE id = $1`,
            metadataParams
        );
    }

    async updatePropertyOverview(propertyId, title, subtitle, description) {
        const client = await Database.getInstance();
        await client
            .createQueryBuilder()
            .update(Property)
            .set({
                title: title,
                subtitle: subtitle,
                description: description,
                updatedat: Date.now(),
            })
            .where("id = :id", { id: propertyId })
            .execute();

        return await this.getPropertyById(propertyId);
    }

    async getActivePropertiesByType(type) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property)
            .createQueryBuilder("property")
            .innerJoin("property_type", "pt", "pt.property_id = property.id")
            .where("pt.type = :type", { type: type })
            .andWhere("property.status = :status", { status: "ACTIVE" })
            .limit(12)
            .getMany();

        if (result.length < 1) {
            throw new NotFoundException(`No property found.`);
        } else {
            return result.map(item => item.id);
        }
    }


    async getActiveProperties(lastEvaluatedKey) {
        const client = await Database.getInstance();
        const query = await client
            .getRepository(Property)
            .createQueryBuilder("property")
            .where("property.status = :status", { status: "ACTIVE" })
            .orderBy("property.createdat", "DESC")
            .addOrderBy("property.id", "DESC")
            .limit(12)

        if (lastEvaluatedKey?.createdAt && lastEvaluatedKey?.id) {
            query.andWhere(
                "(property.createdat < :createdAt OR (property.createdat = :createdAt AND property.id < :id))",
                {
                    createdAt: lastEvaluatedKey.createdAt,
                    id: lastEvaluatedKey.id,
                }
            );
        }

        const result = await query.getMany();

        if (result.length < 1) {
            throw new NotFoundException(`No property found.`)
        } else {
            const items = result.map(item => item.id);

            const lastItem = result[result.length - 1];
            const lastEvaluatedKey = {
                createdAt: lastItem.createdat,
                id: lastItem.id,
            }

            return {
                identifiers: items,
                lastEvaluatedKey: lastEvaluatedKey,
            };
        }
    }

    async getPropertiesByHostId(hostId) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property)
            .createQueryBuilder("property")
            .where("property.hostid = :hostid", { hostid: hostId })
            .getMany();
        if (result.length < 1) {
            throw new NotFoundException(`No property found.`)
        } else {
            return result.map(item => {
                return item.id
            })
        }
    }

    async getActivePropertiesByHostId(hostId) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property)
            .createQueryBuilder("property")
            .where("property.status = :status", { status: "ACTIVE" })
            .andWhere("property.hostid = :hostid", { hostid: hostId })
            .limit(12)
            .getMany();
        if (result.length < 1) {
            throw new NotFoundException(`No property found.`)
        } else {
            return result.map(item => {
                return item.id
            })
        }
    }

    async getPropertyById(id) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property)
            .createQueryBuilder("property")
            .where("property.id = :id", { id: id })
            .getOne();

        return result ? PropertyBaseInfoMapping.mapDatabaseEntryToPropertyBaseInfo(result) : null;
    }

}