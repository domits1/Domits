import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const client = new LambdaClient({ region: process.env.AWS_REGION || "eu-north-1" });
const PRICELABS_LAMBDA = process.env.PRICELABS_LAMBDA_NAME || "PriceLabs-Integration";

/**
 * Fire-and-forget notifier that tells the PriceLabs Lambda to re-sync
 * calendar data for a host after a calendar override change.
 *
 * Errors are caught and logged — a PriceLabs sync failure must never
 * break the main calendar update flow.
 */
export class PriceLabsCalendarNotifier {
  async _notify(hostId, trigger) {
    if (!hostId) return;
    try {
      const payload = {
        httpMethod: "POST",
        path: "/internal/sync-booking",
        headers: {},
        body: JSON.stringify({ hostId, trigger }),
      };
      await client.send(new InvokeCommand({
        FunctionName:   PRICELABS_LAMBDA,
        InvocationType: "Event",
        Payload:        JSON.stringify(payload),
      }));
    } catch (err) {
      console.error("[PriceLabs] Failed to notify change:", err.message);
    }
  }

  async notifyCalendarChange(hostId) {
    return this._notify(hostId, "calendar_updated");
  }

  async notifyListingChange(hostId) {
    return this._notify(hostId, "listing_updated");
  }
}
