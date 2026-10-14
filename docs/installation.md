# Install rSEARCH

Choose the installation path for the environment where you will use rSEARCH.
The CLI, skills and desktop tools all share the same research engine.

## Provider prerequisites

Install and sign in to your chosen CLI using the provider's official guide:

- [Codex setup](https://learn.chatgpt.com/docs/quickstart)
- [Claude Code setup](https://code.claude.com/docs/en/setup)

Standalone rSEARCH requires Node.js **22+**. Check `node --version` first.
The package does not collect credentials. Authenticate through the provider's
own CLI. `doctor` checks installation; authentication is checked on a live run.

## Standalone CLI

```bash
npm install --global https://github.com/frdyx/rSEARCH/releases/download/v0.2.2/rsearch-0.2.2.tgz
rsearch doctor --provider claude
```

Use `--provider codex` to check Codex. Then provide a Markdown brief:

```bash
rsearch research --provider claude --brief-file question.md
```

Optional arguments:

```text
--repo <directory>           read-only repository context
--out <directory>            research store, outside the studied repository
--timeout-seconds <seconds>  1–3600; default 600
--model <model-id>           explicit provider-supported model override
```

By default, the worker carries the model choice from your provider settings.
Desktop model aliases are not necessarily supported by their CLI. A failure
does not trigger a fallback; supply a supported model explicitly when needed.
For Codex, check the CLI's `/model` picker for models available to your current
login. See the [official model documentation](https://learn.chatgpt.com/docs/models)
for model choices.

You can also download the source ZIP, extract it, and run `npm ci --omit=dev
--ignore-scripts` from its root. Use `node bin/rsearch.mjs` in place of the
global `rsearch` command. Download all package resources, not just `SKILL.md`.

## Claude Code plugin

Install the standalone runtime above, then add the GitHub marketplace:

```text
/plugin marketplace add frdyx/rSEARCH
/plugin install rsearch@frdyx-rsearch
```

Start a new session and invoke `/rsearch:rsearch-operator`, or ask a matching
research question. The skill defaults to native Claude in Claude Code. You can
explicitly request Codex if that CLI is installed.

Plugin installation makes instructions discoverable; it does not install the
global research command or authenticate a provider.

## Codex skill or plugin

Install the standalone runtime first. You can install the operator skill with
the built-in skill installer:

```text
$skill-installer install the rsearch-operator skill from frdyx/rSEARCH at skills/rsearch-operator
```

Start a new session and invoke `$rsearch-operator`. The skill defaults to native
Codex in Codex and requires the installed `rsearch` command.

For the packaged plugin, clone this repository and add it to a local
marketplace using the [official plugin guide](https://developers.openai.com/plugins/build/plugins).
The portable root `plugin.json` and Codex compatibility manifest are included.
Keep existing marketplace entries when adding this one. An example entry is:

```json
{
  "name": "rsearch",
  "source": { "source": "local", "path": "./plugins/rsearch" },
  "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
  "category": "Developer Tools"
}
```

The path is relative to your marketplace root; place the complete checkout
there or adjust the path. Restart the app, install from the local marketplace,
and start a new chat. The GitHub release is not an official directory listing.

## Claude Desktop

1. Install and authenticate Claude Code or Codex CLI.
2. Download [rsearch-0.2.2.mcpb](https://github.com/frdyx/rSEARCH/releases/download/v0.2.2/rsearch-0.2.2.mcpb).
3. In Claude Desktop, open **Settings → Extensions → Advanced settings → Install Extension**.
4. Choose the downloaded bundle. Enter `claude` or `codex` as the provider.
5. Leave the model override blank unless you need an explicit CLI-supported model.
6. Optionally configure a readable repository root. Without it, research is web-only.
7. Ask Claude to run rSEARCH's `doctor`, then research a focused question.

The bundle includes rSEARCH's production dependencies and uses the host's Node
runtime. It requires Node 22+ and a provider CLI on the environment's PATH.
It does not install or sign in to the provider for you.

rSEARCH works in Claude Desktop with either Claude or Codex as the research
provider. The provider you configure performs the research and returns a dossier
through the extension's tools.

Run doctor before your first brief. It reports the selected provider and
`modelOverride` (`null` when blank). After updating the extension, restart
Claude Desktop and open a new chat to load the new version.
If an override change is not reflected in doctor, reopen the extension's
configuration, enter the model value, save, restart Desktop and use a new chat.
Doctor verifies the configured override and installed CLI; it does not establish
model access. A live run checks that. If a model is rejected, choose one in your
provider CLI's current model picker and update the override explicitly.
Use the [official extension guide](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)
if your settings differ or your organization restricts extensions.

## Other local MCP clients

The server uses standard stdio MCP. Use a complete local checkout with its
production dependencies installed. Replace the paths in this example:

```json
{
  "mcpServers": {
    "rsearch": {
      "command": "node",
      "args": ["/absolute/path/to/rSEARCH/bin/rsearch.mjs", "mcp", "--provider", "claude"]
    }
  }
}
```

On Windows use a JSON path such as `C:/path/to/rSEARCH/bin/rsearch.mjs`.
Add `--read-root` followed by an existing directory to allow repository
context. Repeat it for more roots. Add `--model` for an explicit model override.

The five tools are `doctor`, `research_start`, `research_status`,
`research_read`, and `research_cancel`. Start returns a run ID immediately;
check progress at reasonable intervals and read results after completion.
Use a client that supports local stdio MCP servers and can launch Node.js.

## Uninstall

For the global CLI, run `npm uninstall --global rsearch`. Remove the skill or
plugin through the host's normal controls, or uninstall the desktop extension.
Saved dossiers remain in your research store; remove them separately if wanted.
