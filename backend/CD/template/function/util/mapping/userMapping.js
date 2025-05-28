import {User} from "../../business/model/user.js";

export class UserMapping {

    static mapGetUserCommandToUser(cognitoEntry) {
        return new User(
            cognitoEntry.Username,
            cognitoEntry.UserAttributes.find(attribute => attribute.Name === "custom:username").Value,
            cognitoEntry.UserAttributes.find(attribute => attribute.Name === "email").Value,
            "SomePassword"
        )
    }
}