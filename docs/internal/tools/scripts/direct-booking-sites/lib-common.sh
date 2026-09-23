set -o pipefail

PROFILE="${PROFILE:-domits}"
REGION_CF="us-east-1"
TENANT_ID="dt_3JidivSSrpsHkv7QdwDnx0FxwTu"
DISTRIBUTION_ID="E18TUBOKUXD9TW"
HOSTED_ZONE_ID="Z05841473F67D0RNUMZZ9"
ROUTING_ENDPOINT="d3lo4q6asaa174.cloudfront.net"
AMPLIFY_ENDPOINT="d1q86xmwckzc37.cloudfront.net"
SUFFIX=".direct.domits.com"
ALLOWLIST="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/published-domains.txt"
MAX_TENANT_DOMAINS="${MAX_TENANT_DOMAINS:-100}"
TTL=60

DRY_RUN=0
LEDGER=()

aws_cf() { aws cloudfront "$@" --profile "$PROFILE" --region "$REGION_CF"; }
aws_r53() { aws route53 "$@" --profile "$PROFILE"; }

log()  { printf '%s\n' "$*"; }
step() { printf '  %-58s %s\n' "$1" "$2"; }
note() { LEDGER+=("$1"); }

die() {
  log ""
  log "GESTOPT: $1"
  summary
  exit 1
}

summary() {
  log ""
  log "Wat er is gedaan:"
  if [ ${#LEDGER[@]} -eq 0 ]; then
    log "  niets gewijzigd"
  else
    for l in "${LEDGER[@]}"; do log "  $l"; done
  fi
}

validate_domain() {
  local d="$1"
  [ -n "$d" ] || { echo "leeg domein"; return 1; }
  case "$d" in
    "direct.domits.com")    echo "beschermd: de apex";                return 1 ;;
    "*.direct.domits.com")  echo "beschermd: de wildcard";            return 1 ;;
    \*.*)                   echo "beschermd: wildcards nooit";        return 1 ;;
    _*)                     echo "validatierecord, nooit aanraken";   return 1 ;;
    *[!a-z0-9.-]*)          echo "ongeldige tekens";                  return 1 ;;
    *"$SUFFIX")             : ;;
    *)                      echo "eindigt niet op $SUFFIX";           return 1 ;;
  esac
  [ "$d" != "${SUFFIX#.}" ] || { echo "beschermd: de apex"; return 1; }
  [ -f "$ALLOWLIST" ] || { echo "allowlist ontbreekt: $ALLOWLIST"; return 1; }
  grep -qxF "$d" "$ALLOWLIST" || { echo "staat niet in published-domains.txt"; return 1; }
  return 0
}

tenant_json() { aws_cf get-distribution-tenant --identifier "$TENANT_ID" --output json; }

tenant_domains() { tenant_json | node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  JSON.parse(s).DistributionTenant.Domains.forEach(d=>console.log(d.Domain));});'; }

tenant_status() { tenant_json | node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  console.log(JSON.parse(s).DistributionTenant.Status);});'; }

tenant_domain_status() { tenant_json | node -e '
let s="";const want=process.argv[1];process.stdin.on("data",d=>s+=d).on("end",()=>{
  const m=JSON.parse(s).DistributionTenant.Domains.find(d=>d.Domain===want);
  console.log(m?m.Status:"AFWEZIG");});' "$1"; }

apply_tenant_domains() {
  local -a want=("$@")
  local attempt
  for attempt in 1 2; do
    local raw etag
    raw="$(tenant_json)" || return 1
    etag="$(printf '%s' "$raw" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).ETag));')"

    local distid cgid cust params enabled
    distid="$(printf '%s' "$raw"  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).DistributionTenant.DistributionId||""));')"
    cgid="$(printf '%s' "$raw"    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).DistributionTenant.ConnectionGroupId||""));')"
    cust="$(printf '%s' "$raw"    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.stringify(JSON.parse(s).DistributionTenant.Customizations||{})));')"
    params="$(printf '%s' "$raw"  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const p=JSON.parse(s).DistributionTenant.Parameters;console.log(p?JSON.stringify(p):"");});')"
    enabled="$(printf '%s' "$raw" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).DistributionTenant.Enabled?"yes":"no"));')"

    local domains
    domains="$(node -e 'console.log(JSON.stringify(process.argv.slice(1).map(Domain=>({Domain}))));' "${want[@]}")"

    local -a args=(update-distribution-tenant --id "$TENANT_ID" --if-match "$etag" --domains "$domains")
    [ -n "$distid" ] && args+=(--distribution-id "$distid")
    [ -n "$cgid" ]   && args+=(--connection-group-id "$cgid")
    args+=(--customizations "$cust")
    [ -n "$params" ] && args+=(--parameters "$params")
    if [ "$enabled" = "yes" ]; then args+=(--enabled); else args+=(--no-enabled); fi

    local err
    if err="$(aws_cf "${args[@]}" 2>&1 >/dev/null)"; then
      return 0
    fi
    if printf '%s' "$err" | grep -q "PreconditionFailed" && [ "$attempt" -eq 1 ]; then
      step "ETag verlopen, opnieuw lezen" "poging 2"
      continue
    fi
    printf '%s\n' "$err" >&2
    return 1
  done
  return 1
}

wait_deployed() {
  local i st
  for i in $(seq 1 60); do
    st="$(tenant_status)" || return 1
    if [ "$st" = "Deployed" ]; then step "tenant status" "Deployed"; return 0; fi
    sleep 10
  done
  return 1
}

record_value() {
  aws_r53 list-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" \
    --start-record-name "$1" --start-record-type CNAME --max-items 1 --output json \
  | node -e 'let s="";const want=process.argv[1]+".";process.stdin.on("data",d=>s+=d).on("end",()=>{
      const r=(JSON.parse(s).ResourceRecordSets||[])[0];
      if(r&&r.Name===want&&r.Type==="CNAME") console.log(r.ResourceRecords[0].Value);});' "$1"
}

change_batch() {
  printf '{"Comment":"%s","Changes":[{"Action":"%s","ResourceRecordSet":{"Name":"%s","Type":"CNAME","TTL":%s,"ResourceRecords":[{"Value":"%s"}]}}]}' \
    "$1" "$2" "$3" "$4" "$5"
}
