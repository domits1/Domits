import {UserMapping} from "../util/mapping/userMapping.js";
import {Database} from "./database/connect.js";

export class Repository {

    async getUser() {
        const client = await Database.getInstance();
        const response = await client.query("SELECT * FROM user_table;");

        return response.rows.map(user => UserMapping.mapGetUserCommandToUser(user));
    }
}