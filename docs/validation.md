# v0.2.0 validation record

Validation date: 14 October 2026.

| Check | Evidence |
|---|---|
| Native Claude smoke, Windows | Claude Code 2.1.299; 3 completed retrievals; 2 findings; readable dossier |
| Native Codex smoke, Windows | Codex CLI 0.153.4; explicit gpt-5.5; 4 completed retrievals; 2 findings; readable dossier |
| Unsupported configured Codex model | Failed explicitly; no fallback and no successful dossier |
| Offline runtime / MCP tests | Local Windows checks; see CI for the full OS/Node matrix |
| macOS and Linux offline checks | [CI matrix](https://github.com/frdyx/rSEARCH/actions/workflows/ci.yml) |
| Desktop integration | MCP lifecycle and manifest/archive validation; app installation unverified, preview |

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
