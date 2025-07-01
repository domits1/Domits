import {DatabaseException} from "./util/exception/databaseException.js";
import {SystemManagerRepository} from "./data/systemManagerRepository.js";
import {DsqlSigner} from "@aws-sdk/dsql-signer";
import * as typeorm from "typeorm";
import {getTables} from "./util/database/getTables.js";

export default class Database {

  static systemManager = null;
  static pool = null;

<<<<<<< HEAD
  static region = null;
  static host = null;
  static dbName = null;
  static schema = null;

  constructor() { }

  static async getInstance() {
    if (Database.systemManager == null) {
      Database.systemManager = new SystemManagerRepository();
    }
    if (Database.pool == null) {
      await Database.initializeDatabase();
    } else {
      const signer = new DsqlSigner({
        hostname: Database.host,
        region: Database.region,
      });

      const token = await signer.getDbConnectAdminAuthToken();
      Database.pool.setOptions({ password: token });

      if (!Database.pool.isInitialized) {
        await Database.pool.initialize();
      }
=======
    constructor() {}

    static async getInstance() {
        if (Database.systemManager == null) {
            Database.systemManager = new SystemManagerRepository();
        }
        if (Database.pool == null) {
            await Database.initializeDatabase();
        }
        return Database.pool;
>>>>>>> parent of 8e985a83a (Merge branch 'acceptance' of https://github.com/domits1/domits into feature/multi-language-mobile)
    }
    return Database.pool;
  }

<<<<<<< HEAD
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
=======
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
            Database.pool = new typeorm.DataSource({
                type: "postgres",
                host: host,
                port: 5432,
                username: "admin",
                password: await signer.getDbConnectAdminAuthToken(),
                database: dbName,
                schema: schema,
                synchronize: false,
                entities: await getTables(),
                ssl: {
                    rejectUnauthorized: false
                }
            });
            await Database.pool.initialize();
        } catch (error) {
            console.error(error);
            throw new DatabaseException("Something went wrong while initializing database connection.");
>>>>>>> parent of 8e985a83a (Merge branch 'acceptance' of https://github.com/domits1/domits into feature/multi-language-mobile)
        }
      });
      await Database.pool.initialize();
    } catch (error) {
      console.error(error);
      throw new DatabaseException("Something went wrong while initializing database connection.");
    }
<<<<<<< HEAD
  }
=======
>>>>>>> parent of 8e985a83a (Merge branch 'acceptance' of https://github.com/domits1/domits into feature/multi-language-mobile)

}