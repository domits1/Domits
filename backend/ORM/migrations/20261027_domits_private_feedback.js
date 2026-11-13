export class DomitsPrivateFeedback20261027 {
  async up(runner) {
    for (const schema of ["test", "main"]) {
      await runner.query(`ALTER TABLE ${schema}.review ADD COLUMN IF NOT EXISTS domits_private_feedback TEXT NULL`);
    }
  }

  async down(runner) {
    for (const schema of ["test", "main"]) {
      await runner.query(`ALTER TABLE ${schema}.review DROP COLUMN IF EXISTS domits_private_feedback`);
    }
  }
}
