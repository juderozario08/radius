#!/usr/bin/env bash
set -euo pipefail

LOCAL_URL="http://localhost:8080"
PROD_URL="https://radius-2563.onrender.com"

BASE_URL="${1:-${RADIUS_API_URL:-}}"
if [[ -z "$BASE_URL" ]]; then
    echo "Which environment do you want to check?"
    echo "  1) Local       ($LOCAL_URL)"
    echo "  2) Production  ($PROD_URL)"
    read -rp "Choice [1/2]: " choice
    case "$choice" in
        1) BASE_URL="$LOCAL_URL" ;;
        2) BASE_URL="$PROD_URL" ;;
        *) echo "Invalid choice: $choice" >&2; exit 1 ;;
    esac
    echo
fi
BASE_URL="${BASE_URL%/}"
case "$BASE_URL" in
    "$PROD_URL") TARGET="Production" ;;
    "$LOCAL_URL") TARGET="Local" ;;
    *) TARGET="Custom" ;;
esac
PACE_SECONDS=0.3

for tool in curl python3; do
    command -v "$tool" >/dev/null 2>&1 || { echo "Missing required tool: $tool" >&2; exit 1; }
done

WORK_DIR="$(mktemp -d)"
RESULTS="$WORK_DIR/results.tsv"
BODY="$WORK_DIR/body.json"
TOKEN=""
cleanup() {
    if [[ -n "$TOKEN" ]]; then
        curl -sS -m 15 -o /dev/null -X POST -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/logout" 2>/dev/null || true
    fi
    rm -rf "$WORK_DIR"
}
trap cleanup EXIT
: > "$RESULTS"

json() {
    python3 - "$BODY" "$1" <<'PY'
import json, sys
try:
    data = json.load(open(sys.argv[1]))
except Exception:
    sys.exit(0)
key = sys.argv[2]

def find(node):
    if isinstance(node, dict):
        if key in node and not isinstance(node[key], (dict, list)):
            return node[key]
        for value in node.values():
            found = find(value)
            if found is not None:
                return found
    elif isinstance(node, list):
        for value in node:
            found = find(value)
            if found is not None:
                return found
    return None

value = find(data)
if value is not None:
    print(value)
PY
}

request() {
    local label="$1" method="$2" path="$3" data="${4:-}"
    local args=(-sS -m 90 -o "$BODY" -w "%{http_code} %{time_total}" -X "$method")
    [[ -n "$TOKEN" ]] && args+=(-H "Authorization: Bearer $TOKEN")
    [[ -n "$data" ]] && args+=(-H "Content-Type: application/json" --data-binary @-)
    local out
    if [[ -n "$data" ]]; then
        out="$(printf '%s' "$data" | curl "${args[@]}" "$BASE_URL$path" 2>/dev/null)" || out="000 0"
    else
        out="$(curl "${args[@]}" "$BASE_URL$path" 2>/dev/null)" || out="000 0"
    fi
    local code="${out%% *}" seconds="${out##* }"
    local ms
    ms="$(python3 -c "print(round(float('$seconds') * 1000))")"
    local note=""
    if [[ "$code" -ge 400 || "$code" == "000" ]]; then
        note="$(json error)"
    fi
    printf '%s\t%s\t%s\t%s\t%s\n' "$label" "$code" "$ms" "$path" "$note" >> "$RESULTS"
    local mark="✔"
    if [[ "$code" == "000" || "$code" -ge 500 || "$code" == "401" ]]; then mark="✖"
    elif [[ "$code" -ge 400 ]]; then mark="!"
    fi
    printf '  %s %-34s %3s %6sms  %s\n' "$mark" "$label" "$code" "$ms" "${note:0:70}"
    sleep "$PACE_SECONDS"
}

detail() {
    local label="$1" list_path="$2" id_key="$3" detail_prefix="$4" detail_suffix="${5:-}"
    request "$label (list)" GET "$list_path"
    local id
    id="$(json "$id_key")"
    if [[ -n "$id" ]]; then
        request "$label (#$id)" GET "$detail_prefix$id$detail_suffix"
    else
        printf '  - %-34s skipped (list was empty)\n' "$label detail"
    fi
}

