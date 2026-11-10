import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import PropertyRepository from '../propertyRepository';

jest.mock('../../../features/auth/RetrieveAccessToken', () => jest.fn());

describe('PropertyRepository fetchPropertyByCountry', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({properties: [], lastEvaluatedKey: null}),
    });
  });

  afterEach(() => {
    delete global.fetch;
  });

  it('sends the createdAt and id of the cursor', async () => {
    await new PropertyRepository().fetchPropertyByCountry(
      'Netherlands',
      1700000000123,
      'property-12',
    );

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.get('country')).toBe('Netherlands');
    expect(url.searchParams.get('lastEvaluatedKeyCreatedAt')).toBe(
      '1700000000123',
    );
    expect(url.searchParams.get('lastEvaluatedKeyId')).toBe('property-12');
  });

  it('does not send a city', async () => {
    await new PropertyRepository().fetchPropertyByCountry(
      'Netherlands',
      1700000000123,
      'property-12',
    );

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.has('lastEvaluatedKeyCity')).toBe(false);
  });
});
