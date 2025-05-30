import {BadRequestException} from "../../util/exception/badRequestException.js";

export class User {
    _id;
    _username;
    _email;
    _password;

    constructor(id, username, email, password) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.password = password;
    }

    set id(id) {
        if (!id) {
            throw BadRequestException("No user id provided.")
        }
        this._id = id
    }

    get id() {
        return this._id
    }

    set username(username) {
        if (!username) {
            throw BadRequestException("No username provided.")
        }
        this._username = username
    }

    get username() {
        return this._username
    }

    set email(email) {
        if (!email) {
            throw BadRequestException("No email provided.")
        }
        this._email = email
    }

    get email() {
        return this._email
    }

    set password(password) {
        if (!password) {
            throw BadRequestException("No password provided.")
        }
        this._password = password
    }

    get password() {
        return this._password
    }
}