echo "Radius $TARGET check → $BASE_URL"
echo
read -rp "Email: " EMAIL
read -rsp "Password: " PASSWORD
echo
[[ -n "$EMAIL" && -n "$PASSWORD" ]] || { echo "Email and password are required." >&2; exit 1; }

echo
if [[ "$TARGET" == "Production" ]]; then
    echo "Waking the service (the free Render plan can take up to a minute after idling)..."
else
    echo "Checking the service..."
fi
request "Health" GET /health
WAKE_MS="$(tail -1 "$RESULTS" | cut -f3)"
request "Readiness (DB + Redis)" GET /ready

LOGIN_BODY="$(EMAIL="$EMAIL" PASSWORD="$PASSWORD" python3 -c 'import json, os; print(json.dumps({"email": os.environ["EMAIL"], "password": os.environ["PASSWORD"]}))')"
request "Login" POST /login "$LOGIN_BODY"
if [[ "$(json requires_confirmation)" == "True" ]]; then
    echo
    read -rp "This account is signed in on another device. Sign that session out and continue? [y/N] " answer
    [[ "$answer" =~ ^[Yy]$ ]] || { echo "Stopped without signing anything out."; exit 1; }
    LOGIN_BODY="$(EMAIL="$EMAIL" PASSWORD="$PASSWORD" python3 -c 'import json, os; print(json.dumps({"email": os.environ["EMAIL"], "password": os.environ["PASSWORD"], "force": True}))')"
    request "Login (take over session)" POST /login "$LOGIN_BODY"
fi
unset PASSWORD LOGIN_BODY
TOKEN="$(json token)"
ROLE="$(json role)"
STORE_ID="$(json store_id)"
if [[ -z "$TOKEN" ]]; then
    echo "Login failed: $(json error)" >&2
    exit 1
fi
echo "  Signed in as $ROLE at store #$STORE_ID"

echo
echo "Auth"
request "Verify token" POST /api/verify_token
request "WebSocket ticket" POST /api/v1/ws/ticket

echo
echo "Catalog & inventory"
request "Product #1" GET /api/sales_floor/products/1
BARCODE="$(json upc)"
request "Search 'cable'" GET "/api/sales_floor/products/search?q=cable"
request "Categories" GET /api/sales_floor/products/categories
request "Brands" GET /api/sales_floor/products/brands
if [[ -n "$BARCODE" ]]; then
    request "Audit trail" GET "/api/sales_floor/products/audit?barcode=$BARCODE"
    for attempt in 1 2 3 4 5; do
        request "Barcode scan $attempt/5" GET "/api/sales_floor/inventory/product?barcode=$BARCODE"
    done
fi
request "Product screen #1" GET /api/sales_floor/inventory/products/1
request "Pending adjustments" GET /api/sales_floor/inventory/adjustments
request "IS4TC session" GET /api/sales_floor/is4tc/session
request "Fill report" GET /api/sales_floor/fill_reports

echo
echo "Orders & sales"
detail "Transactions" /api/sales_floor/transactions transaction_id /api/sales_floor/transactions/
TX_ID="$(json transaction_id)"
detail "Online orders" /api/sales_floor/orders/online order_id /api/sales_floor/orders/online/
detail "Print orders" /api/sales_floor/orders/print print_order_id /api/sales_floor/orders/print/
detail "Returns" /api/sales_floor/returns return_id /api/sales_floor/returns/
if [[ -n "$TX_ID" ]]; then
    request "Return lookup (sale #$TX_ID)" GET "/api/sales_floor/returns/lookup/$TX_ID"
fi
request "RTV queue" GET /api/sales_floor/returns/rtv

echo
echo "Receiving & transfers"
detail "Purchase orders" /api/sales_floor/receiving/purchase_orders po_id /api/sales_floor/receiving/purchase_orders/
detail "Inbound transfers" /api/sales_floor/receiving/transfers transfer_id /api/sales_floor/receiving/transfers/
detail "Outbound transfers" /api/sales_floor/transfers transfer_id /api/sales_floor/transfers/
request "Transfer destinations" GET /api/sales_floor/transfers/stores

