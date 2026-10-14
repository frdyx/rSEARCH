# Prepare a release

Use Node.js 22+ and the committed dependency lockfile. The release is distributed
through GitHub, not the npm registry or an official plugin directory.

```bash
npm ci --ignore-scripts
npm test
npm run check
npm run build:desktop
npm run build:release
node scripts/check-clean-install.mjs
```

Build outputs in `dist/`:

- `rsearch-<version>.tgz`: versioned npm-installable runtime and package resources.
- `rsearch-<version>-source.zip`: full source, tests, docs and assets without local data.
- `rsearch-<version>.mcpb`: local desktop extension with production dependencies.
- `SHA256SUMS.txt`: archive checksums.

The desktop builder validates the upstream MCPB 0.3 manifest schema and packs
a standard ZIP with only production dependencies. No signing key is required.
The archive is unsigned; organization policies may require signed extensions.

Run live provider checks deliberately: they use normal provider usage. Review
and sanitize any new event fixture before committing it. Keep release copy
focused on the workflow, setup and changes users need. Publish updates under a
new version rather than replacing historical release archives.

Before publishing, inspect source/package contents for private material, run the
CI matrix, check README rendering, and verify release URLs. Attach the four
release files to the matching version tag. The GitHub social image is
`assets/social-preview.png` and can be set in repository settings.
