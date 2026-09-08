# cool-off-upgrade

A tiny CLI that tells you which of your dependencies have a **stable** upgrade
available — but only counts versions that have been public long enough to be
trusted.

Fresh releases are where regressions, broken builds and supply-chain incidents
tend to show up. `cool-off-upgrade` applies a **cool-off period**: a new version
is only suggested once it has been on the npm registry for at least N days
(7 by default).

**Zero dependencies.** Nothing is installed to run it, and nothing is installed
to test it — just Node's standard library.

## Requirements

- Node.js **18 or newer** (uses the built-in `fetch`)

## Installation

This package is not published to npm. Install it straight from the Git repo.

Global install (adds the `cool-off-upgrade` command):

```bash
npm install -g github:diegocoxta/npm-cool-off-upgrade
```

As a dev dependency in a project:

```bash
npm install -D github:diegocoxta/npm-cool-off-upgrade
```

Run once without installing:

```bash
npx github:diegocoxta/npm-cool-off-upgrade
```

Or clone and run it directly:

```bash
git clone https://github.com/diegocoxta/npm-cool-off-upgrade.git
node npm-cool-off-upgrade/index.js
```

## Usage

Run it from the root of a project that has a `package.json`:

```bash
cool-off-upgrade [options]
```

It reads `dependencies` and `devDependencies`, checks each package against the
npm registry, and prints a Markdown table of the upgrades that clear the
cool-off period, followed by ready-to-paste install commands using the exact
versions.

### Options

| Option              | Default | Description                                                                                     |
| ------------------- | ------- | --------------------------------------------------------------------------------------------- |
| `--days <n>`        | `7`     | Cool-off period in days. A version is only considered if it was published more than `n` days ago. `0` disables the cool-off. |
| `--type <type>`     | `all`   | Which upgrades to show: `all` (major + minor + patch), `minor` (minor + patch), or `patch`. |
| `--ignore <names>`  | —       | Package names to skip. Repeatable, and also accepts a comma-separated list.                     |

Both `--flag value` and `--flag=value` forms are accepted.

### Examples

```bash
# Default: 7-day cool-off, every update type
cool-off-upgrade

# Only patch updates that have been public for at least 14 days
cool-off-upgrade --days 14 --type patch

# Skip a few packages
cool-off-upgrade --ignore react,react-dom --ignore typescript
```

### Example output

```
🔧 Package manager: pnpm
⏳ Cool-off period: 7 day(s)
🔎 Type filter: all

| package name  | local version | remote version | remote version release date | type  |
| ------------- | ------------- | -------------- | --------------------------- | ----- |
| lodash        | 4.17.20       | 4.17.21        | 2021-02-20                  | patch |
| zod           | 3.22.4        | 3.23.8         | 2024-05-06                  | minor |
| vite          | 4.5.0         | 5.4.2          | 2024-08-20                  | major |

======================================================
💡 Run the command(s) below to upgrade (exact versions)
======================================================

# dependencies
pnpm add lodash@4.17.21 zod@3.23.8

# devDependencies
pnpm add -D vite@5.4.2
```

## How it works

1. Parses the CLI options and reads `package.json` from the current directory.
2. Detects the package manager, in priority order:
   - the `packageManager` field in `package.json` (e.g. `"pnpm@8.6.0"`)
   - a known lock file (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lockb`, …)
   - falls back to `npm`
3. For each dependency, fetches the package metadata from
   `https://registry.npmjs.org` and picks the newest **stable** version
   (no pre-release tag) that was published more than `--days` days ago.
4. Keeps only packages where that version is greater than the one in your
   `package.json`, classifies the jump as `major` / `minor` / `patch`, and
   filters by `--type`.
5. Prints the table and the install commands.

The tool never edits your `package.json` or runs an install — it only reports
and prints the commands for you to run.

## Development

There is no `npm install` step — the test suite lives in `test/` and runs on
Node's built-in test runner:

```bash
npm test          # node --test
npm run coverage  # node --test with coverage, enforced at 100%
```

`index.js` exports its pure functions so they can be tested in isolation; the
CLI only runs when the file is executed directly. `npm test` works on Node 18+;
`npm run coverage` needs Node 22+ for the coverage thresholds.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE.md) © Diego Costa
