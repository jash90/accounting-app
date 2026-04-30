#!/bin/bash
# Runs every Maestro web smoke flow in its own browser session.
#
# Why a wrapper instead of `maestro test maestro/`?
#   Maestro Web 2.3.0 retains browser state between flows in a single suite run.
#   When each flow calls `launchApp` against /login, the second invocation
#   sometimes fails with "Unable to launch app" because the previous browser
#   isn't fully released. Running each flow as a fresh process avoids that.
#
# Usage:
#   ./maestro/run-all.sh                                  # runs against prod (default)
#   BASE_URL=https://other-env.vercel.app ./maestro/run-all.sh
#
# Exit code is the count of failed flows (0 = all passed).

set -u

cd "$(dirname "$0")/.."

FLOWS=(
  # auth — happy paths
  maestro/auth/login.yaml
  maestro/auth/login-employee.yaml
  maestro/auth/login-admin.yaml
  # auth — form edge cases
  maestro/auth/login-invalid.yaml
  maestro/auth/login-empty.yaml
  # auth — RBAC denied access (per-role × forbidden routes)
  maestro/auth/employee-rbac-denied.yaml
  maestro/auth/employee-cannot-access-admin.yaml
  maestro/auth/employee-cannot-access-company.yaml
  maestro/auth/owner-cannot-access-admin.yaml
  maestro/auth/admin-cannot-access-company-modules.yaml
  maestro/auth/unauthenticated-redirects.yaml
  # company (owner-only pages)
  maestro/company/profile-nip.yaml
  maestro/company/employees-list.yaml
  # modules (per-feature smoke)
  maestro/modules/clients-list.yaml
  maestro/modules/clients-search-no-results.yaml
  maestro/modules/tasks-kanban.yaml
  maestro/modules/time-tracking-entries.yaml
)

failed=0
passed=0

for flow in "${FLOWS[@]}"; do
  echo "──── ${flow} ────"
  # --headless forces a fresh Chromium per invocation, avoiding the stale
  # browser state that plagues repeated `maestro test` runs in 2.3.0.
  if maestro test --headless --screen-size 1280x800 "$flow"; then
    passed=$((passed + 1))
  else
    failed=$((failed + 1))
    echo "❌ FAILED: $flow"
  fi
  # Give the browser process time to fully release before the next launch.
  sleep 5
  echo
done

echo "═════════════════════════════"
echo "Passed: ${passed}"
echo "Failed: ${failed}"
exit "$failed"
