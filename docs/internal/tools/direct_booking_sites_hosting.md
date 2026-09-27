# Direct booking sites hosting

How the public direct booking websites are served, and how the bundle that serves them gets there.

## Today

Everything guests see on a direct booking website runs on CloudFront. That is true for the fallback addresses under
`*.direct.domits.com` and for hosts' own domains. Amplify only serves the marketplace.

| What | Served by |
| --- | --- |
| `www.domits.com` (Amplify branch `main`) | `d3fqel8fucbpox.cloudfront.net` |
| `acceptance.domits.com` (Amplify branch `acceptance`) | `d3fqel8fucbpox.cloudfront.net` |
| every `*.direct.domits.com` address | multi-tenant distribution `E18TUBOKUXD9TW` |
| every host's own domain | the same distribution, one tenant per domain |

The site bundle is the same web app, built by CI with `REACT_APP_DIRECT_BOOKING_WEBSITE_SURFACE=true` so it renders the
site page on any hostname, and uploaded to a bucket we own:

| Environment | Bucket | Region |
| --- | --- | --- |
| acceptance | `domits-direct-booking-sites-acceptance` | eu-north-1 |

That bucket is the single origin of the distribution.

```
anything.direct.domits.com ──CNAME──▶ d3lo4q6asaa174.cloudfront.net
theirvilla.com             ──CNAME──▶ (the same routing endpoint)
                                  │  multi-tenant distribution E18TUBOKUXD9TW
                                  ▼
                      s3://domits-direct-booking-sites-acceptance  ◀── deploy-direct-booking-sites.yml
                                  │
                                  ▼
                      browser: GET /property/website/public/render?domain=<hostname>
```

## The tenant that carries the fallback addresses

One tenant, `test-direct` (`dt_3JidivSSrpsHkv7QdwDnx0FxwTu`), carries `*.direct.domits.com` as a domain, next to a
number of exact names that were added before the wildcard moved. In hosted zone `Z05841473F67D0RNUMZZ9` the wildcard
record is a `CNAME` to `d3lo4q6asaa174.cloudfront.net` with a TTL of 60.

The tenant carries one ACM certificate for `*.direct.domits.com`
(`arn:aws:acm:us-east-1:115462458880:certificate/84f32fca-feef-4a45-911f-2dabc20ebf84`, valid to 2027-04-09), so no
address under that name needs a certificate of its own.

**Publishing a site needs nothing here.** A newly published site gets an address under `*.direct.domits.com` and the
wildcard already serves it. Unpublishing, renaming and deleting need nothing either: the app answers "not found" for
an address with no published site behind it.

The exact names are leftovers from the old per-site approach. They are harmless, because a more specific name and the
wildcard now point at the same tenant, and they can be dropped whenever someone feels like tidying up. Hosts' own
domains keep working the way they always did: each one gets its own tenant, named `dbw-<site id>`.

## The bare direct.domits.com is gone, on purpose

`direct.domits.com` without a subdomain no longer resolves, and that is deliberate. It never carried a site; it showed
the marketplace bundle with a "not found" page. Our certificate covers `*.direct.domits.com` only and has no entry for
the bare name, so the bare name could not move to the tenant. Giving it back would mean requesting a second
certificate for a name nothing uses.

Nothing in `frontend/web/src` links to it.

## Pipeline

`.github/workflows/deploy-direct-booking-sites.yml` runs on every push to `acceptance` that touches `frontend/web/**`,
and on demand.

1. Installs through `.github/actions/setup-frontend` (Node 22, the pinned npm, `npm ci`).
2. Writes `frontend/web/src/aws-exports.js` from the `AWS_EXPORTS` secret and fails if the secret is empty.
3. Builds with `REACT_APP_DIRECT_BOOKING_WEBSITE_SURFACE=true` and every other `REACT_APP_*` the code reads, taken from
   repository variables of the same name.
4. Uploads `build/static/**` with `public, max-age=31536000, immutable` (file names are content-hashed), the remaining
   root files with `public, max-age=300`, and finally `index.html` with `no-cache, no-store, must-revalidate`.
   `index.html` goes last so it never references an asset that is not uploaded yet.
