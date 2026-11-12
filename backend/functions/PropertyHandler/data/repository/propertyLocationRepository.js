import { LocationMapping } from "../../util/mapping/location.js";
import { PaginatedPropertyMapping } from "../../util/mapping/paginatedProperty.js";
import { NotFoundException } from "../../util/exception/NotFoundException.js";
import { TypeException } from "../../util/exception/TypeException.js";
import {
    afterListingPosition,
    findListingPosition,
    joinLatestApproval,
    orderByListingPosition,
} from "./listingPosition.js";
import { geocodeAddress } from "../../util/geocoding.js";
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
        // Derive coordinates from the address (best effort — null on failure).
        // External integrations such as PriceLabs require latitude/longitude.
        const coords = await geocodeAddress(location);
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
                street: location.street,
                latitude: coords?.latitude ?? null,
                longitude: coords?.longitude ?? null
            })
            .execute();
        const result = await this.getPropertyLocationById(location.property_id);
        return result ? result : null;
    }

    async updatePropertyLocationById(propertyId, location) {
        const client = await Database.getInstance();
        // Address may have changed — re-derive coordinates (best effort).
        const coords = await geocodeAddress(location);
        const fields = {
            city: location.city,
            country: location.country,
            housenumber: location.houseNumber,
            housenumberextension: location.houseNumberExtension || "",
            postalcode: location.postalCode,
            street: location.street,
        };
        if (coords) {
            fields.latitude = coords.latitude;
            fields.longitude = coords.longitude;
        }
        await client
            .createQueryBuilder()
            .update(Property_Location)
            .set(fields)
            .where("property_id = :propertyId", { propertyId })
            .execute();

        return await this.getFullPropertyLocationById(propertyId);
    }

    async getActivePropertiesByCountry(country, lastEvaluatedKey) {
        const client = await Database.getInstance();
        let query = client
            .getRepository(Property)
            .createQueryBuilder("property")
            .select(["property.id", "property.createdat"])
            .innerJoin("property_location", "pl", "pl.property_id = property.id")
            .where("pl.country = :country", { country: country })
            .andWhere("property.status = :status", { status: "ACTIVE" });
        query = orderByListingPosition(joinLatestApproval(query)).limit(12);

        if (lastEvaluatedKey?.createdAt && lastEvaluatedKey?.id) {
            // Only the id steers the page. createdAt marks that a cursor was sent, and the position is read back
            // from the row, so a stale or forged value cannot skip or repeat listings.
            // The lookup is limited to this country: a cursor from another country is a 400, not a skipped page.
            const inThisCountry = (lookup) =>
                lookup
                    .innerJoin("property_location", "pl", "pl.property_id = property.id")
                    .andWhere("pl.country = :country", { country: country });
            const position = await findListingPosition(client, lastEvaluatedKey.id, inThisCountry);
            if (!position) {
                throw new TypeException("Unknown pagination cursor.");
            }
            query = afterListingPosition(query, position);
        }

        const result = await query.getMany();

        if (result.length < 1) {
            throw new NotFoundException(`No property found.`)
        }

        return PaginatedPropertyMapping.mapDatabaseEntriesToPaginatedIdentifiers(result);
    }

}