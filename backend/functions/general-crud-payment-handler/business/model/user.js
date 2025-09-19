import {BadRequestException} from "../../util/exception/badRequestException.js";

export class User {
    username;
    password;

    constructor(username, password) {
        this._username = username;
        this._password = password;
    }

    set _username(username) {
        if (!username) {
            throw new BadRequestException("No username provided.")
        }
        this.username = username
    }

    get _username() {
        return this.username
    }

    set _password(password) {
        if (!password) {
            throw new BadRequestException("No password provided.")
        }
        this.password = password
    }

    get _password() {
        return this.password
    }
}