echo
echo "Cycle counts"
detail "Cycle counts" /api/sales_floor/cycle_counts count_id /api/sales_floor/cycle_counts/ /items
request "Count schedule" GET /api/sales_floor/cycle_counts/schedule

if [[ "$ROLE" == "MANAGER" || "$ROLE" == "ADMIN" ]]; then
    echo
    echo "Manager"
    request "My store" GET "/api/manager/store/$STORE_ID"
    request "Store employees" GET /api/manager/employees
fi

if [[ "$ROLE" == "ADMIN" ]]; then
    echo
    echo "Admin"
    request "All employees" GET /api/admin/employees
    request "Active sessions" GET /api/admin/sessions
    request "Stores" GET /api/admin/stores
    request "Store operations" GET /api/admin/stores/operations
    request "Server metrics" GET /api/admin/metrics
    cp "$BODY" "$WORK_DIR/metrics.json"
fi

echo
python3 - "$RESULTS" "$WAKE_MS" "$WORK_DIR/metrics.json" "$TARGET" <<'PY'
import json, os, statistics, sys

rows = [line.rstrip("\n").split("\t") for line in open(sys.argv[1]) if line.strip()]
wake_ms = int(sys.argv[2] or 0)
codes = [r[1] for r in rows]
ok = sum(1 for c in codes if c.startswith("2"))
warn = sum(1 for r in rows if r[1].startswith("4") and r[1] != "401" and not (r[0] == "Login" and r[1] == "409"))
fail = sum(1 for c in codes if c == "000" or c.startswith("5") or c == "401")
timed = [int(r[2]) for r in rows if r[1].startswith("2") and r[0] != "Health"]
scans = [int(r[2]) for r in rows if r[0].startswith("Barcode scan") and r[1].startswith("2")]

print("Summary")
print(f"  Requests:   {len(rows)}  ({ok} ok, {warn} client errors, {fail} failures)")
print(f"  Wake-up:    {wake_ms} ms for the first request" + ("  (service was asleep)" if wake_ms > 5000 else ""))
if timed:
    ordered = sorted(timed)
    p95 = ordered[min(len(ordered) - 1, int(round(0.95 * (len(ordered) - 1))))]
    print(f"  Latency:    median {statistics.median(ordered):.0f} ms · p95 {p95} ms · max {ordered[-1]} ms  (network round trip included)")
    slowest = sorted((int(r[2]), r[0]) for r in rows if r[1].startswith("2") and r[0] != "Health")[-3:]
    print("  Slowest:    " + ", ".join(f"{label} {ms} ms" for ms, label in reversed(slowest)))
if len(scans) >= 2:
    print(f"  Scan cache: first {scans[0]} ms → repeat median {statistics.median(scans[1:]):.0f} ms")

metrics_path = sys.argv[3]
if os.path.exists(metrics_path):
    try:
        metrics = json.load(open(metrics_path))
        pool = metrics.get("database_pool", {})
        redis = metrics.get("redis", {})
        counters = redis.get("metrics", {})
        print(f"  DB pool:    {pool.get('open_connections')} open / {pool.get('max_open_connections')} max · {pool.get('in_use')} in use · waits {pool.get('wait_count')}")
        hit = redis.get("hit_ratio")
        hit_text = f"{hit * 100:.1f}% hit ratio" if isinstance(hit, (int, float)) else "hit ratio n/a"
        print(f"  Redis:      {redis.get('message', 'unknown')} · {hit_text} · avg {redis.get('avg_command_latency_ms', 0):.2f} ms/command · errors {counters.get('set_errors', 0) + counters.get('delete_errors', 0)}")
    except Exception:
        pass

problems = [r for r in rows if (r[1] == "000" or r[1][0] in "45") and not (r[0] == "Login" and r[1] == "409")]
if problems:
    print()
    print("Needs a look")
    for label, code, ms, path, note in (r + [""] * (5 - len(r)) for r in problems):
        print(f"  {code}  {label}  {path}  {note}")
print()
target = sys.argv[4]
print("Verdict:    " + (f"✔ {target} looks healthy" if fail == 0 else f"✖ {target} has failures, see above"))
sys.exit(1 if fail else 0)
PY