5. Invalidates `/index.html` and `/` on every tenant of the distribution named by the
   `DIRECT_BOOKING_SITES_DISTRIBUTION_ID` repository variable.

Old hashed assets are not deleted, so a tab that loaded the previous `index.html` keeps working. The bucket is
versioned; add a lifecycle rule for non-current versions once the pattern has settled.

## Repository configuration

Secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (shared with `deploy.yml`), `AWS_EXPORTS` (the acceptance
`aws-exports.js` content), `REACT_APP_STRIPE_PUBLIC_KEY`.

Variables: `DIRECT_BOOKING_SITES_DISTRIBUTION_ID`, and one `REACT_APP_*` variable per value the Amplify acceptance
build sets. To read those values from Amplify:

```
aws amplify get-app --app-id d34jwd0sihmsus --query 'app.environmentVariables'
aws amplify get-branch --app-id d34jwd0sihmsus --branch-name acceptance --query 'branch.environmentVariables'
```

For a site bundle the values that matter are `REACT_APP_DIRECT_BOOKING_WEBSITE_BOOKINGS_API_BASE` (where booking
requests go; the code falls back to the `development` stage of API `92a7z9y2m5`) and
`REACT_APP_DIRECT_BOOKING_WEBSITE_FALLBACK_DOMAIN_SUFFIX` (defaults to `direct.domits.com`). The quote endpoint base is
not configurable; it is `PROPERTY_API_BASE` in `hostproperty/constants.js`.

## What happened on 27 September 2026, and why

Until that evening the wildcard `*.direct.domits.com` still pointed at Amplify, so a newly published site landed on
Amplify until someone moved it by hand, one site at a time.

The other option on the table was a scheduled Lambda that would watch for new sites and add each one to the tenant and
to Route 53 by itself. Moving the wildcard won because it removes the problem instead of automating it: no new Lambda,
no new IAM role, no schedule, no per-site state to get out of step, and no growth in tenants or invalidation calls as
the number of sites grows. It is also cheaper at any number of sites.

What was done, in order: the fallback names of every site that existed, including sites still in preview, were added to
the tenant as exact names with their own `CNAME`, so no live site could depend on the wildcard during the change. Then
the Amplify domain association for `direct.domits.com` was deleted, `*.direct.domits.com` was added to the tenant, and
the wildcard record was pointed at the routing endpoint. Finally the bare name and Amplify's leftover certificate
validation record were removed.

Addresses that were **not** an exact name on the tenant, so typos, scanners and the bare name, were unreachable for
**6 minutes and 20 seconds**. No published site was affected at any moment. Amplify released the wildcard about three
minutes after the association was deleted, and left every record in the hosted zone untouched.

The full log of the evening, with every command and its output, is kept outside this repository by whoever ran it.

## What the rehearsal proved

Before the real change, the risky parts were tried on a throwaway domain with a throwaway tenant and certificate, both
deleted afterwards. Two things were unknown and both came back in our favour:

- **One tenant can hold a wildcard and exact names under it at the same time**, and serves both. That is what makes the
  current setup possible at all.
- **CloudFront does not refuse a domain whose DNS points somewhere else.** A wildcard was accepted onto a tenant while
  its DNS still pointed at an address that routes nowhere.

Two traps worth remembering, both found in the rehearsal:

- After a DNS change, check with a hostname you have never looked up on that machine, or with
  `curl --resolve <name>:443:<ip>`. The system resolver cache kept an old address and made a working change look
  broken, while every DNS server already had the new answer.
- After deleting something in AWS, confirm with a `get` or `describe` on that exact resource, not with a `list`. A list
  showed a deleted certificate for a while after the delete had already succeeded.

## Changing the tenant later: the rules

The tenant now carries every fallback address, so a bad change to it breaks all of them at once. It is rarely touched,
which is exactly why the rules should be read before touching it.

**Always send every field back.** `update-distribution-tenant` treats every field as optional and silently drops what
you leave out. Dropping `Customizations` takes the certificate with it and breaks TLS for every address on the tenant.
Read the tenant first and send `DistributionId`, `ConnectionGroupId`, `Customizations`, `Parameters`, `Enabled` and the
full `Domains` list back, using the `ETag` from that same read:

