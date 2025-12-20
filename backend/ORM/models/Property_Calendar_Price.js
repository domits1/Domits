import {EntitySchema} from "typeorm";

/**
 * Property_Calendar_Price Schema
 * Stores daily custom pricing for properties
 * Matches AWS table structure exactly:
 * - property_id: varchar(255)
 * - date: bigint (timestamp)
 * - price: int
 * - Primary Key: (property_id, date)
 */
export const Property_Calendar_Price = new EntitySchema({
    name: "Property_Calendar_Price",
    tableName: "property_calendar_price",
    schema: "public",
    columns: {
        property_id: {
            primary: true,
            type: "varchar",
            length: 255,
            nullable: false
        },
        date: {
            primary: true,
            type: "bigint",
            transformer: {
                from: (value) => Number(value),
                to: (value) => value,
            },
            nullable: false,
            comment: "Unix timestamp in milliseconds"
        },
        price: {
            type: "int",
            nullable: false,
            comment: "Price in cents (e.g., 15000 = $150.00)"
        }
    }
});
