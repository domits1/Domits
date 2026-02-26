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
        // TEST mode: Return a mock DataSource that doesn't require AWS credentials
        if (process.env.TEST === "true") {
            // Return a mock DataSource with transaction support for unit tests
            // Tests should mock the repository layer, not use real DB
            if (!Database.pool) {
                // Mock repository factory
                const createMockRepository = (entityClass) => {
                    // Return a mock repository that supports all TypeORM operations
                    return {
                        createQueryBuilder: (alias) => {
                            const builder = {
                                where: (condition, params) => builder,
                                andWhere: (condition, params) => builder,
                                select: (fields) => builder,
                                setLock: (lock) => builder,
                                getOne: async () => null, // Default: no results
                                getMany: async () => [], // Default: empty array
                                getRawOne: async () => ({}), // Default: empty object
                                setParameters: (params) => builder,
                                execute: async () => ({ affected: 0 }),
                            };
                            return builder;
                        },
                        create: (entity) => entity,
                        save: async (entity) => entity,
                        find: async () => [],
                        findOne: async () => null,
                    };
                };

                Database.pool = {
                    isInitialized: true,
                    getRepository: (entity) => createMockRepository(),
                    createQueryBuilder: () => ({
                        update: (entity) => ({
                            set: (values) => ({
                                where: (condition, params) => ({
                                    execute: async () => ({ affected: 1 }), // Mock successful update
                                }),
                            }),
                        }),
                        insert: () => ({
                            into: () => ({
                                values: () => ({
                                    execute: async () => ({}),
                                }),
                            }),
                        }),
                    }),
                    transaction: async (fn) => {
                        // Mock transaction that just executes the function
                        const mockManager = {
                            getRepository: (entity) => createMockRepository(),
                            createQueryBuilder: () => ({
                                insert: () => ({
                                    into: () => ({
                                        values: () => ({
                                            execute: async () => ({}),
                                        }),
                                    }),
                                }),
                                update: () => ({
                                    set: () => ({
                                        where: () => ({
                                            execute: async () => ({ affected: 1 }),
                                        }),
                                    }),
                                }),
                            }),
                        };
                        return await fn(mockManager);
                    },
                    destroy: async () => {},
                };
            }
            return Database.pool;
        }

        // PROD mode: Use real AWS DSQL signer
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
        // TEST mode: Skip real database initialization
        if (process.env.TEST === "true") {
            // Already handled in _getInstanceInternal
            return;
        }

        // PROD mode: Initialize real database with AWS DSQL signer
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