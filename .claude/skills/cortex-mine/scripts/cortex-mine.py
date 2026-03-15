#!/usr/bin/env python3
"""
cortex-mine.py — Knowledge Cortex Gmail miner

Fetches Gmail threads, filters junk, extracts structured knowledge
via Claude API, writes to ~/.cortex/ flat files.

Usage:
  python3 cortex-mine.py
  python3 cortex-mine.py --from 2024-01-01
  python3 cortex-mine.py --dry-run
  python3 cortex-mine.py --batch-size 25

Requirements:
  pip install anthropic
  npm install -g @googleworkspace/cli
  gws auth setup
  ANTHROPIC_API_KEY env var
"""

import argparse
import base64
import json
import os
import random
import re
import string
import subprocess
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

# ─── Config ──────────────────────────────────────────────────────────────────

CORTEX_DIR = Path(os.environ.get("CORTEX_DIR", Path.home() / ".cortex"))
BATCH_SIZE = int(os.environ.get("CORTEX_BATCH_SIZE", "50"))
OWNER_EMAIL = os.environ.get("CORTEX_OWNER_EMAIL", "").lower()
MODEL = "claude-sonnet-4-6"

FILES = {
    "contacts":       CORTEX_DIR / "contacts.json",
    "clients":        CORTEX_DIR / "clients.json",
    "communications": CORTEX_DIR / "communications.jsonl",
    "knowledge":      CORTEX_DIR / "knowledge.jsonl",
    "files":          CORTEX_DIR / "files.jsonl",
    "state":          CORTEX_DIR / "state.json",
}

# ─── Automated sender patterns ────────────────────────────────────────────────

JUNK_FROM_PREFIXES = [
    "no-reply@", "noreply@", "do-not-reply@", "donotreply@",
    "notifications@", "notification@", "alerts@", "alert@",
    "mailer-daemon@", "postmaster@", "bounce@", "auto-confirm@",
    "automated@", "robot@", "newsletter@", "newsletters@",
    "marketing@", "billing@", "invoices@", "receipts@", "system@",
]

JUNK_DOMAINS = {
    "xero.com", "myob.com", "quickbooks.com", "stripe.com", "paypal.com",
    "square.com", "mailchimp.com", "hubspot.com", "klaviyo.com", "brevo.com",
    "sendinblue.com", "constantcontact.com", "campaignmonitor.com",
    "intercom.io", "zendesk.com", "freshdesk.com", "shopify.com",
    "squarespace.com", "wix.com", "salesforce.com",
}

JUNK_SUBJECT_PATTERNS = [
    r"unsubscribe", r"newsletter", r"your invoice", r"invoice #",
    r"receipt for", r"your order", r"order confirmation",
    r"delivery notification", r"shipping notification",
    r"password reset", r"reset your password",
    r"verify your email", r"verification code", r"confirm your email",
    r"account activation", r"trial started", r"subscription renewed",
    r"payment received", r"payment failed", r"payment reminder",
    r"automatic reply", r"auto.?reply", r"out of office",
    r"do not reply", r"security alert", r"new sign.?in",
    r"weekly digest", r"monthly summary",
]
JUNK_SUBJECT_RE = re.compile("|".join(JUNK_SUBJECT_PATTERNS), re.IGNORECASE)

# ─── Helpers ─────────────────────────────────────────────────────────────────

def rand_id(prefix: str) -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))
    return f"{prefix}_{int(time.time())}_{suffix}"


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat()


def read_json(path: Path, fallback=None):
    if fallback is None:
        fallback = {}
    if not path.exists():
        return fallback
    try:
        return json.loads(path.read_text())
    except Exception:
        return fallback


def write_json(path: Path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False))


def append_jsonl(path: Path, record: dict):
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


def load_processed_ids() -> set:
    """Load all processed thread IDs from communications.jsonl into a set (O(n) once)."""
    comms = FILES["communications"]
    ids = set()
    if not comms.exists():
        return ids
    try:
        for line in comms.open(encoding="utf-8"):
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
                sid = record.get("source_id")
                if sid:
                    ids.add(sid)
            except Exception:
                pass
    except Exception:
        pass
    return ids


