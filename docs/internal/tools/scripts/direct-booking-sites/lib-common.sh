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
APPLY_RESULT=""
INCOMPLETE=()

aws_cf() { aws cloudfront "$@" --profile "$PROFILE" --region "$REGION_CF"; return $?; }
aws_r53() { aws route53 "$@" --profile "$PROFILE"; return $?; }

log()  { printf '%s\n' "$*"; return $?; }
step() { printf '  %-58s %s\n' "$1" "$2"; return $?; }
note() { LEDGER+=("$1"); return $?; }
incomplete() { INCOMPLETE+=("$1"); return $?; }

die() {
  log ""
  log "STOPPED: $1"
  summary
  report_incomplete
  exit 1
}

finish() {
  summary
  report_incomplete
  if [[ ${#INCOMPLETE[@]} -gt 0 ]]; then
    log ""
    log "The run is incomplete; exit code 1."
    exit 1
  fi
  exit 0
}

report_incomplete() {
  [[ ${#INCOMPLETE[@]} -gt 0 ]] || return 0
  log ""
  log "Not confirmed:"
  for l in "${INCOMPLETE[@]}"; do log "  $l"; done
  return 0
}

summary() {
  log ""
  log "What was done:"
  if [[ ${#LEDGER[@]} -eq 0 ]]; then
    log "  nothing changed"
  else
    for l in "${LEDGER[@]}"; do log "  $l"; done
  fi
  return $?
}

validate_domain() {
  local d="$1"
  [[ -n "$d" ]] || { echo "empty domain"; return 1; }
  case "$d" in
    "direct.domits.com")    echo "protected: the apex";             return 1 ;;
    "*.direct.domits.com")  echo "protected: the wildcard";         return 1 ;;
    \*.*)                   echo "protected: never a wildcard";     return 1 ;;
    _*)                     echo "validation record, never touch";  return 1 ;;
    *[!a-z0-9.-]*)          echo "invalid characters";              return 1 ;;
    *"$SUFFIX")             : ;;
    *)                      echo "does not end in $SUFFIX";         return 1 ;;
  esac
  [[ "$d" != "${SUFFIX#.}" ]] || { echo "protected: the apex"; return 1; }
  [[ -f "$ALLOWLIST" ]] || { echo "allowlist missing: $ALLOWLIST"; return 1; }
  grep -qxF "$d" "$ALLOWLIST" || { echo "not in published-domains.txt"; return 1; }
  return 0
}

tenant_json() { aws_cf get-distribution-tenant --identifier "$TENANT_ID" --output json; return $?; }

tenant_domains() { tenant_json | node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  JSON.parse(s).DistributionTenant.Domains.forEach(d=>console.log(d.Domain));});'; return $?; }

tenant_status() { tenant_json | node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  console.log(JSON.parse(s).DistributionTenant.Status);});'; return $?; }

