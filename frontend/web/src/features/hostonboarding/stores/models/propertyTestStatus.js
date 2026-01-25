export class PropertyTestStatus {
  property_id;
  isTest;

  constructor(property_id, testStatus) {
    this._property_id = property_id;
    this._isTest = testStatus;
  }

  set _property_id(id) {
    if (typeof id !== "string") {
      throw new Error("propertyImage - Property id must be a string.");
    }
    this.property_id = id;
  }

  set _isTest(testStatus) {
    if (typeof testStatus !== "boolean") {
      throw new Error("propertyTestStatus - isTest must be a boolean.");
    }
    this.isTest = testStatus;
  }
}
