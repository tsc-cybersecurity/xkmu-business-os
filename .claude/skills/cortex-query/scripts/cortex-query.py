#!/usr/bin/env python3
"""
cortex-query.py — Query your Knowledge Cortex

Usage:
  python3 cortex-query.py stats
  python3 cortex-query.py search "ABC Company"
  python3 cortex-query.py client domain.com
  python3 cortex-query.py contacts [filter]
  python3 cortex-query.py prune [--dry-run]
  python3 cortex-query.py export contacts|clients|knowledge [--format csv]

Set CORTEX_DIR env var to override default (~/.cortex)
"""

import csv
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# ─── Config ──────────────────────────────────────────────────────────────────

CORTEX_DIR = Path(os.environ.get("CORTEX_DIR", Path.home() / ".cortex"))
FILES = {
    "contacts":       CORTEX_DIR / "contacts.json",
    "clients":        CORTEX_DIR / "clients.json",
    "communications": CORTEX_DIR / "communications.jsonl",
    "knowledge":      CORTEX_DIR / "knowledge.jsonl",
    "files":          CORTEX_DIR / "files.jsonl",
    "state":          CORTEX_DIR / "state.json",
}

# ─── Helpers ─────────────────────────────────────────────────────────────────

def read_json(path, fallback=None):
    if fallback is None:
        fallback = {}
    if not path.exists():
        return fallback
    try:
        return json.loads(path.read_text())
    except Exception:
        return fallback


def read_jsonl(path):
    if not path.exists():
        return []
    records = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            records.append(json.loads(line))
        except Exception:
            pass
    return records


def write_jsonl(path, records):
    path.write_text(
        "\n".join(json.dumps(r, ensure_ascii=False) for r in records) + "\n",
        encoding="utf-8"
    )


def matches(record, query):
    return query.lower() in json.dumps(record, ensure_ascii=False).lower()


def fmt_date(iso):
    if not iso:
        return "unknown"
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return dt.strftime("%-d %b %Y")
    except Exception:
        return iso[:10]


def trunc(s, n=80):
    if not s:
        return ""
    return s[:n - 1] + "…" if len(s) > n else s


def hr(char="─", width=56):
    return char * width


# ─── Commands ─────────────────────────────────────────────────────────────────

def cmd_stats():
    state = read_json(FILES["state"])
    contacts = read_json(FILES["contacts"])
    clients = read_json(FILES["clients"])
    comms = read_jsonl(FILES["communications"])
    knowledge = read_jsonl(FILES["knowledge"])

    print(f"\nKnowledge Cortex — Stats")
    print(hr())
    print(f"Storage:         {CORTEX_DIR}")
    print(f"Last run:        {fmt_date(state.get('last_run')) or 'never'}")
    print(f"Total runs:      {len(state.get('runs', []))}")
    print(hr())
    print(f"Contacts:        {len(contacts)}")
    print(f"Clients:         {len(clients)}")
    print(f"Communications:  {len(comms)}")
    print(f"Knowledge facts: {len(knowledge)}")
    print(hr())

    print("Communications by significance:")
    for sig in range(1, 6):
        count = sum(1 for c in comms if c.get("significance") == sig)
        bar = "█" * min(count, 40)
        print(f"  [{sig}] {bar} {count}")

    print(hr())
    print("Knowledge by kind:")
    kind_counts: dict[str, int] = {}
    for k in knowledge:
        kind = k.get("kind", "other")
        kind_counts[kind] = kind_counts.get(kind, 0) + 1
    for kind, count in sorted(kind_counts.items(), key=lambda x: -x[1]):
        print(f"  {kind:<16} {count}")

    runs = state.get("runs", [])
    if runs:
        last = runs[-1]
        print(hr())
        print("Last run:")
        print(f"  {fmt_date(last.get('date'))} · {last.get('fetched', 0)} fetched · "
              f"{last.get('ai_processed', 0)} AI processed · {last.get('facts_stored', 0)} facts · "
              f"{last.get('duration_seconds', 0)}s")
    print()


