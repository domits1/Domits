import { CloudWatchClient, DescribeAlarmsCommand } from "@aws-sdk/client-cloudwatch";

import { CHANNEX_HEALTH_ALARMS } from "../utils/channexHealthStatus.js";

export const createCloudWatchClient = (region) => new CloudWatchClient({ region });

// An alarm on the list that CloudWatch does not return was deleted or renamed; it stays
// on the page as MISSING instead of quietly dropping out.
const MISSING = "MISSING";

// Reads the current state of the health view's alarms (#2869, design note D3). The names
// are fixed in code, so the endpoint can never be used to read other alarms. Errors are
// not caught here: the health service turns them into "alarms unavailable".
export default class CloudWatchAlarmReader {
  constructor({ client, alarmNames = CHANNEX_HEALTH_ALARMS.map(({ name }) => name) }) {
    this.client = client;
    this.alarmNames = alarmNames;
  }

  async readAlarms() {
    const answer = await this.client.send(new DescribeAlarmsCommand({ AlarmNames: this.alarmNames }));
    const byName = new Map((answer?.MetricAlarms || []).map((alarm) => [alarm.AlarmName, alarm]));

    return this.alarmNames.map((name) => {
      const alarm = byName.get(name);
      if (!alarm) return { name, state: MISSING, updatedAt: null };

      const updated = alarm.StateUpdatedTimestamp ? new Date(alarm.StateUpdatedTimestamp).getTime() : null;
      return { name, state: alarm.StateValue, updatedAt: updated };
    });
  }
}
