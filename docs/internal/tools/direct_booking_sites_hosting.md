# Direct booking sites hosting

How the public direct booking websites (`*.direct.domits.com` today, hosts' own domains later) are served, and how the bundle that serves them gets there.

## Today

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

## Console steps, in order

1. Bucket `domits-direct-booking-sites-acceptance`: private, versioning on. Done.
2. Add the repository secrets and variables above; run the workflow once by hand and confirm the bucket holds `index.html` and `static/`.
3. CloudFront: an Origin Access Control for the bucket; a multi-tenant distribution with the bucket as origin, default root object `index.html`, custom error responses `403` and `404` to `/index.html` with code `200`, caching that ignores query strings for `static/*`; a connection group, whose routing endpoint is the CNAME target hosts will use; managed certificates enabled. Bucket policy allows only that OAC.
4. Set `DIRECT_BOOKING_SITES_DISTRIBUTION_ID`; re-run the workflow and confirm the invalidation.
5. Create one tenant by hand for a domain we control and verify quote and booking request end to end before any host is offered the feature.
6. Only after custom domains are live for hosts: add a wildcard tenant for `*.direct.domits.com`, repoint DNS from the Amplify association to the routing endpoint, remove the Amplify domain association.

## Verifying a deploy

```
curl -sI https://<any tenant domain>/ | grep -i "cache-control\|etag"
curl -s https://<any tenant domain>/ | grep -o 'static/js/main\.[a-z0-9]*\.js'
```

The bundle name must match the latest workflow run's build; `index.html` must carry `no-cache`; a `static/js/*.js` must carry `immutable`.

## Rolling back

Every object is versioned. Restore the previous `index.html` version in the bucket (its hashed assets are still present) and issue the same invalidation.
