# File Schema Reference

Storage root: `~/.cortex/` (or `$CORTEX_DIR`)

---

## contacts.json — keyed by email (lowercase)

```json
{
  "person@company.com": {
    "name": "Jane Smith",
    "email": "person@company.com",
    "phone": null,
    "role": "Director",
    "company": "Smith Holdings Pty Ltd",
    "company_domain": "smithholdings.com.au",
    "first_seen": "2024-03-15T09:00:00+11:00",
    "last_seen": "2026-03-10T14:22:00+11:00",
    "thread_count": 7,
    "source": "gmail"
  }
}
```

**Upsert rules:** update non-null fields; keep earlier `first_seen`; keep later `last_seen`; increment `thread_count`.

---

## clients.json — keyed by domain (or slugified name if no domain)

```json
{
  "smithholdings.com.au": {
    "name": "Smith Holdings Pty Ltd",
    "domain": "smithholdings.com.au",
    "industry": null,
    "abn": null,
    "first_seen": "2024-03-15T09:00:00+11:00",
    "last_seen": "2026-03-10T14:22:00+11:00",
    "thread_count": 12,
    "contact_emails": ["person@smithholdings.com.au"],
    "source": "gmail"
  }
}
```

---

## communications.jsonl — append-only, one JSON per line

```json
{"id":"comm_1741824000_a3f2","source":"gmail","source_id":"18e2a3b4c5d6e7f8","source_url":"https://mail.google.com/mail/u/0/#all/18e2a3b4c5d6e7f8","channel":"email","subject":"Website redesign quote","participants":["client@co.com","jeremy@jezweb.net"],"summary":"Client enquired about a full website redesign. Agreed to send a quote by end of week.","communication_type":"quote","significance":4,"client_domain":"clientco.com.au","project":null,"thread_date":"2026-03-10T11:30:00+11:00","processed_at":"2026-03-13T06:15:00+11:00"}
```

`source_id` = Gmail thread ID. **Idempotency key** — always check before processing.

**significance:** 1=junk, 2=routine FYI, 3=normal business, 4=important, 5=critical

---

## knowledge.jsonl — append-only, one JSON per line

```json
{"id":"know_1741824000_b7c1","fact":"Client prefers phone contact over email","kind":"preference","client_domain":"clientco.com.au","contact_email":"client@co.com","project":null,"source":"gmail","source_id":"18e2a3b4c5d6e7f8","source_url":"https://mail.google.com/mail/u/0/#all/18e2a3b4c5d6e7f8","thread_date":"2026-03-10T11:30:00+11:00","created_at":"2026-03-13T06:15:00+11:00"}
```

**kind values:** `decision` | `commitment` | `deadline` | `amount` | `preference` | `feedback` | `relationship` | `other`

---

## files.jsonl — append-only, one JSON per line (Phase 2)

```json
{"id":"file_1741824000_c9d4","filename":"quote-march.pdf","mime_type":"application/pdf","file_type":"pdf","source":"gmail_attachment","source_thread_id":"18e2a3b4c5d6e7f8","client_domain":"clientco.com.au","extracted_text":"Full text...","description":"A website redesign quote totalling $4,200...","extraction_method":"pdftotext","description_method":"claude-api","thread_date":"2026-03-10T11:30:00+11:00","processed_at":"2026-03-13T06:15:00+11:00"}
```

---

## state.json — cursor and run history

```json
{
  "version": "1.0",
  "cursors": {"gmail": 1741824000, "google_chat": null, "calendar": null},
  "last_run": "2026-03-13T06:00:00+11:00",
  "totals": {"contacts": 142, "clients": 67, "communications": 503, "knowledge": 289, "files": 0},
  "runs": [
    {
      "date": "2026-03-13T06:00:00+11:00",
      "source": "gmail",
      "fetched": 50,
      "filtered": 33,
      "ai_processed": 17,
      "contacts_added": 2,
      "contacts_updated": 1,
      "clients_added": 1,
      "clients_updated": 2,
      "comms_logged": 15,
      "facts_stored": 8,
      "errors": 0,
      "duration_seconds": 47
    }
  ]
}
```

Keep last 30 runs. Trim oldest on write.
