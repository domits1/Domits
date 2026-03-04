import {EntitySchema} from "typeorm";

export const Kpi_Snapshot = new EntitySchema({
    name: "Kpi_Snapshot",
    tableName: "kpi_snapshot",
    schema: "main",
    columns: {
        id: {
            primary: true,
            type: "uuid",
            generated: "uuid",
            nullable: false
        },
        user_id: {
            type: "varchar",
            nullable: false
        },
        host_id: {
            type: "varchar",
            nullable: true
        },
        period_type: {
            type: "varchar",
            nullable: false
        },
        period_start: {
            type: "timestamp",
            nullable: true
        },
        period_end: {
            type: "timestamp",
            nullable: true
        },
        created_at: {
            type: "timestamp",
            nullable: false,
            default: () => "NOW()"
        },
        revenue: {
            type: "numeric",
            nullable: true
        },
        booked_nights: {
            type: "int",
            nullable: true
        },
        available_nights: {
            type: "int",
            nullable: true
        },
        property_count: {
            type: "int",
            nullable: true
        },
        alos: {
            type: "numeric",
            nullable: true
        },
        adr: {
            type: "numeric",
            nullable: true
        },
        occupancy_rate: {
            type: "numeric",
            nullable: true
        },
        revpar: {
            type: "numeric",
            nullable: true
        }
    }
})