def run_gws(params: dict, resource: str, method: str) -> dict | None:
    """Run a gws CLI command and return parsed JSON output."""
    cmd = ["gws", "gmail", resource, method, "--params", json.dumps(params)]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            print(f"  gws error: {result.stderr.strip()}", file=sys.stderr)
            return None
        return json.loads(result.stdout)
    except subprocess.TimeoutExpired:
        print(f"  gws timeout on {resource}/{method}", file=sys.stderr)
        return None
    except json.JSONDecodeError as e:
        print(f"  gws JSON parse error: {e}", file=sys.stderr)
        return None
    except FileNotFoundError:
        print("ERROR: gws not found. Install: npm install -g @googleworkspace/cli", file=sys.stderr)
        sys.exit(1)


def decode_body(data: str) -> str:
    """Decode base64url email body."""
    try:
        padded = data.replace("-", "+").replace("_", "/")
        padded += "=" * (4 - len(padded) % 4)
        return base64.b64decode(padded).decode("utf-8", errors="replace")
    except Exception:
        return ""


def extract_text_from_message(message: dict) -> str:
    """Extract plain text from a Gmail message payload."""
    payload = message.get("payload", {})
    parts = payload.get("parts", [])
    body_data = payload.get("body", {}).get("data", "")

    texts = []

    def walk_parts(parts_list):
        for part in parts_list:
            mime = part.get("mimeType", "")
            if mime == "text/plain":
                data = part.get("body", {}).get("data", "")
                if data:
                    texts.append(decode_body(data))
            elif mime.startswith("multipart/"):
                walk_parts(part.get("parts", []))

    if parts:
        walk_parts(parts)
    elif body_data:
        texts.append(decode_body(body_data))

    text = "\n".join(texts).strip()
    # Trim to 3000 chars to avoid massive context
    return text[:3000] if len(text) > 3000 else text


def get_header(headers: list, name: str) -> str:
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


def build_thread_summary(thread_data: dict) -> dict:
    """Extract usable fields from a raw Gmail thread."""
    messages = thread_data.get("messages", [])
    if not messages:
        return {}

    first = messages[0]
    headers = first.get("payload", {}).get("headers", [])

    subject = get_header(headers, "Subject")
    from_addr = get_header(headers, "From")
    date_str = get_header(headers, "Date")

    # Collect all participants
    all_emails = set()
    for msg in messages:
        h = msg.get("payload", {}).get("headers", [])
        for field in ["From", "To", "Cc"]:
            val = get_header(h, field)
            # Extract emails from "Name <email>" format
            emails = re.findall(r"[\w.+-]+@[\w.-]+\.\w+", val)
            all_emails.update(e.lower() for e in emails)
    all_emails.discard(OWNER_EMAIL)

    # Combine text from all messages
    all_text = []
    for msg in messages[:5]:  # cap at 5 messages to control size
        text = extract_text_from_message(msg)
        if text:
            all_text.append(text)
    body = "\n\n---\n\n".join(all_text)

    return {
        "thread_id": thread_data.get("id", ""),
        "subject": subject,
        "from": from_addr,
        "participants": sorted(all_emails),
        "date": date_str,
        "body": body,
        "message_count": len(messages),
    }


# ─── Pre-filter ───────────────────────────────────────────────────────────────

def should_skip(thread_summary: dict) -> tuple[bool, str]:
    """Returns (skip, reason). Fast, no AI."""
    from_addr = thread_summary.get("from", "").lower()
    subject = thread_summary.get("subject", "")

    # Extract email from "Name <email>" format
    email_match = re.search(r"[\w.+-]+@[\w.-]+\.\w+", from_addr)
    email = email_match.group(0).lower() if email_match else from_addr
    domain = email.split("@")[-1] if "@" in email else ""

    for prefix in JUNK_FROM_PREFIXES:
        if email.startswith(prefix):
            return True, f"junk sender prefix: {prefix}"

    if domain in JUNK_DOMAINS:
        return True, f"junk domain: {domain}"

    if JUNK_SUBJECT_RE.search(subject):
        return True, f"junk subject pattern"

    # Single-message thread from automated-looking sender
    if thread_summary.get("message_count", 1) == 1:
        if not thread_summary.get("participants"):
            return True, "single message, no other participants"

    return False, ""


