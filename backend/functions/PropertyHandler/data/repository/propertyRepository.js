import {NotFoundException} from "../../util/exception/NotFoundException.js";
import {ConflictException} from "../../util/exception/ConflictException.js";
import {REGISTRATION_NUMBER_TAKEN_MESSAGE} from "../../util/constant/registrationNumber.js";
import {PropertyBaseInfoMapping} from "../../util/mapping/propertyBaseInfo.js";
import {PaginatedPropertyMapping} from "../../util/mapping/paginatedProperty.js";
import Database from "database";
import {Property} from "database/models/Property";
import {Property_Moderation_Event} from "database/models/Property_Moderation_Event";
import {randomUUID} from "node:crypto";
import {withDsqlRetry} from "../../../.shared/dsqlRetry.js";

const UNIQUE_VIOLATION_CODE = "23505";
const MODERATION_ACTIONS = new Set(["SUBMITTED", "APPROVED", "REJECTED"]);

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
                updatedat: 0,
                bookingtype: property.bookingType || "direct",
            })
            .execute();
        const result = await this.getPropertyById(property.id);
        return result ? result : null;
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

    buildArchiveMetadataUpdateClauses(status, archiveColumns, metadata, now, metadataParams) {
        if (status !== "ARCHIVED") {
            return ["archivedat", "archivedby", "archivereason"]
                .filter((column) => archiveColumns.has(column))
                .map((column) => `${column} = NULL`);
        }

        const updates = [];
        const columnDefinitions = [
            { column: "archivedat", value: now },
            { column: "archivedby", value: String(metadata.archivedBy || "") },
            { column: "archivereason", value: String(metadata.archiveReason || "") },
        ];

        columnDefinitions.forEach(({ column, value }) => {
            if (!archiveColumns.has(column)) {
                return;
            }
            metadataParams.push(value);
            updates.push(`${column} = $${metadataParams.length}`);
        });

        return updates;
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

        const metadataParams = [];
        const metadataUpdates = this.buildArchiveMetadataUpdateClauses(
            status,
            archiveColumns,
            metadata,
            now,
            metadataParams
        );

        if (metadataUpdates.length === 0) {
            return;
        }

        metadataParams.push(propertyId);

        await client.query(
            `UPDATE property SET ${metadataUpdates.join(", ")} WHERE id = $${metadataParams.length}`,
            metadataParams
        );
    }

    // Compare-and-set: the single UPDATE only matches while the current status is one of fromStatuses,
    // so a concurrent approval or rejection is never overwritten. Returns the number of rows changed.
    // Only a move out of ARCHIVED clears the archive metadata; moving into ARCHIVED (which records
    // who archived) stays with updatePropertyStatus.
    async transitionStatus(propertyId, fromStatuses, toStatus) {
        if (!Array.isArray(fromStatuses) || fromStatuses.length === 0) {
            throw new TypeError("transitionStatus needs at least one from-status.");
        }

        const client = await Database.getInstance();
        const now = Date.now();
        const result = await client
            .createQueryBuilder()
            .update(Property)
            .set({ status: toStatus, updatedat: now })
            .where("id = :id AND status IN (:...fromStatuses)", { id: propertyId, fromStatuses })
            .execute();

        const affected = Number(result?.affected) || 0;
        if (affected > 0 && fromStatuses.includes("ARCHIVED") && toStatus !== "ARCHIVED") {
            await this.clearArchiveMetadata(client, propertyId, toStatus, now);
        }
        return affected;
    }

    async transitionStatusWithEvent(
        propertyId,
        {fromStatuses, toStatus, action, actorId, reason = null, expectedUpdatedAt}
    ) {
        if (!Array.isArray(fromStatuses) || fromStatuses.length === 0) {
            throw new TypeError("transitionStatusWithEvent needs at least one from-status.");
        }
        if (!MODERATION_ACTIONS.has(action)) {
            throw new TypeError("transitionStatusWithEvent needs a moderation action.");
        }
        if (typeof actorId !== "string" || actorId === "") {
            throw new TypeError("transitionStatusWithEvent needs an actor.");
        }

        const client = await Database.getInstance();
        const eventId = randomUUID();
        const now = Date.now();

        return await withDsqlRetry(() =>
            client.transaction(async (manager) => {
                const current = await manager
                    .createQueryBuilder(Property, "property")
                    .select(["property.status", "property.updatedat"])
                    .where("property.id = :id", {id: propertyId})
                    .getOne();
                if (!current) {
                    return {outcome: "not_found"};
                }

                const currentStatus = current.status;
                const currentUpdatedAt = Number(current.updatedat);
                if (!fromStatuses.includes(currentStatus)) {
                    return {outcome: "wrong_status", currentStatus};
                }
                if (expectedUpdatedAt !== undefined && expectedUpdatedAt !== currentUpdatedAt) {
                    return {outcome: "stale", currentUpdatedAt};
                }

                const result = await manager
                    .createQueryBuilder()
                    .update(Property)
                    .set({status: toStatus, updatedat: now})
                    .where("id = :id AND status = :fromStatus AND updatedat = :currentUpdatedAt", {
                        id: propertyId,
                        fromStatus: currentStatus,
                        currentUpdatedAt,
                    })
                    .execute();
                if ((Number(result?.affected) || 0) === 0) {
                    return {outcome: "stale", currentUpdatedAt};
                }

                if (currentStatus === "ARCHIVED" && toStatus !== "ARCHIVED") {
                    await this.clearArchiveMetadata(manager, propertyId, toStatus, now);
                }

                await manager
                    .createQueryBuilder()
                    .insert()
                    .into(Property_Moderation_Event)
                    .values({
                        id: eventId,
                        propertyId,
                        action,
                        actorId,
                        reason,
                        fromStatus: currentStatus,
                        toStatus,
                        createdAt: now,
                    })
                    .execute();

                return {outcome: "changed", fromStatus: currentStatus, updatedAt: now};
            })
        );
    }

    async clearArchiveMetadata(client, propertyId, status, now) {
        const archiveColumns = await this.getArchiveMetadataColumns(client);
        const clearClauses = this.buildArchiveMetadataUpdateClauses(status, archiveColumns, {}, now, []);
        if (clearClauses.length === 0) {
            return;
        }

        await client.query(`UPDATE property SET ${clearClauses.join(", ")} WHERE id = $1`, [propertyId]);
    }

    async updatePropertyOverview(propertyId, title, subtitle, description, bookingType = undefined) {
        const client = await Database.getInstance();
        const updateFields = {
            title: title,
            subtitle: subtitle,
            description: description,
            updatedat: Date.now(),
        };
        if (bookingType !== undefined) {
            updateFields.bookingtype = bookingType;
        }
        await client
            .createQueryBuilder()
            .update(Property)
            .set(updateFields)
            .where("id = :id", { id: propertyId })
            .execute();

        return await this.getPropertyById(propertyId);
    }

    async isRegistrationNumberUsedByAnotherProperty(registrationNumber, propertyId) {
        const client = await Database.getInstance();
        const matchCount = await client
            .getRepository(Property)
            .createQueryBuilder("property")
            .where("property.registrationnumber = :registrationNumber", { registrationNumber })
            .andWhere("property.id != :propertyId", { propertyId })
            .getCount();

        return matchCount > 0;
    }

    async updateRegistrationNumber(propertyId, registrationNumber) {
        const client = await Database.getInstance();
        try {
            await client
                .createQueryBuilder()
                .update(Property)
                .set({ registrationnumber: registrationNumber, updatedat: Date.now() })
                .where("id = :id", { id: propertyId })
                .execute();
        } catch (error) {
            if (error?.code === UNIQUE_VIOLATION_CODE || error?.driverError?.code === UNIQUE_VIOLATION_CODE) {
                throw new ConflictException(REGISTRATION_NUMBER_TAKEN_MESSAGE);
            }
            throw error;
        }

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
        }

        return PaginatedPropertyMapping.mapDatabaseEntriesToPaginatedIdentifiers(result);
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
