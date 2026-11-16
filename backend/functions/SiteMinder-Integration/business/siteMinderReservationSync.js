const reasonOf = (error) => error?.code || error?.name || "Error";

export class SiteMinderReservationSync {
  constructor({ reader, importer, logger = console, now = Date.now }) {
    this.reader = reader;
    this.importer = importer;
    this.logger = logger;
    this.now = now;
  }

  async run() {
    const now = new Date(this.now());
    const { reservations, skipped } = await this.reader.readUndelivered({ now });
    const summary = { read: reservations.length, skipped, saved: 0, failed: 0, retryLater: 0 };
    const confirmations = [];

    for (const reservation of reservations) {
      const outcome = await this.#handle(reservation, now);
      if (outcome.confirmation) {
        confirmations.push(outcome.confirmation);
      } else if (outcome.reported) {
        summary.failed += 1;
      } else {
        summary.retryLater += 1;
        this.#logRetry(reservation, outcome.error);
      }
    }

    if (confirmations.length > 0) {
      await this.reader.confirm(confirmations, { now });
      summary.saved = confirmations.length;
    }
    this.logger.info(JSON.stringify({ event: "SITEMINDER_RESERVATIONS_RUN", ...summary }));
    return summary;
  }

  async #handle(reservation, now) {
    let outcome;
    try {
      outcome = await this.importer.importReservation(reservation);
    } catch (error) {
      return { error };
    }
    if (outcome.confirmation) {
      return outcome;
    }
    try {
      await this.reader.reportFailure({ ...reservation, processedAt: now.toISOString() }, outcome.failure, { now });
      return { reported: true };
    } catch (error) {
      return { error };
    }
  }

  #logRetry(reservation, error) {
    this.logger.warn(
      JSON.stringify({
        event: "SITEMINDER_RESERVATION_RETRY_LATER",
        messageId: reservation.messageId,
        status: reservation.status,
        reason: reasonOf(error),
      })
    );
  }
}

export default SiteMinderReservationSync;
