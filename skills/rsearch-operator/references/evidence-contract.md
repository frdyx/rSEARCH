# Evidence rules

The provider's recorded events establish retrieval activity. Findings carry a
claim, source, source kind, proposed tier, falsifier and limitations. The
verifier derives source-origin groups and assigns the final evidence level.

| Level | Meaning in v0.2.0 |
|---|---|
| T1_proposed | No usable source origin was established. |
| T3_observed | Cited evidence without independent-channel corroboration. |
| T4_corroborated | Matching claim across different provider channels and at least two source-origin groups. |
| T5_verified | Never assigned automatically. |

An existing local file is observed context, not a verified measurement.
Registrable domains approximate origins: subdomains of one publisher collapse,
while public suffixes such as `.co.uk` are handled correctly. Syndicated material
on different domains may still share an origin; humans must assess that.

The gate counts successful completed retrieval operations, not distinct sources.
Two operations against the same publisher pass the activity floor but do not
create corroboration. Repeated events with the same operation ID count once.
Different run IDs on one provider do not create another channel.

Provider logs and their digests are inspectable provenance, not cryptographic
proof against a person modifying the entire store. No stage automatically
proves the truth of a claim or that a cited page supports it.
