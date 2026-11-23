import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import Database from "database";
import { PropertyRepository } from "../../functions/PropertyHandler/data/repository/propertyRepository.js";
import { PropertyAmenityRepository } from "../../functions/PropertyHandler/data/repository/propertyAmenityRepository.js";
import { PropertyAvailabilityRepository } from "../../functions/PropertyHandler/data/repository/propertyAvailabilityRepository.js";
import { PropertyAvailabilityRestrictionRepository } from "../../functions/PropertyHandler/data/repository/propertyAvailabilityRestrictionRepository.js";
import { PropertyCheckInRepository } from "../../functions/PropertyHandler/data/repository/propertyCheckInRepository.js";
import { PropertyGeneralDetailRepository } from "../../functions/PropertyHandler/data/repository/propertyGeneralDetailRepository.js";
import { PropertyLocationRepository } from "../../functions/PropertyHandler/data/repository/propertyLocationRepository.js";
import { PropertyPricingRepository } from "../../functions/PropertyHandler/data/repository/propertyPricingRepository.js";
import { PropertyRuleRepository } from "../../functions/PropertyHandler/data/repository/propertyRuleRepository.js";
import { PropertyTypeRepository } from "../../functions/PropertyHandler/data/repository/propertyTypeRepository.js";
import { PropertyImageRepository } from "../../functions/PropertyHandler/data/repository/propertyImageRepository.js";
import { PropertyTechnicalDetailRepository } from "../../functions/PropertyHandler/data/repository/propertyTechnicalDetailRepository.js";
import { PropertyTestStatusRepository } from "../../functions/PropertyHandler/data/repository/propertyTestStatusRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: jest.fn(() => "signed-url") }));

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn(async () => ({})) })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));

// The location repository geocodes through the network; the answer does not matter here.
jest.mock("../../functions/PropertyHandler/util/geocoding.js", () => ({
  geocodeAddress: jest.fn(async () => null),
}));

const PROPERTY_ID = "property-1";

// The base row also answers the rule lookups. Each case adds the columns its read-back mapper validates.
const BASE_ROW = { id: "row-1", property_id: PROPERTY_ID, rule: "SmokingAllowed", value: false, value_type: "boolean" };

const buildQueryBuilder = (log, row) => {
  const reads = { getOne: row, getRawOne: row, getMany: [row], getRawMany: [row] };
  const builder = new Proxy(
    {},
    {
      get: (_target, name) => {
        if (name === "then") return undefined;
        if (name === "execute") {
          return async () => {
            log.push("insert");
            return { affected: 1, raw: [] };
          };
        }
        if (name in reads) {
          return async () => {
            log.push("read");
            return reads[name];
          };
        }
        return () => builder;
      },
    }
  );
  return builder;
};

// `log` records, in order, every insert and read that reaches this client.
// A DataSource carries `options`; a transaction manager only reaches them through `connection`.
const buildClient = (kind, storedColumns = {}) => {
  const log = [];
  const row = { ...BASE_ROW, ...storedColumns };
  const queryRows = [{ ...row, column_name: "weekendrate", roomrate: 120, cleaning: 30, weekendrate: 120 }];
  const client = {
    log,
    createQueryBuilder: jest.fn(() => buildQueryBuilder(log, row)),
    getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => buildQueryBuilder(log, row)) })),
    query: jest.fn(async (statement) => {
      const isInsert = /^\s*INSERT/i.test(statement);
      log.push(isInsert ? "insert" : "read");
      return isInsert ? [] : queryRows;
    }),
  };
  if (kind === "manager") {
    client.connection = { options: { schema: "main" } };
  } else {
    client.options = { schema: "main" };
  }
  return client;
};

