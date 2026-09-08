# Contributing to cool-off-upgrade

Thanks for taking the time to contribute! This is a small project with no
runtime dependencies, so the process is intentionally lightweight.

## Getting started

1. Fork and clone the repository.
2. Make sure you have **Node.js 18 or newer** installed (`node --version`).
3. Install the dev dependencies (Jest, used only for the test suite):

   ```bash
   npm install
   ```

4. Run the CLI locally against any project that has a `package.json`:

   ```bash
   node /path/to/cool-off-upgrade/index.js --days 7
   ```

   Or link it globally while developing:

   ```bash
   npm link
   cool-off-upgrade --days 7
   ```

## Tests

The suite lives in `test/` and runs with Jest:

```bash
npm test
```

Add or update tests for any behavior you change. The CLI keeps its pure
functions exported from `index.js` so they can be tested in isolation; the
`index.js` entry point only runs when it is the main module.

## Reporting bugs

Open an issue that includes:

- what you ran (the exact command and options)
- what you expected to happen
- what actually happened (copy the full output)
- your Node.js version and OS

A minimal `package.json` that reproduces the problem is the fastest way to get
it fixed.

## Proposing changes

- Open an issue first for anything beyond a small fix, so we can agree on the
  approach before code is written.
- Keep the project free of **runtime** dependencies. New runtime dependencies
  will not be merged; dev-only tooling is fine.
- Match the existing style: `'use strict'`, 4-space indentation, small pure
  functions, and a short comment above each function explaining what it does.
- Keep user-facing strings (console output, table headers) in English.

## Pull requests

1. Create a branch off `main`.
2. Make your change, keeping the diff focused on a single concern.
3. Run `npm test` and make sure the suite passes.
4. Manually verify the CLI still works for the common cases:
   - a project with available upgrades
   - a project that is fully up to date
   - `--type patch` / `--type minor` filtering
   - `--ignore` with both repeated flags and a comma-separated list
   - each supported package manager (npm, yarn, pnpm, bun)
5. Update `README.md` if you changed behavior, options, or output.
6. Write a clear PR description explaining the motivation and the change.

## Commit messages

Write imperative, descriptive commit subjects (e.g. "Add --json output flag").
Keep unrelated changes in separate commits.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](./LICENSE.md).
