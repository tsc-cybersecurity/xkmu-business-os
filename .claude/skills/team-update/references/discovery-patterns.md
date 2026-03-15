# Discovery Patterns

How to detect available MCP tools by capability category during first-run discovery.

## Detection Strategy

List all available MCP tools by checking what's loaded in the current session. MCP tool names follow the pattern `mcp__<server>__<tool>`. Match tool names against these patterns to categorise capabilities.

## Chat Tools

Look for tools that can send and read messages in team channels.

| Pattern | Server | Notes |
|---|---|---|
| `mcp__*google-chat*__chat_messages` | Google Chat | Supports spaces, threads, cards |
| `mcp__*slack*__*message*` | Slack | Channels, threads, blocks |
| `mcp__*discord*__*message*` | Discord | Channels, threads |
| `mcp__*teams*__*message*` | Microsoft Teams | Channels, threads, cards |

**What to capture**: The exact tool name, which server it belongs to, and whether it supports threading.

**Fallback**: If no chat tools are found, the skill outputs formatted text for the user to copy-paste into their preferred channel.

## Git

Not an MCP tool. Detect with:

```bash
git rev-parse --is-inside-work-tree 2>/dev/null
```

If true, git is available. Capture the repo name from the directory or `git remote get-url origin`.

## Issue Trackers

| Pattern | Server | Notes |
|---|---|---|
| `mcp__*github*__github_issues` | GitHub | Issues and PRs, labels |
| `mcp__*linear*__*issue*` | Linear | Issues, projects, labels |
| `mcp__*jira*__*issue*` | Jira | Issues, projects |
| `mcp__*brain*__brain_issues` | Jezweb Brain | Issues with client/site scoping |

**What to capture**: Tool name, whether it supports creating issues, available label schemes.

## Task Trackers

| Pattern | Server | Notes |
|---|---|---|
| `mcp__*brain*__brain_tasks` | Jezweb Brain | Persistent cross-session tasks |
| `mcp__*asana*__*task*` | Asana | Tasks, projects |
| `mcp__*linear*__*issue*` | Linear | Also serves as task tracker |
| `mcp__*todoist*__*task*` | Todoist | Tasks, projects |

## Knowledge Stores

| Pattern | Server | Notes |
|---|---|---|
| `mcp__*vault*__remember` | Vault | Personal knowledge, semantic search |
| `mcp__*vault*__recall` | Vault | Retrieve stored knowledge |
| `mcp__*brain*__brain_knowledge` | Jezweb Brain | Team-visible knowledge |

**What to capture**: Tool name, whether it supports tagging/categorisation.

## Discovery Output

After detection, present a summary to the user:

```
## Discovered Capabilities

- Chat: Google Chat (via google-chat-anthro)
- Git: Yes (jezweb/my-project on branch main)
- Issues: GitHub (via github MCP)
- Tasks: Brain (via brain MCP)
- Knowledge: Vault (via vault MCP)

Missing:
- (none — all capabilities available)

Which chat space should I post updates to?
```

If multiple options exist for a category (e.g. two chat servers), ask the user which one to use.

## Re-Discovery

If a tool becomes unavailable after the playbook was saved (MCP server disconnected), the skill should:

1. Note the missing tool in its output
2. Fall back gracefully (skip that data source, or output text instead of posting)
3. Suggest updating the playbook if the change is permanent