# ─── Claude extraction ────────────────────────────────────────────────────────

EXTRACTION_PROMPT = """You are extracting structured data from an email thread to build a personal business knowledge base.

EMAIL THREAD:
Subject: {subject}
From: {from_addr}
Participants: {participants}
Date: {date}
Messages ({message_count} total):

{body}

Extract the following. Respond with ONLY valid JSON, no preamble, no markdown fences:

{{
  "contacts": [
    {{"name": "Full Name", "email": "email@domain.com", "phone": null, "role": null, "company": null}}
  ],
  "client": {{"name": null, "domain": null, "industry": null}},
  "project": null,
  "significance": 2,
  "communication_type": "general",
  "summary": "1-2 sentence summary of what this thread was about and what happened",
  "key_facts": [
    {{"fact": "Specific useful fact, decision, or commitment", "kind": "preference"}}
  ]
}}

Significance: 1=junk/automated, 2=routine FYI, 3=normal business, 4=important (commitment/quote/agreement), 5=critical (contract/dispute/major decision)
communication_type: inquiry | quote | support | meeting | general | complaint | contract | introduction
fact kind: decision | commitment | deadline | amount | preference | feedback | relationship | other

Rules:
- Only include real human contacts (no bots, no automated senders)
- Do NOT include {owner_email} as a contact
- Only include key_facts worth recalling in 6 months
- If clearly junk, return significance: 1 and empty arrays
- client.domain should be the company's primary web domain if evident"""


def extract_from_thread(client, thread_summary: dict, owner_email: str) -> dict | None:
    """Call Claude API to extract structured data from thread."""
    prompt = EXTRACTION_PROMPT.format(
        subject=thread_summary.get("subject", ""),
        from_addr=thread_summary.get("from", ""),
        participants=", ".join(thread_summary.get("participants", [])),
        date=thread_summary.get("date", ""),
        message_count=thread_summary.get("message_count", 1),
        body=thread_summary.get("body", "")[:2500],
        owner_email=owner_email or "your own email",
    )

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text.strip()

        # Strip any accidental markdown fences
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

        return json.loads(text)

    except json.JSONDecodeError:
        # Retry once with explicit instruction
        try:
            retry_response = client.messages.create(
                model=MODEL,
                max_tokens=1024,
                messages=[
                    {"role": "user", "content": prompt},
                    {"role": "assistant", "content": text},
                    {"role": "user", "content": "That response contained invalid JSON. Return ONLY the JSON object, nothing else."},
                ],
            )
            return json.loads(retry_response.content[0].text.strip())
        except Exception:
            return None
    except Exception as e:
        print(f"  Claude API error: {e}", file=sys.stderr)
        return None


# ─── Write helpers ────────────────────────────────────────────────────────────

def upsert_contact(contacts: dict, contact: dict, client_domain: str | None, thread_date: str):
    email = contact.get("email", "").lower().strip()
    if not email or "@" not in email:
        return
    if OWNER_EMAIL and email == OWNER_EMAIL:
        return

    existing = contacts.get(email, {})
    now = now_iso()

    updated = {
        "name": contact.get("name") or existing.get("name"),
        "email": email,
        "phone": contact.get("phone") or existing.get("phone"),
        "role": contact.get("role") or existing.get("role"),
        "company": contact.get("company") or existing.get("company"),
        "company_domain": client_domain or existing.get("company_domain"),
        "first_seen": existing.get("first_seen") or thread_date or now,
        "last_seen": thread_date or now,
        "thread_count": existing.get("thread_count", 0) + 1,
        "source": "gmail",
    }

    # Keep earlier first_seen
    if existing.get("first_seen") and thread_date:
        updated["first_seen"] = min(existing["first_seen"], thread_date)

    contacts[email] = updated
    return email


