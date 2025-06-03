import {BadRequestException} from "../../util/exception/badRequestException.js";

export class User {
    _username;
    _password;

    constructor(username, password) {
        this.username = username;
        this.password = password;
    }

    set username(username) {
        if (!username) {
            throw new BadRequestException("No username provided.")
        }
        this._username = username
    }

    get username() {
        return this._username
    }

    set password(password) {
        if (!password) {
            throw new BadRequestException("No password provided.")
        }
        this._password = password
    }

    get password() {
        return this._password
    }
}