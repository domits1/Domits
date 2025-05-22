import {UserMapping} from "../util/mapping/userMapping.js";

export class Repository {

    async getUser(id) {
        const userFromCognito = {
            Username: "SomeId",
            UserAttributes: [
                {
                    Name: "custom:username",
                    Value: "SomeUsername"
                },
                {
                    Name: "email",
                    Value: "SomeEmail"
                },
            ],
            MFAOptions: [
                {
                    DeliveryMedium: "EMAIL",
                    AttributeName: "SomeMFAAttribute"
                }
            ],
            PreferredMfaSetting: "SomeMFASetting",
            UserMFASettingList: [
                "SomeUserMFASetting"
            ]
        }

        return UserMapping.mapGetUserCommandToUser(userFromCognito);
    }
}