#!/usr/bin/env bash

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib-common.sh"

ARGS=()
for a in "$@"; do
  case "$a" in
    --dry-run) DRY_RUN=1 ;;
    -*) die "unknown option: $a" ;;
    *) ARGS+=("$a") ;;
  esac
done
[[ ${#ARGS[@]} -gt 0 ]] || die "give at least one domain. Usage: migrate.sh [--dry-run] <domain...>"
unique_args "${ARGS[@]}"
msg="$(check_limit)" || die "$msg"

RUNLOG="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/migrate-$(date +%F-%H%M%S).log"
[[ "$DRY_RUN" -eq 1 ]] && log "DRY RUN, nothing will be changed" || log "REAL RUN, log: $RUNLOG"
log ""

log "Validation"
for d in "${ARGS[@]}"; do
  if msg="$(validate_domain "$d")"; then step "$d" "ok"; else step "$d" "REFUSED: $msg"; die "validation failed"; fi
done

log ""
log "Current state"
CURRENT=()
while IFS= read -r _l; do [[ -n "$_l" ]] && CURRENT+=("$_l"); done < <(tenant_domains) || die "cannot read the tenant"
[[ ${#CURRENT[@]} -gt 0 ]] || die "cannot read the tenant, or it is empty"
step "domains on the tenant now" "${#CURRENT[@]}"
for d in "${CURRENT[@]}"; do step "  $d" "present"; done

TO_ADD=()
for d in "${ARGS[@]}"; do
  found=0
  for c in "${CURRENT[@]}"; do [[ "$c" = "$d" ]] && found=1; done
  [[ "$found" -eq 0 ]] && TO_ADD+=("$d") || step "$d" "was already on the tenant"
done

NEW_TOTAL=$(( ${#CURRENT[@]} + ${#TO_ADD[@]} ))
step "after adding" "$NEW_TOTAL domains"
[[ "$NEW_TOTAL" -le "$MAX_TENANT_DOMAINS" ]] || die "that would exceed the configured limit of $MAX_TENANT_DOMAINS"

log ""
log "DNS precheck"
TO_CREATE=()
for d in "${ARGS[@]}"; do
  cur="$(record_value "$d")" || die "cannot read the DNS record for $d from Route 53; nothing was changed"
  if [[ -z "$cur" ]]; then
    step "$d" "no record, CREATE to $ROUTING_ENDPOINT TTL $TTL"
    TO_CREATE+=("$d")
  elif [[ "$cur" = "$ROUTING_ENDPOINT" ]]; then
    step "$d" "already points at the routing endpoint, skipping"
  else
    step "$d" "ALREADY EXISTS and points at $cur"
    die "CREATE would fail on $d. Remove the record deliberately first, or leave it alone."
  fi
done

if [[ "$DRY_RUN" -eq 1 ]]; then
  log ""
  log "Full domain list on the tenant after merging (${NEW_TOTAL})"
  for d in "${CURRENT[@]}"; do step "  $d" "stays"; done
  if [[ ${#TO_ADD[@]} -gt 0 ]]; then for d in "${TO_ADD[@]}"; do step "  $d" "NEW"; done; fi
  log ""
  log "Would do:"
  if [[ ${#TO_ADD[@]} -gt 0 ]]; then log "  tenant: add ${#TO_ADD[@]} domain(s): ${TO_ADD[*]:-}"; else log "  tenant: nothing to add"; fi
  if [[ ${#TO_CREATE[@]} -gt 0 ]]; then log "  route53: create ${#TO_CREATE[@]} CNAME(s) to $ROUTING_ENDPOINT TTL $TTL: ${TO_CREATE[*]:-}"; else log "  route53: nothing to create"; fi
  log "  then wait for Deployed and check the tenant status per domain"
  log ""
  log "Left untouched: direct.domits.com, *.direct.domits.com, ACM validation records, Amplify."
  exit 0
fi

exec > >(tee -a "$RUNLOG") 2>&1

SNAP_BEFORE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/tenant-before-$(date +%F-%H%M%S)-$$.json"
SNAP_AFTER="${SNAP_BEFORE%.json}-after.json"
log ""
log "Snapshots"
step "before" "$SNAP_BEFORE"
step "after" "$SNAP_AFTER"

log ""
log "Updating the tenant"
if ! apply_tenant_domains add "$SNAP_BEFORE" "${ARGS[@]}"; then
  case "$APPLY_RESULT" in
    "failed")
      note "tenant: update sent to add ${ARGS[*]}, outcome unknown"
      die "the tenant update call failed with the AWS error above, so the outcome is unknown. Check the domain list on tenant $TENANT_ID with get-distribution-tenant against $SNAP_BEFORE. DNS was not touched." ;;
    "stale") die "tenant update not applied: every update sent was rejected because the tenant had changed, so nothing was applied. DNS was not touched. Run migrate.sh again." ;;
    *) die "tenant update refused, nothing was sent to the tenant. DNS was not touched." ;;
  esac
fi
if [[ "$APPLY_RESULT" = "unchanged" ]]; then
  note "tenant: no update sent, ${ARGS[*]} already on it"
  step "added" "none, already on the tenant"
  TENANT_STATE="this run sent no tenant update"
else
  note "tenant: updated, ${ARGS[*]} on it"
  step "updated" "${ARGS[*]} on the tenant"
  TENANT_STATE="the tenant was already updated by this run"
fi
wait_deployed
case "$?" in
  0) : ;;
  1) incomplete "tenant: the status could not be read, deployment not confirmed"
     die "cannot read the tenant status, so deployment is not confirmed; $TENANT_STATE. DNS was not touched." ;;
  *) incomplete "tenant: not Deployed within ten minutes"
     die "the tenant did not reach Deployed within ten minutes; $TENANT_STATE. DNS was not touched." ;;
esac

tenant_json > "$SNAP_AFTER" || die "cannot save the tenant after the update; $TENANT_STATE. DNS was not touched."
log ""
log "Comparison before and after"
if node "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/compare-tenant.mjs" "$SNAP_BEFORE" "$SNAP_AFTER" --add "${ARGS[@]}"; then
  note "tenant: only the domain list changed"
else
  die "the tenant comparison was REJECTED; $TENANT_STATE. Compare $SNAP_BEFORE with $SNAP_AFTER and restore anything that vanished. DNS was not touched."
fi

log ""
log "Creating DNS"
for d in "${TO_CREATE[@]}"; do
  st="$(tenant_domain_status "$d")" || die "cannot read the tenant before creating the record for $d"
  [[ "$st" != "ABSENT" ]] || die "$d is no longer on the tenant, so its record was not created; run migrate.sh again"
  batch="$(change_batch "migrate $d" CREATE "$d" "$TTL" "$ROUTING_ENDPOINT")"
  if r53_change "$batch"; then
    note "route53: CNAME created for $d"
    step "$d" "CNAME created"
  else
    step "$d" "FAILED"
    note "route53: CREATE sent for $d, outcome unknown"
    die "creating the record for $d failed with the AWS error above, so the outcome is unknown. Check whether a CNAME for $d exists in hosted zone $HOSTED_ZONE_ID with list-resource-record-sets."
  fi
done

log ""
log "Check on the tenant"
for d in "${ARGS[@]}"; do
  result="timeout"
  st=""
  for i in $(seq 1 30); do
    if ! st="$(tenant_domain_status "$d")"; then result="unreadable"; break; fi
    case "$st" in
      "active"|"Pointed to CloudFront"|"pointed-to-cloudfront") result="ok"; break ;;
      *) ;;
    esac
    sleep 10
  done
  case "$result" in
    "ok") step "$d" "$st" ;;
    "unreadable")
      step "$d" "status read FAILED"
      incomplete "$d: the tenant status could not be read" ;;
    *)
      step "$d" "not confirmed after five minutes, last status: ${st:-unknown}"
      incomplete "$d: still ${st:-unknown} after five minutes" ;;
  esac
done

finish
