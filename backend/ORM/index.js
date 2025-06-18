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

  constructor() { }

  static async getInstance() {
    if (Database.systemManager == null) {
      Database.systemManager = new SystemManagerRepository();
    }

    const now = Date.now();
    const isTokenExpired = !Database.tokenExpiration || now > Database.tokenExpiration - 2 * 60 * 1000;

    if (Database.pool == null) {
      await Database.initializeDatabase();
    } else if (isTokenExpired) {
      Database.tokenExpiration = Date.now() + 15 * 60 * 1000;
      const signer = new DsqlSigner({ hostname: Database.host, region: Database.region });
      const token = await signer.getDbConnectAdminAuthToken();
      Database.pool.setOptions({ password: token });
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