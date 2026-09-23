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
[ ${#ARGS[@]} -gt 0 ] || die "geef minstens een domein op. Gebruik: migrate.sh [--dry-run] <domein...>"

RUNLOG="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/migrate-$(date +%F-%H%M%S).log"
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
for d in "${CURRENT[@]}"; do step "  $d" "aanwezig"; done

TO_ADD=()
for d in "${ARGS[@]}"; do
  found=0
  for c in "${CURRENT[@]}"; do [ "$c" = "$d" ] && found=1; done
  [ "$found" -eq 0 ] && TO_ADD+=("$d") || step "$d" "stond al op de tenant"
done

NEW_TOTAL=$(( ${#CURRENT[@]} + ${#TO_ADD[@]} ))
step "na toevoegen" "$NEW_TOTAL domeinen"
[ "$NEW_TOTAL" -le "$MAX_TENANT_DOMAINS" ] || die "dat zou over de ingestelde grens van $MAX_TENANT_DOMAINS gaan"

log ""
log "DNS-voorcontrole"
TO_CREATE=()
for d in "${ARGS[@]}"; do
  cur="$(record_value "$d")"
  if [ -z "$cur" ]; then
    step "$d" "geen record, CREATE naar $ROUTING_ENDPOINT TTL $TTL"
    TO_CREATE+=("$d")
  elif [ "$cur" = "$ROUTING_ENDPOINT" ]; then
    step "$d" "wijst al naar het routing-endpoint, overslaan"
  else
    step "$d" "BESTAAT AL en wijst naar $cur"
    die "CREATE zou falen op $d. Verwijder het record eerst bewust, of laat het staan."
  fi
done

if [ "$DRY_RUN" -eq 1 ]; then
  log ""
  log "Volledige domeinlijst op de tenant na samenvoegen (${NEW_TOTAL})"
  for d in "${CURRENT[@]}"; do step "  $d" "blijft"; done
  if [ ${#TO_ADD[@]} -gt 0 ]; then for d in "${TO_ADD[@]}"; do step "  $d" "NIEUW"; done; fi
  log ""
  log "Zou doen:"
  if [ ${#TO_ADD[@]} -gt 0 ]; then log "  tenant: ${#TO_ADD[@]} domein(en) toevoegen: ${TO_ADD[*]:-}"; else log "  tenant: niets toe te voegen"; fi
  if [ ${#TO_CREATE[@]} -gt 0 ]; then log "  route53: ${#TO_CREATE[@]} CNAME(s) aanmaken naar $ROUTING_ENDPOINT TTL $TTL: ${TO_CREATE[*]:-}"; else log "  route53: niets aan te maken"; fi
  log "  daarna wachten op Deployed en per domein de tenantstatus controleren"
  log ""
  log "Blijft ongemoeid: direct.domits.com, *.direct.domits.com, ACM-validatierecords, Amplify."
  exit 0
fi

exec > >(tee -a "$RUNLOG") 2>&1

SNAP_BEFORE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/tenant-before-$(date +%F-%H%M%S).json"
SNAP_AFTER="${SNAP_BEFORE%-*.json}-after.json"

if [ ${#TO_ADD[@]} -gt 0 ]; then
  log ""
  log "Tenant bijwerken"
  tenant_json > "$SNAP_BEFORE" || die "kan de tenant niet opslaan voor de update"
  step "snapshot vooraf" "$(basename "$SNAP_BEFORE")"

  apply_tenant_domains "${CURRENT[@]}" "${TO_ADD[@]}" || die "tenant-update mislukt, DNS is niet aangeraakt"
  note "tenant: toegevoegd ${TO_ADD[*]:-}"
  step "toegevoegd" "${TO_ADD[*]:-}"
  wait_deployed || die "tenant werd niet Deployed binnen tien minuten; DNS is niet aangeraakt"

  tenant_json > "$SNAP_AFTER" || die "kan de tenant niet opslaan na de update"
  log ""
  log "Vergelijking voor en na"
  if node "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/compare-tenant.mjs" "$SNAP_BEFORE" "$SNAP_AFTER" "${TO_ADD[@]}"; then
    note "tenant: alleen de domeinenlijst is gewijzigd"
  else
    die "de tenant ziet er na de update anders uit dan gevraagd; DNS is niet aangeraakt"
  fi
fi

log ""
log "DNS aanmaken"
for d in "${TO_CREATE[@]}"; do
  batch="$(change_batch "migrate $d" CREATE "$d" "$TTL" "$ROUTING_ENDPOINT")"
  if aws_r53 change-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" --change-batch "$batch" >/dev/null 2>&1; then
    note "route53: CNAME aangemaakt voor $d"
    step "$d" "CNAME aangemaakt"
  else
    step "$d" "MISLUKT"
    die "record aanmaken mislukt voor $d"
  fi
done

log ""
log "Controle op de tenant"
for d in "${ARGS[@]}"; do
  ok=0
  for i in $(seq 1 30); do
    st="$(tenant_domain_status "$d")"
    case "$st" in
      "active"|"Pointed to CloudFront"|"pointed-to-cloudfront") step "$d" "$st"; ok=1; break ;;
    esac
    sleep 10
  done
  [ "$ok" -eq 1 ] || step "$d" "nog niet bevestigd, laatste status: ${st:-onbekend}"
done

summary
