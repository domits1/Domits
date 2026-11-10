// Local run of the Channex health view (#2869) against the real database and CloudWatch.
// Read-only: it runs the same reads as GET /integrations/channex/health and prints the answer.
//
//   cd backend
//   node events/ChannelManagement/health.js
//
// Needs AWS credentials in the shell (the Domits SSO login). Without the
// cloudwatch:DescribeAlarms permission the answer says "alarms unavailable", which is
// the designed fallback, not a failure of the script.

// Set before the service is loaded: the AWS clients read the region when they are created.
process.env.AWS_REGION ||= "eu-north-1";

const { default: ChannexHealthService } = await import(
  "../../functions/.shared/channelManagement/services/channexHealthService.js"
);

const startedAt = Date.now();
try {
  const health = await new ChannexHealthService().getHealth();
  console.log(JSON.stringify(health, null, 2));
  console.log(`\nStatus: ${health.status} (${Date.now() - startedAt} ms)`);
  process.exit(0);
} catch (error) {
  console.error("Health check failed:", error?.name, error?.message);
  process.exit(1);
}
