#!/usr/bin/env bash
# Full rehearsal of the Render migration on local copies. Prints PASS/FAIL per scenario.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; PP="$HERE/.."
B="${PGBASE:-postgres://postgres@127.0.0.1:5433}"
export PGOPTIONS='-c vah.rehearsal=on'
# RUNNER=node uses run-sql.cjs (for hosts without psql, such as a Render Shell) instead of psql.
run() {
  if [ "${RUNNER:-psql}" = node ]; then DATABASE_URL="$B/$1" VAH_REHEARSAL=on node "$PP/run-sql.cjs" "$PP/$2" >"/tmp/rehearse-$3.log" 2>&1; echo $?;
  else psql -X "$B/$1" -f "$PP/$2" >"/tmp/rehearse-$3.log" 2>&1; echo $?; fi
}
fp() { psql -X -At "$B/$1" -c "SELECT md5(string_agg(t||'='||h, ' ' ORDER BY t)) FROM (SELECT table_name t, md5(string_agg(column_name||data_type||is_nullable||coalesce(column_default,''), ',' ORDER BY column_name)) h FROM information_schema.columns WHERE table_schema='public' GROUP BY table_name) x" ; }
idx() { psql -X -At "$B/$1" -c "SELECT md5(string_agg(indexdef, ';' ORDER BY indexdef)) || md5(coalesce((SELECT string_agg(conname||pg_get_constraintdef(oid), ';' ORDER BY conname) FROM pg_constraint WHERE connamespace = 'public'::regnamespace), '')) FROM pg_indexes WHERE schemaname='public'"; }
rows() { psql -X -At "$B/$1" -c "SELECT (SELECT count(*) FROM business)||'/'||(SELECT count(*) FROM migrations)"; }
check() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1 (got $2, expected $3)"; fi; }

"$HERE/build_render_copy.sh" vah_local_rc_a >/dev/null
check "1 pre-check passes on a Render-shaped copy"             "$(run vah_local_rc_a 2026-11-18_phase1_render_precheck.sql pre)" 0
check "2 migration commits"                                    "$(run vah_local_rc_a 2026-11-18_phase1_render.sql mig)" 0
grep -q 'MIGRATION COMMITTED' /tmp/rehearse-mig.log; check "2b success line printed" "$?" 0
check "3 verify passes"                                        "$(run vah_local_rc_a 2026-11-18_phase1_render_verify.sql ver)" 0
S1="$(fp vah_local_rc_a)$(idx vah_local_rc_a)$(rows vah_local_rc_a)"
check "4 second run of the migration is refused"               "$(run vah_local_rc_a 2026-11-18_phase1_render.sql mig2)" 3
check "4b ...and changed nothing"                              "$(fp vah_local_rc_a)$(idx vah_local_rc_a)$(rows vah_local_rc_a)" "$S1"
grep -q 'MIGRATION COMMITTED' /tmp/rehearse-mig2.log; check "4c ...and printed no success line" "$?" 1
check "5 rollback check runs read-only"                        "$(run vah_local_rc_a 2026-11-18_phase1_render_rollback_check.sql rbc)" 0

# Unexpected difference: an extra column somewhere.
"$HERE/build_render_copy.sh" vah_local_rc_b >/dev/null
psql -X -q "$B/vah_local_rc_b" -c 'ALTER TABLE "user" ADD COLUMN surprise text'
S2="$(fp vah_local_rc_b)$(idx vah_local_rc_b)$(rows vah_local_rc_b)"
check "6 pre-check stops on an unexpected column"              "$(run vah_local_rc_b 2026-11-18_phase1_render_precheck.sql pre-b)" 3
check "6b migration also stops (psql: even without -v ON_ERROR_STOP)" "$(run vah_local_rc_b 2026-11-18_phase1_render.sql mig-b)" 3
check "6c ...and changed nothing"                              "$(fp vah_local_rc_b)$(idx vah_local_rc_b)$(rows vah_local_rc_b)" "$S2"

# Failure in the middle of the change: another session holds a lock on notification.
"$HERE/build_render_copy.sh" vah_local_rc_c >/dev/null
S3="$(fp vah_local_rc_c)$(idx vah_local_rc_c)$(rows vah_local_rc_c)"
( psql -X -q "$B/vah_local_rc_c" -c "BEGIN; LOCK TABLE notification IN ACCESS EXCLUSIVE MODE; SELECT pg_sleep(20); COMMIT;" >/dev/null 2>&1 & )
sleep 2
check "7 migration stops when a lock cannot be taken (mid-change)" "$(run vah_local_rc_c 2026-11-18_phase1_render.sql mig-c)" 3
grep -q 'lock timeout' /tmp/rehearse-mig-c.log; check "7b ...error was the lock timeout" "$?" 0
sleep 19
check "7c ...and nothing from the earlier steps was kept"      "$(fp vah_local_rc_c)$(idx vah_local_rc_c)$(rows vah_local_rc_c)" "$S3"
grep -q 'MIGRATION COMMITTED' /tmp/rehearse-mig-c.log; check "7d ...and no success line" "$?" 1

# Verify notices a missing uniqueness rule.
psql -X -q "$B/vah_local_rc_a" -c "DROP INDEX idx_invoices_seq_year"
check "8 verify fails when a unique index is missing"          "$(run vah_local_rc_a 2026-11-18_phase1_render_verify.sql ver-bad)" 3
grep -q 'idx_invoices_seq_year: MISSING' /tmp/rehearse-ver-bad.log; check "8b ...and names it" "$?" 0

# Unexpected index (also exercises the checks whose messages are plain text).
"$HERE/build_render_copy.sh" vah_local_rc_d >/dev/null
psql -X -q "$B/vah_local_rc_d" -c "CREATE UNIQUE INDEX surprise_seq_idx ON invoices_seq (year, id)"
S4="$(fp vah_local_rc_d)$(idx vah_local_rc_d)$(rows vah_local_rc_d)"
check "9 migration stops on an unexpected index"               "$(run vah_local_rc_d 2026-11-18_phase1_render.sql mig-d)" 3
grep -q 'invoices_seq already has a unique index' /tmp/rehearse-mig-d.log; check "9b ...names it" "$?" 0
grep -q 'index definitions differ' /tmp/rehearse-mig-d.log; check "9c ...and reports the index fingerprint" "$?" 0
check "9d ...and changed nothing"                              "$(fp vah_local_rc_d)$(idx vah_local_rc_d)$(rows vah_local_rc_d)" "$S4"
