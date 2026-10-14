# Data handling

rSEARCH runs locally, saves results locally, and invokes the provider you choose.
It is not an offline model or a guarantee that data stays on your computer.

- The provider receives the brief and context its permitted tools read.
- Web queries and fetches go through that provider's tools and policies.
- CLI authentication stays with the installed provider. The toolkit does not
  ask for credentials or copy them into its configuration.
- The research store contains submitted briefs, findings, citations, event
  logs and diagnostic output. Those can contain sensitive queries or context.
- No telemetry endpoint is configured by rSEARCH. Its dependencies and chosen
  provider follow their own behaviour and terms.

Review logs before sharing them in issues. Remove account details, private
paths, sensitive source content and queries that should not be public. The
repository's live-smoke fixtures omit provider initialization, session details,
reasoning and retrieved page bodies while retaining the necessary event shapes.

The worker treats web page instructions as untrusted data. That is a workflow
boundary supported by provider restrictions, not a claim that all prompt
injection attacks are impossible.