def cmd_search(query):
    if not query:
        print("Usage: cortex-query.py search \"query\"")
        sys.exit(1)

    contacts = read_json(FILES["contacts"])
    clients = read_json(FILES["clients"])
    comms = read_jsonl(FILES["communications"])
    knowledge = read_jsonl(FILES["knowledge"])

    m_contacts = [c for c in contacts.values() if matches(c, query)]
    m_clients = [c for c in clients.values() if matches(c, query)]
    m_facts = [k for k in knowledge if matches(k, query)]
    m_comms = [c for c in comms if matches(c, query)]

    print(f"\nSearch: \"{query}\"")
    print(hr())

    if m_contacts:
        print(f"\nContacts ({len(m_contacts)})")
        for c in m_contacts[:10]:
            print(f"  {c.get('name', 'Unknown')} <{c.get('email', '')}>")
            if c.get("company"):
                print(f"    {c.get('role', 'Contact')} at {c['company']}")
            print(f"    Last: {fmt_date(c.get('last_seen'))} · {c.get('thread_count', 0)} threads")

    if m_clients:
        print(f"\nClients ({len(m_clients)})")
        for c in m_clients[:10]:
            print(f"  {c.get('name')} ({c.get('domain', 'no domain')})")
            print(f"    {c.get('industry') or 'Unknown industry'} · {c.get('thread_count', 0)} threads")

    if m_facts:
        print(f"\nKnowledge ({len(m_facts)} facts)")
        for f in m_facts[:15]:
            print(f"  [{f.get('kind', '?')}] {trunc(f.get('fact', ''), 90)}")
            print(f"    {f.get('client_domain') or 'no client'} · {fmt_date(f.get('thread_date'))}")
            if f.get("source_url"):
                print(f"    {f['source_url']}")

    if m_comms:
        top = sorted(m_comms, key=lambda x: -x.get("significance", 0))[:10]
        print(f"\nCommunications ({len(m_comms)} matched, top 10)")
        for c in top:
            print(f"  [sig:{c.get('significance')}] {trunc(c.get('subject', ''), 60)}")
            print(f"    {c.get('client_domain', 'unknown')} · {fmt_date(c.get('thread_date'))}")
            print(f"    {trunc(c.get('summary', ''), 90)}")
            if c.get("source_url"):
                print(f"    {c['source_url']}")

    total = len(m_contacts) + len(m_clients) + len(m_facts) + len(m_comms)
    if total == 0:
        print(f"  No results found for \"{query}\"")
    print()


def cmd_client(domain):
    if not domain:
        print("Usage: cortex-query.py client domain.com")
        sys.exit(1)

    clients = read_json(FILES["clients"])
    contacts = read_json(FILES["contacts"])
    comms = read_jsonl(FILES["communications"])
    knowledge = read_jsonl(FILES["knowledge"])

    # Exact match first, then partial
    client = clients.get(domain)
    if not client:
        for c in clients.values():
            if domain in (c.get("domain") or "") or domain.lower() in (c.get("name") or "").lower():
                client = c
                break

    if not client:
        print(f"\nNo client found matching: {domain}\n")
        # Suggest similar
        suggestions = [k for k in clients if domain[:4].lower() in k.lower()][:5]
        if suggestions:
            print("Did you mean:")
            for s in suggestions:
                print(f"  {s} — {clients[s].get('name', '')}")
        return

    c_domain = client.get("domain")
    c_contacts = [contacts[e] for e in (client.get("contact_emails") or []) if e in contacts]
    c_comms = sorted(
        [c for c in comms if c.get("client_domain") == c_domain],
        key=lambda x: x.get("thread_date", ""), reverse=True
    )
    c_facts = sorted(
        [k for k in knowledge if k.get("client_domain") == c_domain],
        key=lambda x: x.get("created_at", ""), reverse=True
    )

    print(f"\n{client.get('name', domain)}")
    print(hr())
    print(f"Domain:     {c_domain or '—'}")
    print(f"Industry:   {client.get('industry') or '—'}")
    print(f"ABN:        {client.get('abn') or '—'}")
    print(f"First seen: {fmt_date(client.get('first_seen'))}")
    print(f"Last seen:  {fmt_date(client.get('last_seen'))}")
    print(f"Threads:    {client.get('thread_count', 0)}")

    if c_contacts:
        print(f"\nContacts ({len(c_contacts)})")
        for c in c_contacts:
            phone = f" · {c['phone']}" if c.get("phone") else ""
            print(f"  {c.get('name') or c.get('email')} — {c.get('role') or 'no role'}")
            print(f"    {c.get('email')}{phone}")

    if c_facts:
        print(f"\nKnowledge ({len(c_facts)} facts)")
        for f in c_facts[:20]:
            print(f"  [{f.get('kind', '?')}] {trunc(f.get('fact', ''), 90)}")
            print(f"    {fmt_date(f.get('thread_date'))}")

    if c_comms:
        print(f"\nCommunications ({len(c_comms)} total, 10 most recent)")
        for c in c_comms[:10]:
            print(f"  [sig:{c.get('significance')}] {trunc(c.get('subject', ''), 60)}")
            print(f"    {fmt_date(c.get('thread_date'))} · {c.get('communication_type', '')}")
            print(f"    {trunc(c.get('summary', ''), 90)}")
            if c.get("source_url"):
                print(f"    {c['source_url']}")
    print()


