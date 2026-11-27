import { PersistVerifiedStays20261126 } from '../../ORM/migrations/20261126_persist_verified_stays.js';

test('commits bounded batches independently and resumes until both schemas are exhausted', async () => {
  const runner = { isTransactionActive: false, query: jest.fn()
    .mockResolvedValueOnce({ affected: 500 }).mockResolvedValueOnce({ affected: 1 })
    .mockResolvedValueOnce({ affected: 0 }).mockResolvedValueOnce({ affected: 0 }) };
  const migration = new PersistVerifiedStays20261126();
  expect(migration.transaction).toBe(false);
  await migration.up(runner);
  expect(runner.query).toHaveBeenCalledTimes(4);
  for (const [, parameters, structured] of runner.query.mock.calls) {
    expect(parameters).toEqual([]);
    expect(structured).toBe(true);
  }
  const statements = runner.query.mock.calls.map(([sql]) => sql);
  expect(statements.slice(0, 3).every(sql => sql.includes('UPDATE test.review'))).toBe(true);
  expect(statements[3]).toContain('UPDATE main.review');
  for (const sql of statements) {
    expect(sql).toContain('LIMIT 500');
    expect(sql).toContain('RETURNING review.id');
    expect(sql).toContain("IS DISTINCT FROM 'VERIFIED_STAY'");
    expect(sql).toContain("IN ('paid', 'confirmed')");
  }
});

test('rejects an encompassing transaction before making any writes', async () => {
  const runner = { isTransactionActive: true, query: jest.fn() };
  await expect(new PersistVerifiedStays20261126().up(runner)).rejects.toThrow('commit independently');
  expect(runner.query).not.toHaveBeenCalled();
});
