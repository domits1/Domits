import { LocationMapping } from "../../util/mapping/location.js";
import { NotFoundException } from "../../util/exception/NotFoundException.js";
import Database from "database";
import {Property_Location} from "database/models/Property_Location";
import {Property} from "database/models/Property";

export class PropertyLocationRepository {

    constructor(systemManager) {
        this.systemManager = systemManager
    }

    async getPropertyLocationById(id) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property_Location)
            .createQueryBuilder("property_location")
            .where("property_id = :id", { id: id })
            .getOne();
        return result ? LocationMapping.mapDatabaseEntryToLocation(result) : null;
    }

    async getFullPropertyLocationById(id) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property_Location)
            .createQueryBuilder("property_location")
            .where("property_id = :id", { id: id })
            .getOne();
        return result ? LocationMapping.mapDatabaseEntryToFullLocation(result) : null;
    }

    async create(location) {
        const client = await Database.getInstance();
        await client
            .createQueryBuilder()
            .insert()
            .into(Property_Location)
            .values({
                property_id: location.property_id,
                city: location.city,
                country: location.country,
                housenumber: location.houseNumber,
                housenumberextension: location.houseNumberExtension,
                postalcode: location.postalCode,
                street: location.street
            })
            .execute();
        const result = await this.getPropertyLocationById(location.property_id);
        return result ? result : null;
    }

    async getActivePropertiesByCountry(country, lastEvaluatedKey) {
        const client = await Database.getInstance();
        const query = await client
            .getRepository(Property)
            .createQueryBuilder("property")
            .innerJoin("property_location", "pl", "pl.property_id = property.id")
            .where("pl.country = :country", { country: country })
            .andWhere("property.status = :status", { status: "ACTIVE" })
            .orderBy("property.createdat", "DESC")
            .addOrderBy("property.id", "DESC")
            .limit(12);

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
            const items = result.map(item => item.property_id);

            const lastItem = result[result.length - 1];
            const lastEvaluatedKey = {
                createdAt: lastItem.createdat,
                id: lastItem.property_id,
            }

            return {
                identifiers: items,
                lastEvaluatedKey: lastEvaluatedKey,
            };
        }
    }

}