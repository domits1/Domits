import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import Database from "database";
import { geocodeAddress } from "../../functions/PropertyHandler/util/geocoding.js";
import { PropertyLocationRepository } from "../../functions/PropertyHandler/data/repository/propertyLocationRepository.js";
import { PropertyImageRepository } from "../../functions/PropertyHandler/data/repository/propertyImageRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const mockS3Send = jest.fn(async () => ({}));
jest.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: jest.fn(() => "signed-url") }));
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: (...args) => mockS3Send(...args) })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));
jest.mock("../../functions/PropertyHandler/util/geocoding.js", () => ({
  geocodeAddress: jest.fn(),
}));

const PROPERTY_ID = "property-1";
const LOCATION = { property_id: PROPERTY_ID, city: "Phuket", country: "Thailand", street: "Patak Soi 2" };

// A manager that records the values of every insert and answers every read with one stored row.
const buildManager = (storedRow) => {
  const inserted = [];
  const buildBuilder = () => {
    const builder = {
      insert: () => builder,
      into: () => builder,
      values: (values) => (inserted.push(values), builder),
      where: () => builder,
      andWhere: () => builder,
      execute: async () => ({ affected: 1 }),
      getOne: async () => storedRow,
    };
    return builder;
  };
  return {
    inserted,
    createQueryBuilder: jest.fn(buildBuilder),
    getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(buildBuilder) })),
  };
};

describe("PropertyLocationRepository.create coordinates", () => {
  beforeEach(() => jest.clearAllMocks());

  it("stores the coordinates it is given and makes no geocoding call", async () => {
    const manager = buildManager({ ...LOCATION, latitude: 7.9, longitude: 98.3 });

    await new PropertyLocationRepository().create(LOCATION, manager, {
      coordinates: { latitude: 7.9, longitude: 98.3 },
    });

    expect(geocodeAddress).not.toHaveBeenCalled();
    expect(manager.inserted[0]).toMatchObject({ latitude: 7.9, longitude: 98.3 });
  });

  it("stores null coordinates when the caller's geocode found nothing, without geocoding again", async () => {
    const manager = buildManager({ ...LOCATION });

    await new PropertyLocationRepository().create(LOCATION, manager, { coordinates: null });

    expect(geocodeAddress).not.toHaveBeenCalled();
    expect(manager.inserted[0]).toMatchObject({ latitude: null, longitude: null });
  });

  it("still geocodes when no coordinates are given, as the update-location path relies on", async () => {
    geocodeAddress.mockResolvedValue({ latitude: 1.5, longitude: 2.5 });
    const manager = buildManager({ ...LOCATION });

    await new PropertyLocationRepository().create(LOCATION, manager);

    expect(geocodeAddress).toHaveBeenCalledWith(LOCATION);
    expect(manager.inserted[0]).toMatchObject({ latitude: 1.5, longitude: 2.5 });
  });
});

describe("PropertyImageRepository.create upload", () => {
  const image = { property_id: PROPERTY_ID, key: "client-supplied-key", image: "data:image/png;base64,AAAA" };

  beforeEach(() => {
    jest.clearAllMocks();
    Database.getInstance.mockResolvedValue(buildManager({}));
  });

  it("stores the key of a file that was already uploaded and uploads nothing", async () => {
    const manager = buildManager({ property_id: PROPERTY_ID, key: "images/property-1/uploaded" });

    await new PropertyImageRepository().create({ ...image }, manager, { uploadedKey: "images/property-1/uploaded" });

    expect(mockS3Send).not.toHaveBeenCalled();
    expect(manager.inserted[0]).toEqual({ property_id: PROPERTY_ID, key: "images/property-1/uploaded" });
  });

  it("uploads and ignores the key the request body supplied when no uploaded key is given", async () => {
    const manager = buildManager({ property_id: PROPERTY_ID, key: "stored" });

    await new PropertyImageRepository().create({ ...image }, manager);

    expect(mockS3Send).toHaveBeenCalledTimes(1);
    expect(manager.inserted[0].key).toMatch(/^images\/property-1\//);
    expect(manager.inserted[0].key).not.toBe("client-supplied-key");
  });
});
