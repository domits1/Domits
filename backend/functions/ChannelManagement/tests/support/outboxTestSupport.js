import Database from "../../../.shared/integrations/ORM/index.js";

export const NOW = 1_750_000_000_000;

// The repository talks to one client with a query method; every test needs the
// same stand-in, so it lives here instead of in each suite.
export const mockClient = (rows = []) => {
  const client = { options: { schema: "main" }, query: jest.fn(async () => rows) };
  Database.getInstance.mockResolvedValue(client);
  return client;
};
