# Direct booking sites hosting

How the public direct booking websites (`*.direct.domits.com` today, hosts' own domains later) are served, and how the bundle that serves them gets there.

## Today

> Superseded for the fallback subdomains. Since 2026-09-23 every published
> `*.direct.domits.com` site is served by the multi-tenant distribution, not by Amplify. The
> table below still describes the marketplace hosts and the wildcard. See "Where the fallback
> subdomains run today" for the current picture.

The marketplace web app is hosted by AWS Amplify Hosting, app `d34jwd0sihmsus` (eu-north-1), branch auto-build:

| Hostname | Amplify branch | CloudFront distribution |
| --- | --- | --- |
| `www.domits.com` | `main` | `d3fqel8fucbpox.cloudfront.net` |
| `acceptance.domits.com` | `acceptance` | `d3fqel8fucbpox.cloudfront.net` |
| `direct.domits.com` and `*.direct.domits.com` | `acceptance` | `d1q86xmwckzc37.cloudfront.net` |

The third row is an Amplify custom-domain association with a wildcard subdomain, created in the console. It serves the **acceptance** build of the marketplace app; the app recognises the hostname suffix and renders `WebsitePublicSitePage` at `/`. The artifacts live in Amplify's own S3 bucket in an AWS-managed account. Nothing in this repository configures any of it, and it is not a valid origin for anything else.

Deep links on both distributions redirect `/path` to `/path/` and then return `index.html`; only `/` matters for a site.

## After

A second bundle of the same web app is built by CI with `REACT_APP_DIRECT_BOOKING_WEBSITE_SURFACE=true`, so it renders the site page on any hostname, and is uploaded to an S3 bucket we own:

| Environment | Bucket | Region |
| --- | --- | --- |
| acceptance | `domits-direct-booking-sites-acceptance` | eu-north-1 |

That bucket is the single origin of the CloudFront multi-tenant distribution (CloudFront SaaS Manager) that will carry hosts' custom domains and, once cut over, the `*.direct.domits.com` wildcard. The marketplace app stays on Amplify.

```
theirvilla.com ──CNAME──▶ <connection group routing endpoint>.cloudfront.net
                                 │  multi-tenant distribution (template + tenants)
                                 ▼
                     s3://domits-direct-booking-sites-acceptance   ◀── deploy-direct-booking-sites.yml
                                 │
                                 ▼
                     browser: GET /property/website/public/render?domain=theirvilla.com
```

## Pipeline

`.github/workflows/deploy-direct-booking-sites.yml` runs on every push to `acceptance` that touches `frontend/web/**`, and on demand.

1. Installs through `.github/actions/setup-frontend` (Node 22, the pinned npm, `npm ci`).
2. Writes `frontend/web/src/aws-exports.js` from the `AWS_EXPORTS` secret and fails if the secret is empty.
3. Builds with `REACT_APP_DIRECT_BOOKING_WEBSITE_SURFACE=true` and every other `REACT_APP_*` the code reads, taken from repository variables of the same name.
4. Uploads `build/static/**` with `public, max-age=31536000, immutable` (file names are content-hashed), the remaining root files with `public, max-age=300`, and finally `index.html` with `no-cache, no-store, must-revalidate`. `index.html` goes last so it never references an asset that is not uploaded yet.
5. Invalidates `/index.html` and `/` on the distribution named by the `DIRECT_BOOKING_SITES_DISTRIBUTION_ID` repository variable, or says so if that variable is not set yet.

Old hashed assets are not deleted, so a tab that loaded the previous `index.html` keeps working. The bucket is versioned; add a lifecycle rule for non-current versions once the pattern has settled.

## Repository configuration

Secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (shared with `deploy.yml`), `AWS_EXPORTS` (the acceptance `aws-exports.js` content), `REACT_APP_STRIPE_PUBLIC_KEY`.

Variables: `DIRECT_BOOKING_SITES_DISTRIBUTION_ID` once the multi-tenant distribution exists, and one `REACT_APP_*` variable per value the Amplify acceptance build sets. To read those values from Amplify:

```
aws amplify get-app --app-id d34jwd0sihmsus --query 'app.environmentVariables'
aws amplify get-branch --app-id d34jwd0sihmsus --branch-name acceptance --query 'branch.environmentVariables'
```

For a site bundle the values that matter are `REACT_APP_DIRECT_BOOKING_WEBSITE_BOOKINGS_API_BASE` (where booking requests go; the code falls back to the `development` stage of API `92a7z9y2m5`) and `REACT_APP_DIRECT_BOOKING_WEBSITE_FALLBACK_DOMAIN_SUFFIX` (defaults to `direct.domits.com`). The quote endpoint base is not configurable; it is `PROPERTY_API_BASE` in `hostproperty/constants.js`.

## Where the fallback subdomains run today (2026-09-23, final state)

All nine published fallback addresses are served by the multi-tenant distribution, not by
Amplify. This is the end state of the per-site cutover; only the wildcard and the apex are
left on Amplify, on purpose. Each one has its own `CNAME` in hosted zone `Z05841473F67D0RNUMZZ9` pointing at
`d3lo4q6asaa174.cloudfront.net` with a TTL of 60, and each is listed as an exact domain on
tenant `test-direct` (`dt_3JidivSSrpsHkv7QdwDnx0FxwTu`) on distribution `E18TUBOKUXD9TW`.
The tenant carries a wildcard ACM certificate for `*.direct.domits.com`
(`arn:aws:acm:us-east-1:115462458880:certificate/84f32fca-feef-4a45-911f-2dabc20ebf84`,
valid to 2027-04-09), so no per-domain certificate is needed.

A specific record beats the wildcard in DNS, so moving a site takes one `CNAME` plus the exact
domain on the tenant. Moving it back takes both as well: CloudFront routes a request to the most
specific domain association regardless of which endpoint DNS resolved, so while the exact domain
is still on the tenant, deleting the record alone does not move the site back to Amplify.

Still on Amplify:

| Record | Type | Target |
| --- | --- | --- |
| `*.direct.domits.com` | `CNAME` | `d1q86xmwckzc37.cloudfront.net` |
| `direct.domits.com` | `A` alias | `d1q86xmwckzc37.cloudfront.net` |

Because the wildcard still resolves to Amplify, a newly published site lands on Amplify until
someone adds it explicitly. The Amplify domain association must stay in place for as long as
that is true; removing it would break every address that still falls through to the wildcard.

### Why the wildcard is deliberately still on Amplify

The IAM role is no longer the blocker. `AWSAmplifyDomainRole-Z05841473F67D0RNUMZZ9` was
recreated on 2026-09-23, trusted by `amplify.amazonaws.com`, with one inline policy
`AmplifyRoute53DomainAccess` that grants `ChangeResourceRecordSets`, `ListResourceRecordSets`
and `GetHostedZone` on hosted zone `Z05841473F67D0RNUMZZ9` only, plus `GetChange` and the two
list-zones calls. Nothing outside Route 53 and nothing outside this zone.

The wildcard stays where it is because of the certificate, and that risk has not gone away:

- The association's certificate is `AMPLIFY_MANAGED`. Dropping `*` from the name set makes
  Amplify request a new certificate for whatever remains, which brings a new validation
  record and a spell in a pending state.
- The apex subdomain reports `verified: false` while `*` reports `verified: true`. The apex is
  an `A` alias because Route 53 cannot put a `CNAME` on an apex, while Amplify expects a
  `CNAME` there. Remove `*` and the only subdomain left is one Amplify has never verified, so
  the new certificate may not validate at all and `direct.domits.com` can be left stuck.

That failure is not cheap to undo. Putting `*` back means another managed-certificate request
and another wait, during which neither Amplify nor the tenant serves the wildcard. A per-site
move can be reversed with `rollback.sh`, which deletes the site's record and removes its domain
from the tenant; the rollback is only done once the tenant is `Deployed` again. This one cannot
be reversed that way.

`wildcard-migrate.sh` and `wildcard-rollback.sh` exist for this step but live outside the
repository, in `~/cutover-check`. Only their dry-runs have been run. Do not run the real thing
without someone on hand who can repair `direct.domits.com` if the association hangs.

### Checking whether the Amplify certificate was renewed

The Amplify-managed certificate covering the wildcard path runs to 2026-11-25. Both paths
present a certificate whose subject is `CN=*.direct.domits.com`, so the subject cannot tell
them apart; the expiry date can.

```
echo | openssl s_client -connect nonexistent-probe.direct.domits.com:443 \
  -servername nonexistent-probe.direct.domits.com 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates
```

A name with no record of its own resolves through the wildcard, so this reads the Amplify
certificate. `notAfter=Nov 25 23:59:59 2026 GMT` means it has not been renewed yet; a later
date means Amplify has reissued it and the deadline has moved.

`openssl` prints in UTC while `acm describe-certificate` prints in the account's local offset,
so the tenant certificate reads `Apr 8 23:59:59 2027 GMT` on the wire and `2027-04-09` in ACM.
Same instant, two renderings.

For contrast, the same command against an address that has already moved reads the tenant's
own certificate instead, which expires 2027-04-09:

```
echo | openssl s_client -connect wellness-villa-bisous-bf378265.direct.domits.com:443 \
  -servername wellness-villa-bisous-bf378265.direct.domits.com 2>/dev/null \
  | openssl x509 -noout -subject -dates
```

If the Amplify certificate is approaching expiry and the wildcard has still not moved, that is
the moment to decide: let Amplify renew it, or accept the risk above and move the wildcard.

## Adding or rolling back a single site

The scripts live in `docs/internal/tools/scripts/direct-booking-sites/`. They use the `domits`
profile, refuse anything that is not an exact published fallback address, and never touch
`direct.domits.com`, `*.direct.domits.com`, ACM validation records, or Amplify.

Both take `--dry-run`, which prints the full merged domain list and the records it would create
or delete without changing anything. Run that first, every time.

Adding a newly published site:

```
cd docs/internal/tools/scripts/direct-booking-sites
./migrate.sh --dry-run <slug>-<id8>.direct.domits.com
./migrate.sh <slug>-<id8>.direct.domits.com
```

It adds the domain to the tenant while keeping the domains already on it, waits for `Deployed`,
compares the tenant before and after, and only then creates the `CNAME`. The comparison fails
the run if any field other than the domain list changed, or if the list is not exactly the old
list plus the domains asked for. `update-distribution-tenant` treats every field as optional,
so the scripts pass `DistributionId`, `ConnectionGroupId`, `Customizations`, `Parameters` and
`Enabled` back explicitly; a dropped `Customizations` would take the certificate with it and
break TLS for every domain on the tenant.

Putting a site back on Amplify:

```
./rollback.sh --dry-run <slug>-<id8>.direct.domits.com
./rollback.sh <slug>-<id8>.direct.domits.com
```

It deletes the record first, waits until Route 53 reports the change `INSYNC` (at most five
minutes), then waits the deleted record's TTL plus 30 seconds so resolvers drop their cached
copy, and only then removes the domain from the tenant. Traffic is back on Amplify only once the
domain has left the tenant and the tenant is `Deployed`; the record deletion alone does not move
it. A resolver that keeps a record longer than its TTL can still send a visitor to the routing
endpoint after that and get a CloudFront error; the script cannot control that. It refuses to
delete a record whose value is not the routing endpoint, and refuses to empty the tenant.

If it stops or is interrupted at any point, run it again. Before each deletion it writes
`rollback-pending-<domain>.txt` with the record's TTL, and adds the change id once Route 53 has
accepted the deletion, so a rerun checks `INSYNC` and waits the TTL again before it touches the
tenant; the file is removed once the tenant comparison has passed. When the change id is
unknown, because the run stopped between the deletion and saving the id or because the record
was deleted by hand, `INSYNC` cannot be checked. It then waits the five-minute `INSYNC` limit
plus the TTL plus the margin instead, taking the TTL from the file, or 60 seconds, the TTL the
scripts create records with, when there is no file.

Never run two of these scripts at the same time.

`published-domains.txt` is the allowlist both scripts validate against. It is a point-in-time
snapshot; regenerate it from `main.standalone_site` joined to `main.standalone_site_domain`
for `status = 'PUBLISHED'` and `domain_type = 'FALLBACK'` before adding a site published after
2026-09-23, or the script will refuse the new address.

## Console steps, in order

1. Bucket `domits-direct-booking-sites-acceptance`: private, versioning on. Done.
2. Add the repository secrets and variables above; run the workflow once by hand and confirm the bucket holds `index.html` and `static/`.
3. CloudFront: an Origin Access Control for the bucket; a multi-tenant distribution with the bucket as origin, default root object `index.html`, custom error responses `403` and `404` to `/index.html` with code `200`, caching that ignores query strings for `static/*`; a connection group, whose routing endpoint is the CNAME target hosts will use; managed certificates enabled. Bucket policy allows only that OAC.
4. Set `DIRECT_BOOKING_SITES_DISTRIBUTION_ID`; re-run the workflow and confirm the invalidation.
5. Create one tenant by hand for a domain we control and verify quote and booking request end to end before any host is offered the feature.
6. Done per site instead of per wildcard, see "Where the fallback subdomains run today". The wildcard itself is still on Amplify, held there by the managed-certificate risk rather than by permissions.

## Verifying a deploy

```
curl -sI https://<any tenant domain>/ | grep -i "cache-control\|etag"
curl -s https://<any tenant domain>/ | grep -o 'static/js/main\.[a-z0-9]*\.js'
```

The bundle name must match the latest workflow run's build; `index.html` must carry `no-cache`; a `static/js/*.js` must carry `immutable`.

## Rolling back

Every object is versioned. Restore the previous `index.html` version in the bucket (its hashed assets are still present) and issue the same invalidation.
