import { jest } from "@jest/globals";
import Database from "database";

export const SITE_ROW = {
  id: "site-1",
  property_id: "property-1",
  host_id: "host-1",
  site_name: "Cliff House",
  primary_locale: "en",
  status: "PUBLISHED",
  template_key: "panorama-landing",
  published_property_snapshot_json: "{}",
  published_content_overrides_json: "{}",
  published_theme_overrides_json: "{}",
  preview_token_hash: null,
  published_at: 1757000000000,
  suspended_at: null,
  static_page_revision: 4,
  created_at: 1756000000000,
  updated_at: 1757000000000,
};

export const buildTransactionClient = ({ operation, respond }) => {
  const statements = [];
  const transactionRunner = {
    query: jest.fn(async (statement, parameters, useStructuredResult) => {
      statements.push({ statement, parameters, useStructuredResult });
      return respond(statement, parameters, useStructuredResult);
    }),
    release: jest.fn().mockResolvedValue(undefined),
  };
  const client = {
    options: { schema: "main" },
    statements,
    transactionRunner,
    committed: false,
    rolledBack: false,
    transaction: jest.fn(async (runInTransaction) => {
      try {
        const result = await runInTransaction({ queryRunner: transactionRunner });
        client.committed = true;
        return result;
      } catch (error) {
        client.rolledBack = true;
        throw error;
      }
    }),
    createQueryRunner: jest.fn(() => {
      throw new Error(`the ${operation} must run inside one transaction, not on a separate query runner`);
    }),
    query: jest.fn(async () => {
      throw new Error(`the ${operation} must run inside one transaction, not on the data source`);
    }),
  };
  Database.getInstance.mockResolvedValue(client);
  return client;
};
