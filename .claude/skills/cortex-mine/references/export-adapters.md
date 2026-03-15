# Export Adapters

Cortex data lives in portable flat files. Export to any system using the patterns below.

## Quick export

```bash
# CSV (for spreadsheets, CRM imports, Notion)
python3 cortex-query.py export contacts --format csv > contacts.csv
python3 cortex-query.py export clients --format csv > clients.csv
python3 cortex-query.py export knowledge --format csv > knowledge.csv
python3 cortex-query.py export communications --format csv > comms.csv

# JSON (for APIs, scripts, databases)
python3 cortex-query.py export contacts --format json > contacts-export.json
```

## Obsidian / Markdown vault

Convert contacts to individual markdown files with YAML frontmatter:

```bash
# For each contact, create a .md file
jq -r 'to_entries[] | .value | "---\nemail: \(.email)\ncompany: \(.company // "unknown")\nrole: \(.role // "unknown")\n---\n# \(.name // .email)\n\nLast seen: \(.last_seen)\nThreads: \(.thread_count)"' ~/.cortex/contacts.json
```

Knowledge facts map to daily notes or tagged entries. Communications map to a log file per client.

## SQLite

```bash
# Create SQLite database from flat files
sqlite3 cortex.db <<'SQL'
CREATE TABLE contacts (name TEXT, email TEXT PRIMARY KEY, phone TEXT, role TEXT, company TEXT, company_domain TEXT, first_seen TEXT, last_seen TEXT, thread_count INTEGER);
CREATE TABLE clients (name TEXT, domain TEXT PRIMARY KEY, industry TEXT, abn TEXT, first_seen TEXT, last_seen TEXT, thread_count INTEGER);
CREATE TABLE communications (id TEXT PRIMARY KEY, source TEXT, source_id TEXT UNIQUE, subject TEXT, summary TEXT, communication_type TEXT, significance INTEGER, client_domain TEXT, thread_date TEXT);
CREATE TABLE knowledge (id TEXT PRIMARY KEY, fact TEXT, kind TEXT, client_domain TEXT, contact_email TEXT, thread_date TEXT);
.mode csv
.import contacts.csv contacts
.import knowledge.csv knowledge
SQL
```

## Notion

1. Export CSV: `cortex-query.py export contacts --format csv`
2. Notion > Import > CSV > map columns to properties
3. Repeat for clients, knowledge, communications

## CRM systems (HubSpot, Pipedrive, etc.)

Export CSV and use the CRM's bulk import. Field mapping:
- `name` -> Contact Name
- `email` -> Email
- `phone` -> Phone
- `company` -> Company/Organisation
- `company_domain` -> Website

## Custom API / MCP server

Read files directly from `~/.cortex/` in your scripts:

```python
import json
from pathlib import Path

cortex = Path.home() / ".cortex"

# Contacts: dict keyed by email
contacts = json.loads((cortex / "contacts.json").read_text())
jane = contacts.get("jane@company.com")

# Knowledge: list of facts (JSONL)
facts = []
for line in (cortex / "knowledge.jsonl").open():
    if line.strip():
        facts.append(json.loads(line))

# Filter by client
client_facts = [f for f in facts if f.get("client_domain") == "company.com"]
```
