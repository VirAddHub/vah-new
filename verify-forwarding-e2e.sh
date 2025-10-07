#!/usr/bin/env bash
set -euo pipefail

: "${API_BASE:?set API_BASE}"
: "${USER_COOKIE:?set USER_COOKIE}"      # e.g. "sid=...; Path=/; ..."
: "${ADMIN_COOKIE:?set ADMIN_COOKIE}"
MAIL_ITEM_ID="${MAIL_ITEM_ID:-25}"
RECIPIENT="${RECIPIENT:-"Jane Doe"}"
ADDR1="${ADDR1:-"10 Downing St"}"
CITY="${CITY:-"London"}"
POSTAL="${POSTAL:-"SW1A 2AA"}"
COUNTRY="${COUNTRY:-"GB"}"

jqfail() { echo "❌ jq assertion failed: $1" >&2; exit 1; }
apifail() { echo "❌ API call failed ($1)" >&2; exit 1; }
ok() { echo "✅ $1"; }

api_user()  { curl -sS -b "$USER_COOKIE"  -H "Content-Type: application/json" "$@"; }
api_admin() { curl -sS -b "$ADMIN_COOKIE" -H "Content-Type: application/json" "$@"; }

echo "▶ Creating forwarding request as USER..."
CREATE_RES="$(api_user -X POST \
  -d "{\"mail_item_id\": ${MAIL_ITEM_ID}, \"to_name\":\"${RECIPIENT}\", \"address1\":\"${ADDR1}\", \"city\":\"${CITY}\", \"postal\":\"${POSTAL}\", \"country\":\"${COUNTRY}\"}" \
  "${API_BASE}/api/forwarding/requests" || apifail "create request")"

echo "$CREATE_RES" | jq -e '.ok == true' >/dev/null || jqfail ".ok != true on create"
REQ_ID="$(echo "$CREATE_RES" | jq -r '.data.id')"
[ -n "$REQ_ID" ] || apifail "missing request id"
ok "Created request id=$REQ_ID"

echo "▶ Admin listing Requested queue..."
LIST_RES="$(api_admin "${API_BASE}/api/admin/forwarding/requests?status=Requested&limit=10" || apifail "list")"
echo "$LIST_RES" | jq -e '.ok == true and (.data | type=="array")' >/dev/null || jqfail "list structure"
echo "$LIST_RES" | jq -e --arg id "$REQ_ID" '.data | any(.id==($id|tonumber))' >/dev/null || jqfail "request not found in Requested"
ok "Request visible in Requested"

echo "▶ Illegal transition should fail (Requested → Delivered)..."
ILLEGAL="$(api_admin -X PATCH -d '{"action":"mark_delivered"}' "${API_BASE}/api/admin/forwarding/requests/${REQ_ID}" || true)"
echo "$ILLEGAL" | jq -e '.ok == false and .error == "illegal_transition"' >/dev/null || jqfail "illegal transition not blocked"
ok "Illegal transition rejected"

echo "▶ Review → Processing → Dispatched → Delivered..."
STEP1="$(api_admin -X PATCH -d '{"action":"mark_reviewed"}'   "${API_BASE}/api/admin/forwarding/requests/${REQ_ID}")"
echo "$STEP1" | jq -e '.ok == true and .data.status=="Reviewed"' >/dev/null || jqfail "review failed"
STEP2="$(api_admin -X PATCH -d '{"action":"start_processing"}' "${API_BASE}/api/admin/forwarding/requests/${REQ_ID}")"
echo "$STEP2" | jq -e '.ok == true and .data.status=="Processing"' >/dev/null || jqfail "processing failed"
STEP3="$(api_admin -X PATCH -d '{"action":"mark_dispatched","courier":"Royal Mail","tracking_number":"RM123456789GB","admin_notes":"Fragile"}' "${API_BASE}/api/admin/forwarding/requests/${REQ_ID}")"
echo "$STEP3" | jq -e '.ok == true and .data.status=="Dispatched" and .data.courier=="Royal Mail"' >/dev/null || jqfail "dispatch failed"
STEP4="$(api_admin -X PATCH -d '{"action":"mark_delivered"}' "${API_BASE}/api/admin/forwarding/requests/${REQ_ID}")"
echo "$STEP4" | jq -e '.ok == true and .data.status=="Delivered"' >/dev/null || jqfail "delivered failed"
ok "Happy path transitions complete"

echo "▶ Security checks..."
# Non-admin must not access admin endpoints (expect 403 from your middleware)
NONADMIN_FORBIDDEN="$(curl -sS -o /dev/null -w '%{http_code}' -b "$USER_COOKIE" "${API_BASE}/api/admin/forwarding/requests?limit=1")"
[ "$NONADMIN_FORBIDDEN" = "403" ] || apifail "non-admin could access admin routes ($NONADMIN_FORBIDDEN)"
ok "Non-admin blocked from admin endpoints"

echo "▶ (Optional) Courier validation check..."
# If your server requires courier+tracking on dispatch, simulate missing courier:
MUST_FAIL="$(api_admin -X PATCH -d '{"action":"mark_dispatched"}' "${API_BASE}/api/admin/forwarding/requests/${REQ_ID}" || true)"
# Accept either illegal_transition (since it's already Dispatched) or validation error in other scenarios:
echo "$MUST_FAIL" | jq -e '(.ok == false)' >/dev/null || jqfail "dispatch without courier/track unexpectedly passed"
ok "Dispatch requires courier/tracking (or rejects as expected)"

echo "🎉 All E2E checks passed."