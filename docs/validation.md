# Validation record

Validation date: 14 October 2026.

| Check | Evidence |
|---|---|
| Native Claude smoke, Windows | Claude Code 2.1.299; 3 completed retrievals; 2 findings; readable dossier |
| Native Codex smoke, Windows | Codex CLI 0.153.4; explicit gpt-5.5; 4 completed retrievals; 2 findings; readable dossier |
| Unsupported configured Codex model | Failed explicitly; no fallback and no successful dossier |
| Offline runtime / MCP tests | Local Windows checks; see CI for the full OS/Node matrix |
| macOS and Linux offline checks | [CI matrix](https://github.com/frdyx/rSEARCH/actions/workflows/ci.yml) |
| Claude Desktop installation, Windows | v0.2.0 installed and enabled in Claude Desktop 2.37337.1; bundled Node 24.21.0; doctor detected Claude Code 2.1.299 |
| Claude Desktop full research, v0.2.0 | Failed before retrieval because a blank model field was forwarded as its unresolved template; no dossier |
| v0.2.1 desktop fix | Dedicated launcher normalizes only known unset optional templates; doctor exposes the effective model override |
| Claude Desktop full research, v0.2.1 | Windows, Claude Desktop 2.37337.1, bundled Node 24.21.0, Claude Code 2.1.299; 14 retrievals; 11 findings; status completed; dossier read successfully through the app |
| Desktop coverage limits | macOS app installation and Desktop research with Codex are not yet tested; offline engine/protocol checks do not imply app validation |

The live fixture bodies are sanitized recordings, not invented retrieval
events. Tool result bodies are omitted, operation/session identifiers are
anonymized and only parser-relevant events are retained. The source claims in
those recordings are test evidence, not a continuously maintained API reference.

The release tests retrieval floors, failed and duplicate operations, payload
validation, stream/finding tampering, source-origin grouping, independent
channels, file-existence overclaiming, cancellation, timeouts, store locks,
Windows paths, symlink boundaries and asynchronous MCP calls.

Sandboxed Windows junction creation may be unavailable; that local symlink
case is skipped rather than presented as a pass. CI runs the same test where
its host permits link creation.

The desktop clean-install check launches the extracted extension using its
manifest arguments and environment, including unresolved blank fields, empty
fields and an explicit model. It checks the effective configuration over MCP.
An offline asynchronous research regression covers the unresolved-field case
through dossier completion using a fixture provider.

The full Desktop acceptance run compared built-in fetch and Axios for a Node
22/24 CLI. All 11 findings remained `T3_observed`, with no independent-channel
corroboration; three proposed confidence levels were lowered. It produced both
Markdown and JSON dossiers, falsifiers, limitations and provenance. The user
confirmed successful `research_read` in Claude Desktop. The stream and saved
findings were then re-verified locally without rewriting the app's artifacts.

The tested bundle SHA-256 was
`46d80d5bbeeca8e643c5b4cdb4e3cae2de59ba359e1b3e4206a1cadf6400e75d`.
The release bundle has the same executable runtime, with updated compatibility
and package metadata. The [sanitized Desktop recording](../test/fixtures/live-claude-desktop.jsonl.metadata.json)
links the fixture to the original stream digest; its parser-relevant events
retain the actual completed operations and findings. This validates the
runtime workflow, not the correctness of the researched HTTP-client claims.