def cmd_contacts(filter_q=None):
    contacts = read_json(FILES["contacts"])
    items = list(contacts.values())
    if filter_q:
        items = [c for c in items if matches(c, filter_q)]
    items.sort(key=lambda x: x.get("last_seen", ""), reverse=True)

    label = f' (filter: "{filter_q}")' if filter_q else ""
    print(f"\nContacts{label} — {len(items)} total")
    print(hr())
    for c in items[:50]:
        name = (c.get("name") or "Unknown").ljust(25)
        print(f"{name} {c.get('email', '')}")
        role = (c.get("role") or "—").ljust(20)
        print(f"  {role} {c.get('company') or '—'}")
        print(f"  Last: {fmt_date(c.get('last_seen'))} · {c.get('thread_count', 0)} threads")
    if len(items) > 50:
        print(f"\n  ... and {len(items) - 50} more")
    print()


def cmd_prune(dry_run=True):
    comms = read_jsonl(FILES["communications"])
    knowledge = read_jsonl(FILES["knowledge"])

    low_comms = [c for c in comms if c.get("significance", 3) <= 1]

    seen: set[str] = set()
    dup_facts = []
    for k in knowledge:
        key = f"{(k.get('fact') or '').lower().strip()}::{k.get('client_domain') or ''}"
        if key in seen:
            dup_facts.append(id(k))
        else:
            seen.add(key)

    print(f"\nPrune Analysis")
    print(hr())
    print(f"Communications (sig <= 1): {len(low_comms)} of {len(comms)}")
    print(f"Duplicate facts:           {len(dup_facts)} of {len(knowledge)}")
    print(f"Total prunable:            {len(low_comms) + len(dup_facts)}")

    if dry_run:
        print(f"\n(Dry run — no changes made)")
        print(f"Run without --dry-run to apply")
    else:
        kept_comms = [c for c in comms if c.get("significance", 3) > 1]
        kept_facts = [k for k in knowledge if id(k) not in set(dup_facts)]
        write_jsonl(FILES["communications"], kept_comms)
        write_jsonl(FILES["knowledge"], kept_facts)
        print(f"\nPruned {len(low_comms)} communications and {len(dup_facts)} duplicate facts")
    print()


def cmd_export(record_type, fmt="json"):
    if record_type == "contacts":
        data = list(read_json(FILES["contacts"]).values())
        headers = ["name", "email", "phone", "role", "company", "company_domain",
                   "first_seen", "last_seen", "thread_count"]
    elif record_type == "clients":
        data = list(read_json(FILES["clients"]).values())
        headers = ["name", "domain", "industry", "abn", "first_seen", "last_seen", "thread_count"]
    elif record_type == "knowledge":
        data = read_jsonl(FILES["knowledge"])
        headers = ["fact", "kind", "client_domain", "contact_email", "project", "thread_date", "source_url"]
    elif record_type == "communications":
        data = read_jsonl(FILES["communications"])
        headers = ["subject", "summary", "communication_type", "significance",
                   "client_domain", "thread_date", "source_url"]
    else:
        print("Usage: cortex-query.py export contacts|clients|knowledge|communications [--format csv]")
        sys.exit(1)

    if fmt == "csv":
        writer = csv.writer(sys.stdout)
        writer.writerow(headers)
        for row in data:
            writer.writerow([row.get(h, "") for h in headers])
    else:
        print(json.dumps(data, indent=2, ensure_ascii=False))


# ─── Entry ────────────────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return

    cmd = args[0]
    rest = args[1:]
    dry_run = "--dry-run" in rest
    fmt = rest[rest.index("--format") + 1] if "--format" in rest else "json"
    positional = [a for a in rest if not a.startswith("--")]

    if cmd == "stats":
        cmd_stats()
    elif cmd == "search":
        cmd_search(" ".join(positional) if positional else None)
    elif cmd == "client":
        cmd_client(positional[0] if positional else None)
    elif cmd == "contacts":
        cmd_contacts(positional[0] if positional else None)
    elif cmd == "prune":
        cmd_prune(dry_run=dry_run)
    elif cmd == "export":
        cmd_export(positional[0] if positional else None, fmt=fmt)
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