// `input` is what create receives; `stored` adds the columns the read-back mapper of that table validates.
const CREATE_METHODS = [
  {
    name: "PropertyRepository",
    Repository: PropertyRepository,
    input: { id: PROPERTY_ID, title: "Cliff House", hostId: "host-1", status: "DRAFT", createdAt: 1 },
    stored: {
      hostid: "host-1",
      title: "Cliff House",
      subtitle: "Sea view",
      description: "Two bedrooms",
      registrationnumber: "REG-1",
      status: "DRAFT",
      createdat: 1,
      updatedat: 0,
    },
  },
  {
    name: "PropertyAmenityRepository",
    Repository: PropertyAmenityRepository,
    input: { id: "pa-1", amenityId: "wifi", property_id: PROPERTY_ID },
  },
  {
    name: "PropertyAvailabilityRepository",
    Repository: PropertyAvailabilityRepository,
    input: { property_id: PROPERTY_ID, availableStartDate: 1, availableEndDate: 2 },
  },
  {
    name: "PropertyAvailabilityRestrictionRepository",
    Repository: PropertyAvailabilityRestrictionRepository,
    input: { id: "ar-1", property_id: PROPERTY_ID, restriction: "MinimumStay", value: 2 },
  },
  {
    name: "PropertyCheckInRepository",
    Repository: PropertyCheckInRepository,
    input: {
      property_id: PROPERTY_ID,
      checkIn: { from: "15:00", till: "20:00" },
      checkOut: { from: "07:00", till: "10:00" },
    },
    stored: { checkinfrom: "15:00", checkintill: "20:00", checkoutfrom: "07:00", checkouttill: "10:00" },
  },
  {
    name: "PropertyGeneralDetailRepository",
    Repository: PropertyGeneralDetailRepository,
    input: { id: "gd-1", property_id: PROPERTY_ID, detail: "Guests", value: 4 },
  },
  {
    name: "PropertyLocationRepository",
    Repository: PropertyLocationRepository,
    input: { property_id: PROPERTY_ID, city: "Phuket", country: "Thailand", street: "Patak Soi 2" },
  },
  {
    name: "PropertyPricingRepository",
    Repository: PropertyPricingRepository,
    input: { property_id: PROPERTY_ID, roomRate: 120, cleaning: 30 },
  },
  {
    name: "PropertyRuleRepository",
    Repository: PropertyRuleRepository,
    input: { property_id: PROPERTY_ID, rule: "SmokingAllowed", value: false },
  },
  {
    name: "PropertyTypeRepository",
    Repository: PropertyTypeRepository,
    input: { property_id: PROPERTY_ID, property_type: "House", spaceType: "Entire place" },
    stored: { type: "House", spacetype: "Entire place" },
  },
  {
    name: "PropertyImageRepository",
    Repository: PropertyImageRepository,
    input: { property_id: PROPERTY_ID, image: "data:image/png;base64,AAAA" },
  },
  {
    name: "PropertyTechnicalDetailRepository",
    Repository: PropertyTechnicalDetailRepository,
    input: { property_id: PROPERTY_ID, length: 8, height: 3 },
    stored: {
      length: 8,
      height: 3,
      fuelconsumption: 2,
      speed: 20,
      renovationyear: 2020,
      transmission: "Manual",
      generalperiodicinspection: 2026,
      fourwheeldrive: false,
    },
  },
  {
    name: "PropertyTestStatusRepository",
    Repository: PropertyTestStatusRepository,
    input: { property_id: PROPERTY_ID, isTest: false },
    stored: { istest: false },
  },
];

describe("create methods take an optional transaction manager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(CREATE_METHODS)(
    "$name inserts and reads back through the manager and never opens its own connection",
    async ({ Repository, input, stored }) => {
      const defaultClient = buildClient("dataSource", stored);
      Database.getInstance.mockResolvedValue(defaultClient);
      const manager = buildClient("manager", stored);

      const result = await new Repository({}).create(input, manager);

      expect(result).toBeTruthy();
      expect(Database.getInstance).not.toHaveBeenCalled();
      expect(defaultClient.log).toEqual([]);
      const insertAt = manager.log.indexOf("insert");
      expect(insertAt).toBeGreaterThanOrEqual(0);
      expect(manager.log.slice(insertAt + 1)).toContain("read");
    }
  );

  it.each(CREATE_METHODS)(
    "$name without a manager uses Database.getInstance for the insert and the read-back",
    async ({ Repository, input, stored }) => {
      const defaultClient = buildClient("dataSource", stored);
      Database.getInstance.mockResolvedValue(defaultClient);

      const result = await new Repository({}).create(input);

      expect(result).toBeTruthy();
      expect(Database.getInstance).toHaveBeenCalled();
      const insertAt = defaultClient.log.indexOf("insert");
      expect(insertAt).toBeGreaterThanOrEqual(0);
      expect(defaultClient.log.slice(insertAt + 1)).toContain("read");
    }
  );
});

// A TypeORM manager has no `options` of its own, so the schema has to come from its connection;
// otherwise the pricing insert would run against an unqualified table name.
describe("PropertyPricingRepository.create schema with a manager", () => {
  const pricing = { property_id: PROPERTY_ID, roomRate: 120, cleaning: 30 };
  const insertStatement = (client) =>
    client.query.mock.calls.map(([statement]) => statement).find((statement) => /INSERT INTO/i.test(statement));

  beforeEach(() => {
    jest.clearAllMocks();
    Database.getInstance.mockResolvedValue(buildClient("dataSource"));
  });

  it("qualifies the table with the schema of the manager's connection", async () => {
    const manager = buildClient("manager");

    await new PropertyPricingRepository({}).create(pricing, manager);

    expect(insertStatement(manager)).toContain('"main"."property_pricing"');
  });

  it("qualifies the table the same way for a DataSource", async () => {
    const dataSource = buildClient("dataSource");
    Database.getInstance.mockResolvedValue(dataSource);

    await new PropertyPricingRepository({}).create(pricing);

    expect(insertStatement(dataSource)).toContain('"main"."property_pricing"');
  });
});
