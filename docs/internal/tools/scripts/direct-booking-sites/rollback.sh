#!/usr/bin/env bash

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib-common.sh"

ARGS=()
for a in "$@"; do
  case "$a" in
    --dry-run) DRY_RUN=1 ;;
    -*) die "onbekende optie: $a" ;;
    *) ARGS+=("$a") ;;
  esac
done
[ ${#ARGS[@]} -gt 0 ] || die "geef minstens een domein op. Gebruik: rollback.sh [--dry-run] <domein...>"

RUNLOG="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/rollback-$(date +%F-%H%M%S).log"
[ "$DRY_RUN" -eq 1 ] && log "DRY RUN, er wordt niets gewijzigd" || log "ECHTE RUN, log: $RUNLOG"
log ""

log "Validatie"
for d in "${ARGS[@]}"; do
  if msg="$(validate_domain "$d")"; then step "$d" "ok"; else step "$d" "GEWEIGERD: $msg"; die "validatie mislukt"; fi
done

log ""
log "Huidige staat"
CURRENT=()
while IFS= read -r _l; do [ -n "$_l" ] && CURRENT+=("$_l"); done < <(tenant_domains) || die "kan de tenant niet lezen"
[ ${#CURRENT[@]} -gt 0 ] || die "kan de tenant niet lezen of hij is leeg"
step "domeinen nu op de tenant" "${#CURRENT[@]}"

TO_DELETE=()
for d in "${ARGS[@]}"; do
  cur="$(record_value "$d")"
  if [ -z "$cur" ]; then
    step "$d" "geen CNAME, niets te verwijderen"
  elif [ "$cur" = "$ROUTING_ENDPOINT" ]; then
    step "$d" "CNAME naar het routing-endpoint, wordt verwijderd"
    TO_DELETE+=("$d")
  else
    step "$d" "wijst naar $cur, NIET van ons"
    die "weiger te verwijderen: $d wijst niet naar $ROUTING_ENDPOINT"
  fi
done

KEEP=()
REMOVE=()
for c in "${CURRENT[@]}"; do
  hit=0
  for d in "${ARGS[@]}"; do [ "$c" = "$d" ] && hit=1; done
  if [ "$hit" -eq 1 ]; then REMOVE+=("$c"); else KEEP+=("$c"); fi
done
step "blijft op de tenant" "${#KEEP[@]}: ${KEEP[*]:-geen}"
step "gaat van de tenant af" "${#REMOVE[@]}: ${REMOVE[*]:-geen}"
[ ${#KEEP[@]} -gt 0 ] || die "dit zou de tenant leegmaken; dat doe ik niet"

if [ "$DRY_RUN" -eq 1 ]; then
  log ""
  log "Zou doen:"
  if [ ${#TO_DELETE[@]} -gt 0 ]; then log "  route53: ${#TO_DELETE[@]} CNAME(s) verwijderen: ${TO_DELETE[*]:-}"; else log "  route53: niets te verwijderen"; fi
  if [ ${#REMOVE[@]} -gt 0 ]; then log "  tenant: ${#REMOVE[@]} domein(en) verwijderen, ${#KEEP[@]} blijven staan"; else log "  tenant: niets te verwijderen"; fi
  log "  daarna wachten op Deployed"
  log ""
  log "Na verwijdering valt het adres terug op de wildcard, dus op Amplify."
  exit 0
fi

exec > >(tee -a "$RUNLOG") 2>&1

log ""
log "DNS verwijderen"
for d in "${TO_DELETE[@]}"; do
  batch="$(change_batch "rollback $d" DELETE "$d" "$TTL" "$ROUTING_ENDPOINT")"
  if aws_r53 change-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" --change-batch "$batch" >/dev/null 2>&1; then
    note "route53: CNAME verwijderd voor $d"
    step "$d" "CNAME verwijderd"
  else
    step "$d" "MISLUKT"
    die "record verwijderen mislukt voor $d; de tenant is nog niet aangeraakt"
  fi
done

if [ ${#REMOVE[@]} -gt 0 ]; then
  log ""
  log "Tenant bijwerken"
  SNAP_BEFORE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/tenant-rb-before-$(date +%F-%H%M%S).json"
  SNAP_AFTER="${SNAP_BEFORE%-*.json}-after.json"
  tenant_json > "$SNAP_BEFORE" || die "kan de tenant niet opslaan voor de update"
  apply_tenant_domains "${KEEP[@]}" || die "tenant-update mislukt; de DNS-records zijn al verwijderd"
  note "tenant: verwijderd ${REMOVE[*]:-}"
  step "verwijderd" "${REMOVE[*]:-}"
  wait_deployed || step "tenant" "nog niet Deployed binnen tien minuten"
  tenant_json > "$SNAP_AFTER" || true
  log ""
  log "Vergelijking voor en na"
  node "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/compare-tenant.mjs" "$SNAP_BEFORE" "$SNAP_AFTER" \
    || step "let op" "de tenant is op meer dan de domeinenlijst gewijzigd"
fi

summary
