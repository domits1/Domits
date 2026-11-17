import CloudWatchAlarmReader from "../../.shared/channelManagement/providers/cloudwatchAlarmReader.js";
import { CHANNEX_HEALTH_ALARMS } from "../../.shared/channelManagement/utils/channexHealthStatus.js";

const UPDATED = new Date("2026-10-26T12:05:00Z");

// A CloudWatch client that records the command it gets and answers with the given alarms.
const fakeClient = (metricAlarms) => ({
  send: jest.fn(async () => ({ MetricAlarms: metricAlarms })),
});

const awsAlarm = (name, state = "OK") => ({ AlarmName: name, StateValue: state, StateUpdatedTimestamp: UPDATED });
const allAlarmsOk = () => CHANNEX_HEALTH_ALARMS.map(({ name }) => awsAlarm(name));

describe("CloudWatchAlarmReader.readAlarms", () => {
  // The names are fixed in code, so the endpoint can never be used to read other alarms.
  test("asks for exactly the seven channel manager alarms in one call", async () => {
    const client = fakeClient(allAlarmsOk());

    await new CloudWatchAlarmReader({ client }).readAlarms();

    expect(client.send).toHaveBeenCalledTimes(1);
    const [command] = client.send.mock.calls[0];
    expect(command.input.AlarmNames).toEqual(CHANNEX_HEALTH_ALARMS.map(({ name }) => name));
  });

  test("returns each alarm's name, state and last change, in the order of the list", async () => {
    const alarms = allAlarmsOk().reverse();
    alarms[0] = awsAlarm(alarms[0].AlarmName, "ALARM");
    const client = fakeClient(alarms);

    const items = await new CloudWatchAlarmReader({ client }).readAlarms();

    expect(items.map((item) => item.name)).toEqual(CHANNEX_HEALTH_ALARMS.map(({ name }) => name));
    expect(items.find((item) => item.name === alarms[0].AlarmName)).toEqual({
      name: alarms[0].AlarmName,
      state: "ALARM",
      updatedAt: UPDATED.getTime(),
    });
  });

  // A deleted alarm must stay visible on the page instead of quietly dropping out.
  test("reports an alarm that CloudWatch no longer has as MISSING", async () => {
    const client = fakeClient(allAlarmsOk().filter((alarm) => alarm.AlarmName !== "channex-webhook-missed"));

    const items = await new CloudWatchAlarmReader({ client }).readAlarms();

    expect(items.find((item) => item.name === "channex-webhook-missed")).toEqual({
      name: "channex-webhook-missed",
      state: "MISSING",
      updatedAt: null,
    });
  });

  // The service turns a failure into "alarms unavailable"; the reader must not hide it.
  test("lets a CloudWatch error through", async () => {
    const client = { send: jest.fn(async () => Promise.reject(new Error("AccessDenied"))) };

    await expect(new CloudWatchAlarmReader({ client }).readAlarms()).rejects.toThrow("AccessDenied");
  });
});