tenant_domain_status() { tenant_json | node -e '
let s="";const want=process.argv[1];process.stdin.on("data",d=>s+=d).on("end",()=>{
  const m=JSON.parse(s).DistributionTenant.Domains.find(d=>d.Domain===want);
  console.log(m?m.Status:"ABSENT");});' "$1"; return $?; }

check_limit() {
  [[ "$MAX_TENANT_DOMAINS" =~ ^[1-9][0-9]*$ ]] && return 0
  echo "MAX_TENANT_DOMAINS must be a positive integer, got '$MAX_TENANT_DOMAINS'"
  return 1
}

unique_args() {
  local a u dup
  local -a out=()
  for a in "$@"; do
    dup=0
    if [[ ${#out[@]} -gt 0 ]]; then
      for u in "${out[@]}"; do [[ "$u" = "$a" ]] && dup=1; done
    fi
    [[ "$dup" -eq 0 ]] && out+=("$a")
  done
  ARGS=()
  if [[ ${#out[@]} -gt 0 ]]; then ARGS=("${out[@]}"); fi
  return 0
}

apply_tenant_domains() {
  local mode="$1" snap="$2"
  shift 2
  local -a given=("$@")
  APPLY_RESULT="refused"
  [[ "$mode" = "add" || "$mode" = "remove" ]] || { echo "apply_tenant_domains: mode must be add or remove" >&2; return 1; }
  [[ -n "$snap" ]] || { echo "apply_tenant_domains: no snapshot path" >&2; return 1; }
  [[ ${#given[@]} -gt 0 ]] || { echo "apply_tenant_domains: no domains given" >&2; return 1; }
  local attempt
  for attempt in 1 2 3; do
    local raw etag
    raw="$(tenant_json)" || return 1
    printf '%s\n' "$raw" > "$snap" || return 1
    etag="$(printf '%s' "$raw" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).ETag||""));')" || return 1
    [[ -n "$etag" ]] || { echo "the tenant read has no ETag" >&2; return 1; }

    local built change domains
    built="$(printf '%s' "$raw" | node -e '
let s="";const [mode,max,...given]=process.argv.slice(1);process.stdin.on("data",d=>s+=d).on("end",()=>{
  const fresh=[...new Set((JSON.parse(s).DistributionTenant.Domains||[]).map(d=>d.Domain))];
  const list=mode==="add"?[...new Set([...fresh,...given])]:fresh.filter(d=>!given.includes(d));
  if(mode==="add"&&list.length>Number(max)){console.error(`the tenant would have ${list.length} domains, over the limit of ${max}`);process.exit(3);}
  if(!list.length){console.error("this would empty the tenant; refusing");process.exit(4);}
  const same=list.length===fresh.length&&list.every(d=>fresh.includes(d));
  console.log(same?"unchanged":"changed");
  console.log(JSON.stringify(list.map(Domain=>({Domain}))));});' "$mode" "$MAX_TENANT_DOMAINS" "${given[@]}")" || return 1
    change="${built%%$'\n'*}"
    domains="${built#*$'\n'}"
    if [[ "$change" = "unchanged" ]]; then
      step "tenant list" "already as asked, no update sent"
      APPLY_RESULT="unchanged"
      return 0
    fi

    local distid cgid cust params enabled
    distid="$(printf '%s' "$raw"  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).DistributionTenant.DistributionId||""));')"
    cgid="$(printf '%s' "$raw"    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).DistributionTenant.ConnectionGroupId||""));')"
    cust="$(printf '%s' "$raw"    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.stringify(JSON.parse(s).DistributionTenant.Customizations||{})));')"
    params="$(printf '%s' "$raw"  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const p=JSON.parse(s).DistributionTenant.Parameters;console.log(p?JSON.stringify(p):"");});')"
    enabled="$(printf '%s' "$raw" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).DistributionTenant.Enabled?"yes":"no"));')"

    local -a args=(update-distribution-tenant --id "$TENANT_ID" --if-match "$etag" --domains "$domains")
    [[ -n "$distid" ]] && args+=(--distribution-id "$distid")
    [[ -n "$cgid" ]]   && args+=(--connection-group-id "$cgid")
    args+=(--customizations "$cust")
    [[ -n "$params" ]] && args+=(--parameters "$params")
    if [[ "$enabled" = "yes" ]]; then args+=(--enabled); else args+=(--no-enabled); fi

    local err
    if err="$(aws_cf "${args[@]}" 2>&1 >/dev/null)"; then
      APPLY_RESULT="updated"
      return 0
    fi
    if printf '%s' "$err" | grep -q "PreconditionFailed"; then
      if [[ "$attempt" -lt 3 ]]; then
        step "ETag stale, re-reading" "attempt $(( attempt + 1 ))"
        APPLY_RESULT="stale"
        continue
      fi
      APPLY_RESULT="stale"
    else
      APPLY_RESULT="failed"
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
    if [[ "$st" = "Deployed" ]]; then step "tenant status" "Deployed"; return 0; fi
    sleep 10
  done
  return 2
}

record_value() {
  aws_r53 list-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" \
    --start-record-name "$1" --start-record-type CNAME --max-items 1 --output json \
  | node -e 'let s="";const want=process.argv[1]+".";process.stdin.on("data",d=>s+=d).on("end",()=>{
      const r=(JSON.parse(s).ResourceRecordSets||[])[0];
      if(r&&r.Name===want&&r.Type==="CNAME") console.log(r.ResourceRecords[0].Value);});' "$1"
  return $?
}

r53_change() {
  local err
  if err="$(aws_r53 change-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" --change-batch "$1" 2>&1 >/dev/null)"; then
    return 0
  fi
  printf '%s\n' "$err" >&2
  return 1
}

change_batch() {
  printf '{"Comment":"%s","Changes":[{"Action":"%s","ResourceRecordSet":{"Name":"%s","Type":"CNAME","TTL":%s,"ResourceRecords":[{"Value":"%s"}]}}]}' \
    "$1" "$2" "$3" "$4" "$5"
  return $?
}
