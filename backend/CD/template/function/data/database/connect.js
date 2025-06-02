import {DatabaseException} from "../../util/exception/databaseException.js";
import {SystemManagerRepository} from "../systemManagerRepository.js";
import {DsqlSigner} from "@aws-sdk/dsql-signer";
import pg from "pg";

export class Database {

    static systemManager = null;
    static pool = null;

    constructor() {}

    static async getInstance() {
        if (Database.systemManager == null) {
            Database.systemManager = new SystemManagerRepository();
        }
        if (Database.pool == null) {
            await Database.initializeDatabase();
        }
        return Database.pool;
    }

    static async initializeDatabase() {
        try {
            const [region, host, dbName, schema] = await Promise.all([
                this.systemManager.getSystemManagerParameter("/aurora/dsql/region"),
                this.systemManager.getSystemManagerParameter("/aurora/dsql/host"),
                this.systemManager.getSystemManagerParameter("/aurora/dsql/dbName"),
                this.systemManager.getSystemManagerParameter("/aurora/dsql/schema")
            ]);
            const signer = new DsqlSigner({
                hostname: host,
                region: region,
            });
            Database.pool = new pg.Client({
                host: host,
                user: "admin",
                password: await signer.getDbConnectAdminAuthToken(),
                database: dbName,
                port: 5432,
                ssl: {
                    rejectUnauthorized: false
                }
            });
            await Database.pool.connect();
            await Database.pool.query(`SET search_path TO ${schema}`);
        } catch (error) {
            console.error(error);
            throw new DatabaseException("Something went wrong while initializing database connection.");
        }
    }

}