def upsert_client(clients: dict, client_data: dict, contact_email: str | None, thread_date: str) -> str | None:
    name = (client_data.get("name") or "").strip()
    domain = (client_data.get("domain") or "").lower().strip()

    if not name and not domain:
        return None

    # Determine key
    key = domain if domain else re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

    existing = clients.get(key, {})
    now = now_iso()

    contact_emails = set(existing.get("contact_emails") or [])
    if contact_email:
        contact_emails.add(contact_email)

    updated = {
        "name": name or existing.get("name", key),
        "domain": domain or existing.get("domain"),
        "industry": client_data.get("industry") or existing.get("industry"),
        "abn": existing.get("abn"),
        "first_seen": existing.get("first_seen") or thread_date or now,
        "last_seen": thread_date or now,
        "thread_count": existing.get("thread_count", 0) + 1,
        "contact_emails": sorted(contact_emails),
        "source": "gmail",
    }

    if existing.get("first_seen") and thread_date:
        updated["first_seen"] = min(existing["first_seen"], thread_date)

    clients[key] = updated
    return key


# ─── Main mining loop ─────────────────────────────────────────────────────────

def run_mining(dry_run: bool, from_date: str | None, batch_size: int):
    start_time = time.time()
    print(f"\nKnowledge Cortex — {'DRY RUN ' if dry_run else ''}Mining Pass")
    print(f"Storage: {CORTEX_DIR}")
    print("─" * 50)

    # Check anthropic
    try:
        import anthropic
    except ImportError:
        print("ERROR: anthropic not installed. Run: pip install anthropic --break-system-packages")
        sys.exit(1)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY not set")
        sys.exit(1)

    anthropic_client = anthropic.Anthropic(api_key=api_key)

    # Load state
    state = read_json(FILES["state"], {
        "version": "1.0",
        "cursors": {"gmail": None},
        "last_run": None,
        "totals": {"contacts": 0, "clients": 0, "communications": 0, "knowledge": 0},
        "runs": [],
    })

    # Determine cursor date
    if from_date:
        cursor_str = from_date.replace("-", "/")
    elif state.get("cursors", {}).get("gmail"):
        ts = state["cursors"]["gmail"]
        cursor_dt = datetime.fromtimestamp(ts, tz=timezone.utc)
        cursor_str = cursor_dt.strftime("%Y/%m/%d")
    else:
        default_dt = datetime.now(timezone.utc) - timedelta(days=90)
        cursor_str = default_dt.strftime("%Y/%m/%d")

    print(f"Fetching threads after: {cursor_str}")

    # Build Gmail query
    gmail_query = (
        f"after:{cursor_str} "
        "-category:promotions -category:updates -category:social "
        "-from:no-reply -from:noreply"
    )

    # Fetch thread list
    list_result = run_gws(
        {"userId": "me", "q": gmail_query, "maxResults": batch_size},
        "threads", "list"
    )

    if not list_result:
        print("Failed to fetch thread list from Gmail")
        sys.exit(1)

    threads = list_result.get("threads", [])
    print(f"Threads fetched:    {len(threads)}")

    if not threads:
        print("No new threads found. Cortex is up to date.")
        return

    # Load mutable stores
    contacts = read_json(FILES["contacts"], {})
    clients = read_json(FILES["clients"], {})

    # Load processed thread IDs for fast dedup (O(n) once, not per-thread)
    processed_ids = load_processed_ids()

    # Stats
    stats = {
        "fetched": len(threads),
        "skipped_duplicate": 0,
        "skipped_prefilter": 0,
        "ai_processed": 0,
        "sig_1": 0,
        "contacts_added": 0,
        "contacts_updated": 0,
        "clients_added": 0,
        "clients_updated": 0,
        "comms_logged": 0,
        "facts_stored": 0,
        "errors": 0,
    }

    latest_ts = state.get("cursors", {}).get("gmail") or 0
    dry_run_rows = []

    for i, thread_ref in enumerate(threads):
        thread_id = thread_ref.get("id", "")

        # Duplicate check (O(1) set lookup)
        if thread_id in processed_ids:
            stats["skipped_duplicate"] += 1
            continue

        # Fetch full thread
        thread_data = run_gws({"userId": "me", "id": thread_id}, "threads", "get")
        if not thread_data:
            stats["errors"] += 1
            continue

        summary = build_thread_summary(thread_data)
        if not summary:
            stats["errors"] += 1
            continue

        # Pre-filter
        skip, reason = should_skip(summary)
        if skip:
            stats["skipped_prefilter"] += 1
            if dry_run:
                dry_run_rows.append({
                    "id": thread_id,
                    "from": summary.get("from", "")[:40],
                    "subject": summary.get("subject", "")[:50],
                    "sig": "—",
                    "action": f"skip ({reason})",
                })
            continue

        # Extract with Claude
        print(f"  [{i+1}/{len(threads)}] Extracting: {summary.get('subject', '')[:60]}")
        extracted = extract_from_thread(anthropic_client, summary, OWNER_EMAIL)

        if not extracted:
            stats["errors"] += 1
            continue

        stats["ai_processed"] += 1
        significance = extracted.get("significance", 2)

        if dry_run:
            n_facts = len(extracted.get("key_facts") or [])
            n_contacts = len(extracted.get("contacts") or [])
            actions = []
            if significance >= 3:
                if n_contacts:
                    actions.append(f"+{n_contacts} contacts")
                if extracted.get("client", {}).get("name"):
                    actions.append("+client")
                actions.append("log comms")
                if n_facts:
                    actions.append(f"+{n_facts} facts")
            elif significance == 2:
                actions.append("log only")
            else:
                actions.append("skip (sig 1)")
            dry_run_rows.append({
                "id": thread_id,
                "from": summary.get("from", "")[:40],
                "subject": summary.get("subject", "")[:50],
                "sig": significance,
                "action": ", ".join(actions),
            })
            continue

        # Track latest timestamp for cursor
        messages = thread_data.get("messages", [])
        if messages:
            msg_ts = int(messages[-1].get("internalDate", "0")) // 1000
            latest_ts = max(latest_ts, msg_ts)

        # Parse thread date
        thread_date = summary.get("date", now_iso())

        # Source URL
        source_url = f"https://mail.google.com/mail/u/0/#all/{thread_id}"

        # ── significance 1: skip ──
        if significance <= 1:
            stats["sig_1"] += 1
            continue

        # ── significance 2: log comms only ──
        comm_record = {
            "id": rand_id("comm"),
            "source": "gmail",
            "source_id": thread_id,
            "source_url": source_url,
            "channel": "email",
            "subject": summary.get("subject", ""),
            "participants": summary.get("participants", []),
            "summary": extracted.get("summary", ""),
            "communication_type": extracted.get("communication_type", "general"),
            "significance": significance,
            "client_domain": None,
            "project": extracted.get("project"),
            "thread_date": thread_date,
            "processed_at": now_iso(),
        }

        if significance >= 3:
            # Upsert contacts
            client_data = extracted.get("client") or {}
            client_domain = client_data.get("domain") or None

            contact_email = None
            for contact in (extracted.get("contacts") or []):
                prev_exists = contact.get("email", "").lower() in contacts
                email = upsert_contact(contacts, contact, client_domain, thread_date)
                if email:
                    contact_email = contact_email or email
                    if prev_exists:
                        stats["contacts_updated"] += 1
                    else:
                        stats["contacts_added"] += 1

            # Upsert client
            if client_data.get("name") or client_data.get("domain"):
                prev_exists = bool(
                    client_data.get("domain") and client_data["domain"] in clients
                )
                domain_key = upsert_client(clients, client_data, contact_email, thread_date)
                if domain_key:
                    client_domain = client_domain or domain_key
                    if prev_exists:
                        stats["clients_updated"] += 1
                    else:
                        stats["clients_added"] += 1

            comm_record["client_domain"] = client_domain

            # Store knowledge facts
            for fact_item in (extracted.get("key_facts") or []):
                fact_text = fact_item.get("fact", "").strip()
                if not fact_text:
                    continue
                know_record = {
                    "id": rand_id("know"),
                    "fact": fact_text,
                    "kind": fact_item.get("kind", "other"),
                    "client_domain": client_domain,
                    "contact_email": contact_email,
                    "project": extracted.get("project"),
                    "source": "gmail",
                    "source_id": thread_id,
                    "source_url": source_url,
                    "thread_date": thread_date,
                    "created_at": now_iso(),
                }
                append_jsonl(FILES["knowledge"], know_record)
                stats["facts_stored"] += 1

        append_jsonl(FILES["communications"], comm_record)
        processed_ids.add(thread_id)  # Prevent within-batch duplicates
        stats["comms_logged"] += 1

        # Small delay to be kind to the API
        time.sleep(0.3)

    # ── Write updated stores ───────────────────────────────────────────────────

    if not dry_run:
        write_json(FILES["contacts"], contacts)
        write_json(FILES["clients"], clients)

        # Update state
        if latest_ts:
            state.setdefault("cursors", {})["gmail"] = latest_ts

        state["last_run"] = now_iso()
        state.setdefault("totals", {})
        state["totals"]["contacts"] = len(contacts)
        state["totals"]["clients"] = len(clients)

        # Count JSONL lines
        for key in ("communications", "knowledge"):
            path = FILES[key]
            count = sum(1 for line in path.open() if line.strip()) if path.exists() else 0
            state["totals"][key] = count

        run_record = {
            "date": now_iso(),
            "source": "gmail",
            "fetched": stats["fetched"],
            "skipped_duplicate": stats["skipped_duplicate"],
            "skipped_prefilter": stats["skipped_prefilter"],
            "ai_processed": stats["ai_processed"],
            "contacts_added": stats["contacts_added"],
            "contacts_updated": stats["contacts_updated"],
            "clients_added": stats["clients_added"],
            "clients_updated": stats["clients_updated"],
            "comms_logged": stats["comms_logged"],
            "facts_stored": stats["facts_stored"],
            "errors": stats["errors"],
            "duration_seconds": round(time.time() - start_time),
        }

        runs = state.get("runs", [])
        runs.append(run_record)
        state["runs"] = runs[-30:]  # keep last 30
        write_json(FILES["state"], state)

    # ── Report ─────────────────────────────────────────────────────────────────

    duration = round(time.time() - start_time)
    print(f"\nCortex {'dry run' if dry_run else 'run'} complete — {datetime.now().strftime('%-d %b %Y')}")
    print("─" * 50)
    print(f"Threads fetched:       {stats['fetched']}")
    print(f"Skipped (duplicate):   {stats['skipped_duplicate']}")
    print(f"Skipped (pre-filter):  {stats['skipped_prefilter']}")
    print(f"Skipped (sig 1):       {stats['sig_1']}")
    print(f"AI processed:          {stats['ai_processed']}")
    print("─" * 50)

    if dry_run:
        if dry_run_rows:
            print(f"\n{'Thread ID':<12} {'Sig':>3}  {'Action':<30}  Subject")
            print("─" * 80)
            for row in dry_run_rows:
                print(f"{row['id'][:12]:<12} {str(row['sig']):>3}  {row['action'][:30]:<30}  {row['subject'][:40]}")
        print("\n(Dry run — no files written)")
    else:
        print(f"Contacts upserted:     {stats['contacts_added'] + stats['contacts_updated']}  ({stats['contacts_added']} new, {stats['contacts_updated']} updated)")
        print(f"Clients upserted:      {stats['clients_added'] + stats['clients_updated']}  ({stats['clients_added']} new, {stats['clients_updated']} updated)")
        print(f"Communications logged: {stats['comms_logged']}")
        print(f"Facts stored:          {stats['facts_stored']}")
        if stats["errors"]:
            print(f"Errors:                {stats['errors']}")
        print(f"Duration:              {duration}s")
        print(f"Storage:               {CORTEX_DIR}")
    print()


# ─── Entry ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Knowledge Cortex Gmail miner")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    parser.add_argument("--from", dest="from_date", metavar="YYYY-MM-DD", help="Override start date")
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE, help="Threads per run")
    args = parser.parse_args()

    CORTEX_DIR.mkdir(parents=True, exist_ok=True)
    (CORTEX_DIR / "originals").mkdir(exist_ok=True)

    run_mining(
        dry_run=args.dry_run,
        from_date=args.from_date,
        batch_size=args.batch_size,
    )