```
aws cloudfront get-distribution-tenant --profile domits --region us-east-1 \
  --id dt_3JidivSSrpsHkv7QdwDnx0FxwTu --output json > /tmp/tenant-before.json
```

Build the new domain list from that file rather than typing it, send the update with `--if-match` set to its `ETag`,
then wait until the tenant is `Deployed` again.

**Compare before and after.** `docs/internal/tools/scripts/direct-booking-sites/compare-tenant.mjs` reads the two
snapshots, ignores the fields that always change (`Domains`, `LastModifiedTime`, `Status`), and fails if any other
field moved or if the domain list is not exactly the old list with the requested change applied:

```
aws cloudfront get-distribution-tenant --profile domits --region us-east-1 \
  --id dt_3JidivSSrpsHkv7QdwDnx0FxwTu --output json > /tmp/tenant-after.json
node docs/internal/tools/scripts/direct-booking-sites/compare-tenant.mjs \
  /tmp/tenant-before.json /tmp/tenant-after.json --add example.direct.domits.com
```

Use `--remove` the same way. Write the snapshots outside the repository, as above, so they are never committed.

**Leave these alone.** The wildcard record, the certificate's own validation record (the `_…` `CNAME` under
`direct.domits.com` that ACM created; ACM stops renewing without it, and the command below prints its name), and the
tenants that belong to hosts' own domains.

**One writer at a time.** Two people changing the same tenant means one of them is rejected on a stale `ETag`, and in
the worst case a domain list that does not hold what you think it holds.

## Certificate renewal

The tenant's certificate runs to 2027-04-09. ACM renews it by itself as long as its validation record stays in place
and resolves publicly. To check both:

```
CERT=arn:aws:acm:us-east-1:115462458880:certificate/84f32fca-feef-4a45-911f-2dabc20ebf84
aws acm describe-certificate --profile domits --region us-east-1 --certificate-arn "$CERT" \
  --query 'Certificate.{Status:Status,NotAfter:NotAfter,Renewal:RenewalEligibility}'

VALIDATION=$(aws acm describe-certificate --profile domits --region us-east-1 --certificate-arn "$CERT" \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord.Name' --output text)
dig +short CNAME "$VALIDATION"
```

`Status` should be `ISSUED`, `Renewal` should be `ELIGIBLE`, and the `dig` must return an `acm-validations.aws` target.
A missing validation record is the one thing that quietly stops renewal. Asking ACM for the record's name rather than
writing it down here keeps this working if the certificate is ever reissued.

`openssl` and the browser print certificate dates in UTC while `acm describe-certificate` prints them in the account's
local offset, so the same certificate reads `Apr 8 23:59:59 2027 GMT` on the wire and `2027-04-09` in ACM.

## Console steps that set this up

Kept for reference; all of it is done.

1. Bucket `domits-direct-booking-sites-acceptance`: private, versioning on.
2. The repository secrets and variables above.
3. CloudFront: an Origin Access Control for the bucket; a multi-tenant distribution with the bucket as origin, default
   root object `index.html`, custom error responses `403` and `404` to `/index.html` with code `200`, caching that
   ignores query strings for `static/*`; a connection group, whose routing endpoint is the CNAME target every hostname
   uses. The bucket policy allows only that OAC. The distribution itself keeps CloudFront's default certificate; each
   tenant brings the certificate for its own names.
4. The tenant `test-direct` with the wildcard certificate, and the wildcard record pointing at the routing endpoint.

## Verifying a deploy

```
curl -sI https://<any site address>/ | grep -i "cache-control\|etag"
curl -s https://<any site address>/ | grep -o 'static/js/main\.[a-z0-9]*\.js'
```

The bundle name must match the latest workflow run's build; `index.html` must carry `no-cache`; a `static/js/*.js` must
carry `immutable`.

## Rolling back a deploy

Every object is versioned. Restore the previous `index.html` version in the bucket (its hashed assets are still
present) and issue the same invalidation. This is about the bundle only; it has nothing to do with DNS or the tenant.
