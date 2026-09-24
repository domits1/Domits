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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
pending_file() { printf '%s/rollback-pending-%s.txt' "$SCRIPT_DIR" "$1"; return $?; }
on_tenant() {
  local c
  for c in "${CURRENT[@]}"; do [[ "$c" = "$1" ]] && return 0; done
  return 1
}
not_in_sync() {
  printf 'DNS deletion was accepted but not confirmed in sync: %s. The tenant was not touched, so the site is still served by the tenant. It is safe to run rollback.sh again.' "$1"
  return $?
}

TO_DELETE=()
DELETE_TTLS=()
WAIT_IDS=()
WAIT_FOR=()
UNKNOWN_SYNC=()
WAIT_TTL=0
for d in "${ARGS[@]}"; do
  line="$(record_line "$d")" || die "cannot read the DNS record for $d from Route 53; nothing was changed"
  pending="$(pending_file "$d")"
  if [[ -n "$line" ]]; then
    cur="${line%% *}"
    ttl="${line##* }"
    if [[ "$cur" != "$ROUTING_ENDPOINT" ]]; then
      step "$d" "points at $cur, NOT ours"
      die "refusing to delete: $d does not point at $ROUTING_ENDPOINT"
    fi
    [[ "$ttl" =~ ^[0-9]+$ ]] || die "cannot read the TTL of the CNAME for $d; nothing was changed"
    step "$d" "CNAME to the routing endpoint, TTL $ttl, will be deleted"
    TO_DELETE+=("$d")
    DELETE_TTLS+=("$ttl")
  elif [[ -f "$pending" ]]; then
    read -r change_id ttl < "$pending" || die "cannot read $pending; nothing was changed"
    [[ "$change_id" =~ ^[A-Za-z0-9]+$ && "$ttl" =~ ^[0-9]+$ ]] || die "$pending is not a valid pending file; nothing was changed"
    if [[ "$change_id" = "unknown" ]]; then
      step "$d" "no CNAME, deleted by an earlier run, change id unknown, TTL $ttl"
      UNKNOWN_SYNC+=("$d")
    else
      step "$d" "no CNAME, deleted by an earlier run as change $change_id, TTL $ttl"
      WAIT_IDS+=("$change_id")
    fi
  elif on_tenant "$d"; then
    ttl="$TTL"
    step "$d" "no CNAME but still on the tenant, TTL unknown, assuming $TTL"
    UNKNOWN_SYNC+=("$d")
  else
    step "$d" "no CNAME, nothing to delete"
    continue
  fi
  WAIT_FOR+=("$d")
  [[ "$ttl" -le "$WAIT_TTL" ]] || WAIT_TTL="$ttl"
done
SYNC_LIMIT=$(( SYNC_POLLS * SYNC_INTERVAL ))
WAIT_SECONDS=0
[[ ${#WAIT_FOR[@]} -eq 0 ]] || WAIT_SECONDS=$(( WAIT_TTL + DNS_MARGIN ))
[[ ${#UNKNOWN_SYNC[@]} -eq 0 ]] || WAIT_SECONDS=$(( WAIT_SECONDS + SYNC_LIMIT ))

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
  if [[ ${#WAIT_FOR[@]} -gt 0 ]]; then
    log "  then wait until Route 53 reports the deletion INSYNC, at most $SYNC_LIMIT seconds"
    if [[ ${#UNKNOWN_SYNC[@]} -gt 0 ]]; then
      log "  INSYNC cannot be checked for ${UNKNOWN_SYNC[*]}: the change id of its earlier deletion is unknown"
      log "  then wait $WAIT_SECONDS seconds: the INSYNC limit, $SYNC_LIMIT, plus the longest TTL, $WAIT_TTL, plus $DNS_MARGIN"
    else
      log "  then wait $WAIT_SECONDS seconds: the longest TTL, $WAIT_TTL, plus $DNS_MARGIN"
    fi
  fi
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
for i in "${!TO_DELETE[@]}"; do
  d="${TO_DELETE[$i]}"
  batch="$(change_batch "rollback $d" DELETE "$d" "${DELETE_TTLS[$i]}" "$ROUTING_ENDPOINT")"
  printf 'unknown %s\n' "${DELETE_TTLS[$i]}" > "$(pending_file "$d")" \
    || die "cannot write $(pending_file "$d"), so the record for $d was not deleted"
  if r53_change "$batch"; then
    note "route53: deletion of the CNAME for $d accepted"
    step "$d" "CNAME deletion accepted, change ${R53_CHANGE_ID:-unknown}"
    [[ -n "$R53_CHANGE_ID" ]] || die "$(not_in_sync "Route 53 returned no change id for $d")"
    printf '%s %s\n' "$R53_CHANGE_ID" "${DELETE_TTLS[$i]}" > "$(pending_file "$d")" \
      || die "$(not_in_sync "cannot write $(pending_file "$d")")"
    WAIT_IDS+=("$R53_CHANGE_ID")
  else
    step "$d" "FAILED"
    note "route53: DELETE sent for $d, outcome unknown"
    die "deleting the record for $d failed with the AWS error above, so the outcome is unknown. Check whether the CNAME for $d still exists in hosted zone $HOSTED_ZONE_ID with list-resource-record-sets. The tenant was not touched."
  fi
done

if [[ ${#WAIT_FOR[@]} -gt 0 ]]; then
  log ""
  log "Waiting for DNS"
  if [[ ${#WAIT_IDS[@]} -gt 0 ]]; then
    wait_insync "${WAIT_IDS[@]}"
    case "$?" in
      0) note "route53: deletion in sync for change(s) ${WAIT_IDS[*]}" ;;
      1) die "$(not_in_sync "$SYNC_DETAIL") If that change belongs to a deletion from an earlier run that is known to be long in sync, delete its rollback-pending file in $SCRIPT_DIR first." ;;
      *) die "$(not_in_sync "$SYNC_DETAIL")" ;;
    esac
  fi
  if [[ ${#UNKNOWN_SYNC[@]} -gt 0 ]]; then
    step "INSYNC not checkable, change id unknown" "${UNKNOWN_SYNC[*]}"
    step "waiting" "$WAIT_SECONDS seconds: INSYNC limit $SYNC_LIMIT plus TTL $WAIT_TTL plus $DNS_MARGIN"
  else
    step "waiting" "$WAIT_SECONDS seconds: TTL $WAIT_TTL plus $DNS_MARGIN"
  fi
  sleep "$WAIT_SECONDS"
  note "route53: waited $WAIT_SECONDS seconds for resolvers to drop the deleted record(s)"
fi

DNS_STATE="no DNS record was deleted"
if [[ ${#WAIT_FOR[@]} -gt 0 ]]; then
  DNS_STATE="the records for ${WAIT_FOR[*]} are deleted in Route 53; removal from the tenant and traffic moving back to Amplify are not confirmed"
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
  for d in "${ARGS[@]}"; do rm -f "$(pending_file "$d")"; done
else
  die "the tenant comparison was REJECTED; $DNS_STATE. Compare $SNAP_BEFORE with $SNAP_AFTER: check that no other domain vanished from the tenant, that no domain was added, and that Customizations, Parameters and Enabled are unchanged. Restore anything that vanished before running anything else."
fi

finish
