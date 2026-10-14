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
| Claude Desktop with Codex, v0.2.1 | Same Windows app and Node; Codex CLI 0.153.4; explicit gpt-6-astra; 7 retrievals; 11 findings; status completed; dossier read successfully through the app |
| Rejected Desktop Codex model | gpt-5.5 rejected by Codex with ChatGPT sign-in; zero retrievals, explicit failed run, no dossier or silent model switch |
| Desktop coverage limits | macOS app installation remains untested; offline engine/protocol checks do not imply app validation |

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

The full Desktop acceptance runs compared built-in fetch and Axios for a Node
22/24 CLI. Both returned 11 `T3_observed` findings, with no independent-channel
corroboration assigned. Three Claude confidence proposals were lowered; the
Codex proposals needed no demotion. Each run produced Markdown and JSON
dossiers, falsifiers, limitations and provenance. The user confirmed successful
`research_read` for both providers in Claude Desktop. Both streams and saved
findings were re-verified locally without rewriting the app's artifacts.

The tested bundle SHA-256 was
`46d80d5bbeeca8e643c5b4cdb4e3cae2de59ba359e1b3e4206a1cadf6400e75d`.
The release bundle has the same executable runtime, with updated compatibility
and package metadata. The [sanitized Desktop recording](../test/fixtures/live-claude-desktop.jsonl.metadata.json)
links the fixture to the original stream digest; its parser-relevant events
retain the actual completed operations and findings. This validates the
runtime workflow, not the correctness of the researched HTTP-client claims.

The [Codex Desktop recording](../test/fixtures/live-codex-desktop.jsonl.metadata.json)
likewise preserves its seven completed operations and 11 findings. The run
completed in 188 seconds; that is an observation from this test, not a speed
guarantee. Running the same brief through two providers does not automatically
corroborate their findings; matching claims and source independence require
separate review.

The successful Codex Desktop test followed the v0.2.1 release publication and
used the same executable runtime. Published archives remain unchanged; this
record and the release notes add the subsequent validation evidence.

The earlier native Codex smoke's `gpt-5.5` model is historical. OpenAI's
[model documentation](https://learn.chatgpt.com/docs/models#other-models) records
its retirement from Codex with ChatGPT sign-in on 14 October 2026. The failed
Desktop attempt confirms the rejection for this login. Use a model available
to the chosen CLI and account, rather than copying an old smoke-test override.
