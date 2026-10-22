// Migration record only; nothing executes it. The statements to run, in batches, are in
// 20261014_cancellation_policy_strict_to_limited.sql, and the run order, precondition and
// verification are in docs/internal/tools/dsql_cancellation_policy_strict_to_limited_runbook.md.
// Run it before the #832 code is deployed.
export class CancellationPolicyStrictToLimited20261014 {
  async up(queryRunner) {
    await queryRunner.query(`
      INSERT INTO main.property_rule (property_id, rule, value, value_new)
      SELECT property_id, 'CancellationPolicy:Limited', value, value_new
      FROM main.property_rule
      WHERE rule = 'CancellationPolicy:Strict';
    `);

    await queryRunner.query(`
      DELETE FROM main.property_rule
      WHERE rule = 'CancellationPolicy:Strict';
    `);

    await queryRunner.query(`
      UPDATE main.booking
      SET cancellation_policy = 'Limited'
      WHERE LOWER(cancellation_policy) = 'strict';
    `);

    await queryRunner.query(`
      UPDATE test.booking
      SET cancellation_policy = 'Limited'
      WHERE LOWER(cancellation_policy) = 'strict';
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      INSERT INTO main.property_rule (property_id, rule, value, value_new)
      SELECT property_id, 'CancellationPolicy:Strict', value, value_new
      FROM main.property_rule
      WHERE rule = 'CancellationPolicy:Limited';
    `);

    await queryRunner.query(`
      DELETE FROM main.property_rule
      WHERE rule = 'CancellationPolicy:Limited';
    `);

    await queryRunner.query(`
      UPDATE main.booking
      SET cancellation_policy = 'Strict'
      WHERE cancellation_policy = 'Limited';
    `);

    await queryRunner.query(`
      UPDATE test.booking
      SET cancellation_policy = 'Strict'
      WHERE cancellation_policy = 'Limited';
    `);
  }
}
