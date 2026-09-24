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
  cur="$(record_value "$d")"
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
  log "After deletion the address falls back to the wildcard, so to Amplify."
  exit 0
fi

exec > >(tee -a "$RUNLOG") 2>&1

log ""
log "Deleting DNS"
for d in "${TO_DELETE[@]}"; do
  batch="$(change_batch "rollback $d" DELETE "$d" "$TTL" "$ROUTING_ENDPOINT")"
  if aws_r53 change-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" --change-batch "$batch" >/dev/null 2>&1; then
    note "route53: CNAME deleted for $d"
    step "$d" "CNAME deleted"
  else
    step "$d" "FAILED"
    die "deleting the record failed for $d; the tenant was not touched yet"
  fi
done

if [[ ${#REMOVE[@]} -gt 0 ]]; then
  log ""
  log "Updating the tenant"
  SNAP_BEFORE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/tenant-rb-before-$(date +%F-%H%M%S).json"
  SNAP_AFTER="${SNAP_BEFORE%-*.json}-after.json"
  DNS_GONE="no DNS record was deleted in this run"
  if [[ ${#TO_DELETE[@]} -gt 0 ]]; then
    DNS_GONE="the DNS records for ${TO_DELETE[*]} were already deleted, so those addresses are served by Amplify through the wildcard"
  fi
  apply_tenant_domains remove "$SNAP_BEFORE" "${ARGS[@]}" \
    || die "tenant update failed; $DNS_GONE. Check the domain list on tenant $TENANT_ID with get-distribution-tenant: the update may or may not have been applied. Run rollback.sh again once the cause is fixed."
  step "snapshot before" "$(basename "$SNAP_BEFORE")"
  note "tenant: removed ${REMOVE[*]:-}"
  step "removed" "${REMOVE[*]:-}"
  wait_deployed || step "tenant" "not Deployed within ten minutes"
  tenant_json > "$SNAP_AFTER" \
    || die "cannot save the tenant after the update; $DNS_GONE. Check the domain list on tenant $TENANT_ID against $(basename "$SNAP_BEFORE")."
  log ""
  log "Comparison before and after"
  if node "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/compare-tenant.mjs" "$SNAP_BEFORE" "$SNAP_AFTER" --remove "${ARGS[@]}"; then
    note "tenant: only the domain list changed"
  else
    die "the tenant comparison was REJECTED; $DNS_GONE. Compare $(basename "$SNAP_BEFORE") with $(basename "$SNAP_AFTER"): check that no other domain vanished from the tenant, that no domain was added, and that Customizations, Parameters and Enabled are unchanged. Restore anything that vanished before running anything else."
  fi
fi

summary
