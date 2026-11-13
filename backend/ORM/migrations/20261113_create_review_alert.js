export class CreateReviewAlert20261113 {
  async up(queryRunner) {
    // Domits also runs on Aurora DSQL, where secondary indexes are asynchronous.
    const asyncIndex = queryRunner.connection?.options?.host?.includes(".dsql.") ? "ASYNC " : "";
    const index = async (sql) => {
      const result = await queryRunner.query(sql);
      if (asyncIndex && result?.[0]?.job_id) {
        const [job] = await queryRunner.query("SELECT sys.wait_for_job($1) AS ready", [result[0].job_id]);
        if (!job?.ready) throw new Error("Review alert index creation failed.");
      }
    };
    for (const schema of ["test", "main"]) {
      await queryRunner.query(`CREATE TABLE IF NOT EXISTS ${schema}.review_alert (
        id VARCHAR(255) PRIMARY KEY,
        recipient_user_id VARCHAR(255) NOT NULL,
        property_id VARCHAR(255) NOT NULL,
        review_id VARCHAR(255),
        alert_type VARCHAR(50) NOT NULL,
        event_key VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'UNREAD',
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        CONSTRAINT review_alert_recipient_event_unique UNIQUE (recipient_user_id, event_key)
      );`);
      await index(`CREATE INDEX ${asyncIndex}IF NOT EXISTS review_alert_recipient_created
        ON ${schema}.review_alert (recipient_user_id, created_at DESC, id DESC);`);
      await index(`CREATE INDEX ${asyncIndex}IF NOT EXISTS review_alert_property ON ${schema}.review_alert (property_id);`);
      await index(`CREATE INDEX ${asyncIndex}IF NOT EXISTS review_alert_review ON ${schema}.review_alert (review_id);`);
    }
  }

  async down(queryRunner) {
    for (const schema of ["main", "test"]) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.review_alert;`);
    }
  }
}
