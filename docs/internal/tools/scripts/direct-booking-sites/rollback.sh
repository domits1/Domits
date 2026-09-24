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
[[ ${#ARGS[@]} -gt 0 ]] || die "give at least one domain. Usage: rollback.sh [--dry-run] <domain...>"
unique_args "${ARGS[@]}"

RUNLOG="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/rollback-$(date +%F-%H%M%S).log"
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

TO_DELETE=()
for d in "${ARGS[@]}"; do
  cur="$(record_value "$d")" || die "cannot read the DNS record for $d from Route 53; nothing was changed"
  if [[ -z "$cur" ]]; then
    step "$d" "no CNAME, nothing to delete"
  elif [[ "$cur" = "$ROUTING_ENDPOINT" ]]; then
    step "$d" "CNAME to the routing endpoint, will be deleted"
    TO_DELETE+=("$d")
  else
    step "$d" "points at $cur, NOT ours"
    die "refusing to delete: $d does not point at $ROUTING_ENDPOINT"
  fi
done

KEEP=()
REMOVE=()
for c in "${CURRENT[@]}"; do
  hit=0
  for d in "${ARGS[@]}"; do [[ "$c" = "$d" ]] && hit=1; done
  if [[ "$hit" -eq 1 ]]; then REMOVE+=("$c"); else KEEP+=("$c"); fi
done
step "stays on the tenant" "${#KEEP[@]}: ${KEEP[*]:-none}"
step "comes off the tenant" "${#REMOVE[@]}: ${REMOVE[*]:-none}"
[[ ${#KEEP[@]} -gt 0 ]] || die "this would empty the tenant; refusing"

if [[ "$DRY_RUN" -eq 1 ]]; then
  log ""
  log "Would do:"
  if [[ ${#TO_DELETE[@]} -gt 0 ]]; then log "  route53: delete ${#TO_DELETE[@]} CNAME(s): ${TO_DELETE[*]:-}"; else log "  route53: nothing to delete"; fi
  if [[ ${#REMOVE[@]} -gt 0 ]]; then log "  tenant: remove ${#REMOVE[@]} domain(s), ${#KEEP[@]} stay"; else log "  tenant: nothing to remove"; fi
  log "  then wait for Deployed"
  log ""
  log "Only once the record is deleted and the domain has left the tenant does the address fall back to the wildcard, so to Amplify."
  exit 0
fi

exec > >(tee -a "$RUNLOG") 2>&1

SNAP_BEFORE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/tenant-rb-before-$(date +%F-%H%M%S)-$$.json"
SNAP_AFTER="${SNAP_BEFORE%.json}-after.json"
log ""
log "Snapshots"
step "before" "$SNAP_BEFORE"
step "after" "$SNAP_AFTER"

log ""
log "Deleting DNS"
for d in "${TO_DELETE[@]}"; do
  batch="$(change_batch "rollback $d" DELETE "$d" "$TTL" "$ROUTING_ENDPOINT")"
  if r53_change "$batch"; then
    note "route53: deletion of the CNAME for $d accepted"
    step "$d" "CNAME deletion accepted"
  else
    step "$d" "FAILED"
    note "route53: DELETE sent for $d, outcome unknown"
    die "deleting the record for $d failed with the AWS error above, so the outcome is unknown. Check whether the CNAME for $d still exists in hosted zone $HOSTED_ZONE_ID with list-resource-record-sets. The tenant was not touched."
  fi
done

DNS_STATE="no DNS record was deleted in this run"
if [[ ${#TO_DELETE[@]} -gt 0 ]]; then
  DNS_STATE="Route 53 accepted the deletion of the records for ${TO_DELETE[*]}; removal from the tenant and traffic moving back to Amplify are not confirmed"
fi

log ""
log "Updating the tenant"
if ! apply_tenant_domains remove "$SNAP_BEFORE" "${ARGS[@]}"; then
  case "$APPLY_RESULT" in
    "failed")
      note "tenant: update sent to remove ${ARGS[*]}, outcome unknown"
      die "the tenant update call failed with the AWS error above, so the outcome is unknown; $DNS_STATE. Check the domain list on tenant $TENANT_ID with get-distribution-tenant against $SNAP_BEFORE, then run rollback.sh again." ;;
    "stale") die "tenant update not applied: every update sent was rejected because the tenant had changed, so nothing was applied; $DNS_STATE. Run rollback.sh again." ;;
    *) die "tenant update refused, nothing was sent to the tenant; $DNS_STATE. Fix the cause above and run rollback.sh again." ;;
  esac
fi
if [[ "$APPLY_RESULT" = "unchanged" ]]; then
  note "tenant: no update sent, ${ARGS[*]} already off it"
  step "removed" "none, already off the tenant"
else
  note "tenant: updated, ${ARGS[*]} off it"
  step "updated" "${ARGS[*]} off the tenant"
fi
wait_deployed
case "$?" in
  0) : ;;
  1) step "tenant status" "read FAILED"
     incomplete "tenant: the status could not be read, deployment not confirmed" ;;
  *) step "tenant status" "not Deployed within ten minutes"
     incomplete "tenant: not Deployed within ten minutes" ;;
esac
tenant_json > "$SNAP_AFTER" \
  || die "cannot save the tenant after the update; $DNS_STATE. Check the domain list on tenant $TENANT_ID against $SNAP_BEFORE."
log ""
log "Comparison before and after"
if node "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/compare-tenant.mjs" "$SNAP_BEFORE" "$SNAP_AFTER" --remove "${ARGS[@]}"; then
  note "tenant: only the domain list changed"
else
  die "the tenant comparison was REJECTED; $DNS_STATE. Compare $SNAP_BEFORE with $SNAP_AFTER: check that no other domain vanished from the tenant, that no domain was added, and that Customizations, Parameters and Enabled are unchanged. Restore anything that vanished before running anything else."
fi

finish
