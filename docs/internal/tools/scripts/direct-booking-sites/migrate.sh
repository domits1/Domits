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
  cur="$(record_value "$d")"
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

SNAP_BEFORE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/tenant-before-$(date +%F-%H%M%S).json"
SNAP_AFTER="${SNAP_BEFORE%-*.json}-after.json"

if [[ ${#TO_ADD[@]} -gt 0 ]]; then
  log ""
  log "Updating the tenant"
  tenant_json > "$SNAP_BEFORE" || die "cannot save the tenant before the update"
  step "snapshot before" "$(basename "$SNAP_BEFORE")"

  apply_tenant_domains "${CURRENT[@]}" "${TO_ADD[@]}" || die "tenant update failed, DNS was not touched"
  note "tenant: added ${TO_ADD[*]:-}"
  step "added" "${TO_ADD[*]:-}"
  wait_deployed || die "tenant did not reach Deployed within ten minutes; DNS was not touched"

  tenant_json > "$SNAP_AFTER" || die "cannot save the tenant after the update"
  log ""
  log "Comparison before and after"
  if node "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/compare-tenant.mjs" "$SNAP_BEFORE" "$SNAP_AFTER" "${TO_ADD[@]}"; then
    note "tenant: only the domain list changed"
  else
    die "the tenant looks different after the update than asked for; DNS was not touched"
  fi
fi

log ""
log "Creating DNS"
for d in "${TO_CREATE[@]}"; do
  batch="$(change_batch "migrate $d" CREATE "$d" "$TTL" "$ROUTING_ENDPOINT")"
  if aws_r53 change-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" --change-batch "$batch" >/dev/null 2>&1; then
    note "route53: CNAME created for $d"
    step "$d" "CNAME created"
  else
    step "$d" "FAILED"
    die "creating the record failed for $d"
  fi
done

log ""
log "Check on the tenant"
for d in "${ARGS[@]}"; do
  ok=0
  for i in $(seq 1 30); do
    st="$(tenant_domain_status "$d")"
    case "$st" in
      "active"|"Pointed to CloudFront"|"pointed-to-cloudfront") step "$d" "$st"; ok=1; break ;;
    esac
    sleep 10
  done
  [[ "$ok" -eq 1 ]] || step "$d" "not confirmed yet, last status: ${st:-unknown}"
done

summary
