import {User} from "../../business/model/user.js";

export class UserMapping {

    static mapGetUserCommandToUser(user) {
        return new User(
            user.username,
            user.password
        )
    }
}