import {UserMapping} from "../util/mapping/userMapping.js";
import Database from "database";
import {User_Table} from "database/models/User_Table";

export class Repository {

    async getUser() {
        const client = await Database.getInstance();
        const response = await client
            .getRepository(User_Table)
            .createQueryBuilder()
            .getMany();

        return response.map(user => UserMapping.mapGetUserCommandToUser(user));
    }
}