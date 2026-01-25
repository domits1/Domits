import { DatabaseException } from "./util/exception/databaseException.js";
import { SystemManagerRepository } from "./data/systemManagerRepository.js";
import { DsqlSigner } from "@aws-sdk/dsql-signer";
import * as typeorm from "typeorm";
import { Tables } from "./util/database/Tables.js";

export default class Database {

    static systemManager = null;
    static pool = null;

    static region = null;
    static host = null;
    static dbName = null;
    static schema = null;

    static tokenExpiration = null;
    static twoMinutes = 2 * 60 * 1000;
    static tokenExpirationTime = 15 * 60 * 1000;

    static initPromise = null;

    constructor() { }

    static async getInstance() {
        if (!Database.initPromise) {
            Database.initPromise = Database._getInstanceInternal();
        }

        try {
            return await Database.initPromise;
        } finally {
            Database.initPromise = null;
        }
    }

    static async _getInstanceInternal() {
        if (Database.systemManager == null) {
            Database.systemManager = new SystemManagerRepository();
        }

        const now = Date.now();
        const isTokenExpired = !Database.tokenExpiration || now > Database.tokenExpiration - Database.twoMinutes;

        if (Database.pool == null) {
            await Database.initializeDatabase();
        } else if (isTokenExpired) {
            if (Database.pool.isInitialized) {
                await Database.pool.destroy();
            }

            Database.tokenExpiration = Date.now() + Database.tokenExpirationTime;
            const signer = new DsqlSigner({ hostname: Database.host, region: Database.region });

            Database.pool = new typeorm.DataSource({
                type: "postgres",
                host: Database.host,
                port: 5432,
                username: "admin",
                password: await signer.getDbConnectAdminAuthToken(),
                database: Database.dbName,
                schema: process.env.TEST === "true" ? "test" : Database.schema,
                synchronize: false,
                entities: Tables,
                ssl: {
                    rejectUnauthorized: false
                }
            });

            await Database.pool.initialize();
        }

        if (!Database.pool.isInitialized) {
            await Database.pool.initialize();
        }

        return Database.pool;
    }

    static async initializeDatabase() {
        try {
            Database.region = await this.systemManager.getSystemManagerParameter("/aurora/dsql/region");
            Database.host = await this.systemManager.getSystemManagerParameter("/aurora/dsql/host");
            Database.dbName = await this.systemManager.getSystemManagerParameter("/aurora/dsql/dbName");
            Database.schema = await this.systemManager.getSystemManagerParameter("/aurora/dsql/schema");

            const signer = new DsqlSigner({
                hostname: Database.host,
                region: Database.region,
            });

            Database.tokenExpiration = Date.now() + Database.tokenExpirationTime;

            Database.pool = new typeorm.DataSource({
                type: "postgres",
                host: Database.host,
                port: 5432,
                username: "admin",
                password: await signer.getDbConnectAdminAuthToken(),
                database: Database.dbName,
                schema: process.env.TEST === "true" ? "test" : Database.schema,
                synchronize: false,
                entities: Tables,
                ssl: {
                    rejectUnauthorized: false
                }
            });

            await Database.pool.initialize();
        } catch (error) {
            console.error(error);
            throw new DatabaseException("Something went wrong while initializing database connection.");
        }
    }
}