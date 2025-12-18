import { TypeException } from "../../util/exception/TypeException.js";

export class PropertyTestStatus {
  property_id;
  isTest;

  constructor(property_id, isTest) {
    this._property_id = property_id;
    this._isTest = isTest;
  }

  set _property_id(id) {
    if (typeof id !== "string") {
      throw new TypeException("propertyCheckIn - Property id must be a string.");
    }
    this.property_id = id;
  }

  set _isTest(value) {
    if (typeof value !== "boolean") {
      throw new TypeException("propertyTestStatus - isTest must be a boolean.");
    }
    this.isTest = value;
  }
}
