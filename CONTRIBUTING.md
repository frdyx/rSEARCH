# Contribute to rSEARCH

Small reproducible changes are welcome. Open an issue for a new provider or
evidence-policy change before implementing it, so compatibility and trust claims
can be reviewed together.

```bash
npm ci --ignore-scripts
npm test
npm run check
```

Tests are offline and use synthetic or sanitized recorded events. Live provider
tests spend normal provider usage and must be run deliberately, not in PR CI.
Clean-install checks may download npm dependencies; they never invoke a research
provider. The published CLI includes a shrinkwrap lock and pins the MCP peer.
Never include credentials, personal configuration, private repository material,
or unreviewed provider logs in a contribution.

Provider parser changes need fixtures covering completed and failed operations,
duplicates, unmatched results, malformed payloads and final provider failures.
An unknown event format must fail closed. Do not infer retrieval from prose.

Evidence policy changes need tests demonstrating what the new tier establishes.
Do not promote file existence to verification, or count extra workers as
independent channels. Documentation must state what remains unverified.

For assets, preserve the explanatory graphic direction and include alt text.
Keep the workflow claims accurate and provide compact web exports. See
[asset specifications](docs/assets.md).

Code and original project assets are contributed under the [MIT license](LICENSE).
Third-party material must carry its applicable attribution and permission.
