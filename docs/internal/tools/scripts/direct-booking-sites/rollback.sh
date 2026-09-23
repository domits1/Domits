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
  tenant_json > "$SNAP_BEFORE" || die "cannot save the tenant before the update"
  apply_tenant_domains "${KEEP[@]}" || die "tenant update failed; the DNS records were already deleted"
  note "tenant: removed ${REMOVE[*]:-}"
  step "removed" "${REMOVE[*]:-}"
  wait_deployed || step "tenant" "not Deployed within ten minutes"
  tenant_json > "$SNAP_AFTER" || true
  log ""
  log "Comparison before and after"
  node "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/compare-tenant.mjs" "$SNAP_BEFORE" "$SNAP_AFTER" \
    || step "warning" "the tenant changed on more than the domain list"
fi

summary
