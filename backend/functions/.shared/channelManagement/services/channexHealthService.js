import CloudWatchAlarmReader, { createCloudWatchClient } from "../providers/cloudwatchAlarmReader.js";
import ChannexAriOutboxRepository from "../repositories/channexAriOutboxRepository.js";
import ChannexHealthRepository from "../repositories/channexHealthRepository.js";
import { evaluateChannexHealth } from "../utils/channexHealthStatus.js";

// API Gateway gives up after 29 seconds; a hanging CloudWatch call must not use that up
// and take the database part down with it.
const ALARM_READ_TIMEOUT_MS = 3000;
const ALARM_TIMEOUT_REASON = "TIMEOUT";

const withTimeout = (promise, ms) => {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error("Timed out"), { name: ALARM_TIMEOUT_REASON })), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

// Builds the answer of GET /integrations/channex/health (#2869, design note sections 5-6):
// the database numbers, the alarm states and the status that the health rule gives them.
export default class ChannexHealthService {
  constructor({
    outbox = new ChannexAriOutboxRepository(),
    healthRepository = new ChannexHealthRepository(),
    alarmReader = new CloudWatchAlarmReader({ client: createCloudWatchClient(process.env.AWS_REGION) }),
    now = () => Date.now(),
    log = console,
  } = {}) {
    this.outbox = outbox;
    this.healthRepository = healthRepository;
    this.alarmReader = alarmReader;
    this.now = now;
    this.log = log;
  }

  // D4: CloudWatch is a separate service; if it fails, the database part is still shown
  // and the page says the alarms are unavailable. The failure is logged, not swallowed.
  async readAlarms() {
    try {
      return { available: true, items: await withTimeout(this.alarmReader.readAlarms(), ALARM_READ_TIMEOUT_MS) };
    } catch (error) {
      const reason = error?.name || "UNKNOWN_ERROR";
      this.log.warn(JSON.stringify({ event: "CHANNEX_HEALTH_ALARMS_UNAVAILABLE", error: reason }));
      return { available: false, reason, items: [] };
    }
  }

  async getHealth() {
    const now = this.now();
    // A database failure rejects the whole request: without the numbers the page has nothing true to show.
    const [outbox, lastRevisionAt, lastPoll, accounts, alarms] = await Promise.all([
      this.outbox.healthSummary({ now }),
      this.healthRepository.lastRevisionAt(),
      this.healthRepository.lastPoll(),
      this.healthRepository.accounts(),
      this.readAlarms(),
    ]);
    const bookings = { lastRevisionAt, ...lastPoll };
    const { status, reasons } = evaluateChannexHealth({ now, outbox, bookings, alarms, accounts });

    return { generatedAt: now, status, reasons, outbox, bookings, alarms, accounts };
  }
}
