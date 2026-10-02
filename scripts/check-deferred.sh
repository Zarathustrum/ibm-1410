#!/usr/bin/env bash
#
# Evaluate trigger conditions in the deferred-work register.
# Exit 0 if nothing tripped; exit 1 if one or more triggers fired.

set -uo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

REGISTER=""
for p in \
  docs/specs/deferred-work-register.md \
  docs/deferred-work-register.md \
  DEFERRED.md \
  deferred-work-register.md
do
  if [ -r "$p" ]; then REGISTER="$p"; break; fi
done
if [ -z "$REGISTER" ]; then
  echo "check-deferred: no register found" >&2
  exit 2
fi

declare -a IDS=() TITLES=() STATUSES=() TRIGGERS=()
cur_id=""; cur_title=""; cur_status=""; cur_trigger=""
in_bash=0; trigger_captured=0

flush() {
  if [ -n "$cur_id" ]; then
    IDS+=("$cur_id"); TITLES+=("$cur_title")
    STATUSES+=("$cur_status"); TRIGGERS+=("$cur_trigger")
  fi
  cur_id=""; cur_title=""; cur_status=""; cur_trigger=""
  in_bash=0; trigger_captured=0
}

while IFS= read -r line || [ -n "$line" ]; do
  if [[ "$line" =~ ^###[[:space:]]+(DEFERRED-[0-9]+):[[:space:]]*(.*)$ ]]; then
    flush
    cur_id="${BASH_REMATCH[1]}"; cur_title="${BASH_REMATCH[2]}"
    continue
  fi
  [ -z "$cur_id" ] && continue
  if [[ "$line" =~ \*\*Status:\*\*[[:space:]]+([A-Z]+) ]]; then
    cur_status="${BASH_REMATCH[1]}"; continue
  fi
  if [ "$trigger_captured" -eq 0 ] && [[ "$line" == '```bash' ]]; then
    in_bash=1; continue
  fi
  if [ "$in_bash" -eq 1 ] && [[ "$line" == '```' ]]; then
    in_bash=0; trigger_captured=1; continue
  fi
  [ "$in_bash" -eq 1 ] && cur_trigger+="$line"$'\n'
done < "$REGISTER"
flush

tripped=0
bold=$(printf '\033[1m'); yellow=$(printf '\033[33m')
green=$(printf '\033[32m'); dim=$(printf '\033[2m'); reset=$(printf '\033[0m')

printf "%sDeferred-work register check%s — %s\n" "$bold" "$reset" "$REGISTER"
printf "%s\n" "${dim}───────────────────────────────────────────────────────────────${reset}"

ok=0; mc=0; tc=0; rc=0; nt=0
for i in "${!IDS[@]}"; do
  id="${IDS[$i]}"; title="${TITLES[$i]}"
  status="${STATUSES[$i]:-WATCHING}"; trig="${TRIGGERS[$i]}"
  case "$status" in
    RESOLVED) rc=$((rc+1)); continue ;;
    MANUAL)
      printf "  %s[manual ]%s %-15s — %s\n" "$dim" "$reset" "$id" "$title"
      mc=$((mc+1)) ;;
    WATCHING|TRIPPED)
      if [ -z "$trig" ]; then
        printf "  [no-trig] %-15s — %s   %s(no trigger block)%s\n" "$id" "$title" "$dim" "$reset"
        nt=$((nt+1)); continue
      fi
      if bash -c "$trig" >/dev/null 2>&1; then
        printf "  %s[TRIPPED]%s %-15s — %s\n" "$yellow" "$reset" "$id" "$title"
        tc=$((tc+1)); tripped=1
      else
        printf "  %s[ok     ]%s %-15s — %s\n" "$green" "$reset" "$id" "$title"
        ok=$((ok+1))
      fi ;;
    *) printf "  [?      ] %-15s — %s   %s(unknown status '%s')%s\n" "$id" "$title" "$dim" "$status" "$reset" ;;
  esac
done

printf "%s\n" "${dim}───────────────────────────────────────────────────────────────${reset}"
printf "Summary: %d ok · %d tripped · %d manual · %d no-trigger · %d resolved\n" \
  "$ok" "$tc" "$mc" "$nt" "$rc"

if [ "$tripped" -eq 1 ]; then
  echo
  printf "%sOne or more triggers fired.%s Review %s.\n" "$bold" "$reset" "$REGISTER"
fi

exit "$tripped"
