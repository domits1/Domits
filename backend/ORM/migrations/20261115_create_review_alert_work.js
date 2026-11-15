export class CreateReviewAlertWork20261115 {
  async up(runner) {
    for (const schema of ["main", "test"]) {
      await runner.query(`CREATE TABLE IF NOT EXISTS ${schema}.review_alert_work (
        id VARCHAR(255) PRIMARY KEY, payload TEXT NOT NULL, due_at BIGINT, version INTEGER NOT NULL DEFAULT 0)`);
      const asyncIndex = runner.connection?.options?.host?.includes(".dsql.") ? "ASYNC " : "";
      const result = await runner.query(`CREATE INDEX ${asyncIndex}IF NOT EXISTS review_alert_work_due ON ${schema}.review_alert_work (due_at, id)`);
      if (asyncIndex && result?.[0]?.job_id) {
        const [job] = await runner.query("SELECT sys.wait_for_job($1) AS ready", [result[0].job_id]);
        if (!job?.ready) throw new Error("Review alert work index creation failed.");
      }
    }
  }
  async down(runner) {
    for (const schema of ["test", "main"]) await runner.query(`DROP TABLE IF EXISTS ${schema}.review_alert_work`);
  }
}
