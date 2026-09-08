#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

// ============================================================================
// CLI arguments
// ============================================================================

const DEFAULT_DAYS = 7;
const DEFAULT_TYPE = 'all';
const VALID_TYPES = ['all', 'minor', 'patch'];

// Which update types each --type value lets through.
const TYPE_FILTERS = {
    all: ['major', 'minor', 'patch'],
    minor: ['minor', 'patch'],
    patch: ['patch']
};

// Parses `--flag value` and `--flag=value` from an argv array.
// `--ignore` is repeatable and also accepts a comma-separated list.
function parseArgs(argv) {
    const parsed = { days: DEFAULT_DAYS, type: DEFAULT_TYPE, ignore: [] };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (!arg.startsWith('--')) continue;

        let key;
        let value;
        if (arg.includes('=')) {
            [key, value] = arg.slice(2).split('=');
        } else {
            key = arg.slice(2);
            value = argv[i + 1];
            i++;
        }

        if (key === 'days') {
            const n = Number(value);
            if (!Number.isInteger(n) || n < 0) {
                console.error(`❌ Invalid --days value: "${value}". Expected a non-negative integer.`);
                process.exit(1);
            }
            parsed.days = n;
        } else if (key === 'type') {
            if (!VALID_TYPES.includes(value)) {
                console.error(`❌ Invalid --type value: "${value}". Expected one of: ${VALID_TYPES.join(', ')}.`);
                process.exit(1);
            }
            parsed.type = value;
        } else if (key === 'ignore') {
            const names = String(value || '')
                .split(',')
                .map(name => name.trim())
                .filter(Boolean);
            parsed.ignore.push(...names);
        }
    }

    return parsed;
}

// ============================================================================
// SemVer helpers
// ============================================================================

const INVALID_VERSIONS = ['Nenhuma', 'Erro/Privado', '-', ''];

function toParts(version) {
    return String(version).split('.').map(part => parseInt(part, 10) || 0);
}

// Extracts a clean "x.y.z" from a package.json range ("^1.2.3", "~1.2.3", ">=1.2.3").
function cleanVersion(raw) {
    const match = String(raw).match(/\d+\.\d+\.\d+/);
    return match ? match[0] : null;
}

// Returns true when v1 is strictly greater than v2.
function isSemverGreater(v1, v2) {
    if (INVALID_VERSIONS.includes(v1) || !v1 || !v2) return false;

    const v1Parts = toParts(v1);
    const v2Parts = toParts(v2);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
        const p1 = v1Parts[i] || 0;
        const p2 = v2Parts[i] || 0;
        if (p1 > p2) return true;
        if (p1 < p2) return false;
    }
    return false;
}

// Classifies an upgrade from `local` to `remote` (assumes remote > local).
// major changed -> "major"; minor changed -> "minor"; otherwise -> "patch".
function getUpdateType(local, remote) {
    const [localMajor, localMinor] = toParts(local);
    const [remoteMajor, remoteMinor] = toParts(remote);

    if (remoteMajor > localMajor) return 'major';
    if (remoteMajor === localMajor && remoteMinor > localMinor) return 'minor';
    return 'patch';
}

// ============================================================================
// NPM registry
// ============================================================================

// Fetches a package's metadata. Returns null on error or private package.
async function getPackageData(packageName) {
    try {
        const response = await fetch(`https://registry.npmjs.org/${packageName}`);
        if (!response.ok) throw new Error('Package not found or private');
        return await response.json();
    } catch (e) {
        return null;
    }
}

// Finds the most recent stable version published more than `days` days ago.
// Returns { version, date } (date as YYYY-MM-DD) or null.
function getLatestStableOverDays(timeObj, days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const candidates = Object.keys(timeObj)
        .filter(key => key !== 'modified' && key !== 'created')
        .filter(version => !version.includes('-'))
        .filter(version => new Date(timeObj[version]) <= cutoff)
        .sort((a, b) => new Date(timeObj[b]) - new Date(timeObj[a]));

    if (candidates.length === 0) return null;

    const version = candidates[0];
    return {
        version,
        date: new Date(timeObj[version]).toISOString().split('T')[0]
    };
}

// ============================================================================
// Package manager detection
// ============================================================================

// Supported managers: which lock file identifies each one and how they build
// the install command for dependencies and devDependencies.
const PACKAGE_MANAGERS = {
    npm: {
        lockFiles: ['package-lock.json', 'npm-shrinkwrap.json'],
        install: pkgs => `npm install ${pkgs}`,
        installDev: pkgs => `npm install -D ${pkgs}`
    },
    yarn: {
        lockFiles: ['yarn.lock'],
        install: pkgs => `yarn add ${pkgs}`,
        installDev: pkgs => `yarn add -D ${pkgs}`
    },
    pnpm: {
        lockFiles: ['pnpm-lock.yaml'],
        install: pkgs => `pnpm add ${pkgs}`,
        installDev: pkgs => `pnpm add -D ${pkgs}`
    },
    bun: {
        lockFiles: ['bun.lockb', 'bun.lock'],
        install: pkgs => `bun add ${pkgs}`,
        installDev: pkgs => `bun add -d ${pkgs}`
    }
};

const DEFAULT_PACKAGE_MANAGER = 'npm';

// Reads the "packageManager" field from package.json (e.g. "pnpm@8.6.0" -> "pnpm").
function detectFromPackageJson(pkg) {
    if (!pkg || typeof pkg.packageManager !== 'string') return null;
    const name = pkg.packageManager.split('@')[0].trim();
    return PACKAGE_MANAGERS[name] ? name : null;
}

// Looks for a known lock file in the given directory.
function detectFromLockFile(cwd) {
    for (const [name, config] of Object.entries(PACKAGE_MANAGERS)) {
        if (config.lockFiles.some(file => fs.existsSync(path.join(cwd, file)))) {
            return name;
        }
    }
    return null;
}

// Resolves the package manager in use.
// Priority: package.json "packageManager" field > lock file > npm (default).
function detectPackageManager(cwd, pkg) {
    return (
        detectFromPackageJson(pkg) ||
        detectFromLockFile(cwd) ||
        DEFAULT_PACKAGE_MANAGER
    );
}

function getCommands(name) {
    return PACKAGE_MANAGERS[name] || PACKAGE_MANAGERS[DEFAULT_PACKAGE_MANAGER];
}

// ============================================================================
// Dependency analysis
// ============================================================================

// Analyzes a set of dependencies and returns one row per package that has a
// stable upgrade available within the cool-off period. Packages listed in
// `ignore` (a Set of names) are skipped entirely.
async function analyzeDependencies(deps, section, days, ignore) {
    if (!deps || Object.keys(deps).length === 0) return [];

    const results = [];

    for (const [name, rawVersion] of Object.entries(deps)) {
        if (ignore.has(name)) continue;

        const localVersion = cleanVersion(rawVersion);
        if (!localVersion) {
            console.warn(`⚠️  Skipping ${name} (non-semver range "${rawVersion}").`);
            continue;
        }

        const data = await getPackageData(name);
        if (!data || !data.time) {
            console.warn(`⚠️  Skipping ${name} (not found or private).`);
            continue;
        }

        const latest = getLatestStableOverDays(data.time, days);
        if (!latest || !isSemverGreater(latest.version, localVersion)) continue;

        results.push({
            name,
            localVersion,
            remoteVersion: latest.version,
            remoteReleaseDate: latest.date,
            type: getUpdateType(localVersion, latest.version),
            section
        });
    }

    return results;
}

// ============================================================================
// Output rendering
// ============================================================================

const TABLE_COLUMNS = [
    ['package name', row => row.name],
    ['local version', row => row.localVersion],
    ['remote version', row => row.remoteVersion],
    ['remote version release date', row => row.remoteReleaseDate],
    ['type', row => row.type]
];

// Renders the results as a single Markdown table.
function renderTable(rows) {
    const headers = TABLE_COLUMNS.map(([label]) => label);
    const body = rows.map(row => TABLE_COLUMNS.map(([, get]) => String(get(row))));

    const widths = headers.map((header, i) =>
        Math.max(header.length, ...body.map(cells => cells[i].length))
    );

    const formatRow = cells =>
        '| ' + cells.map((cell, i) => cell.padEnd(widths[i])).join(' | ') + ' |';

    const separator =
        '| ' + widths.map(width => '-'.repeat(width)).join(' | ') + ' |';

    return [formatRow(headers), separator, ...body.map(formatRow)].join('\n');
}

// Prints the install commands using the exact versions listed in the table.
// One command per group (dependencies / devDependencies), merging groups when
// the package manager uses the exact same command for both.
function printUpdateCommands(commands, depRows, devDepRows) {
    const groups = [];
    if (depRows.length > 0) {
        groups.push({ label: 'dependencies', build: commands.install, rows: depRows });
    }
    if (devDepRows.length > 0) {
        groups.push({ label: 'devDependencies', build: commands.installDev, rows: devDepRows });
    }
    if (groups.length === 0) return;

    const merged = [];
    for (const group of groups) {
        const probe = group.build('<pkgs>');
        const existing = merged.find(m => m.build('<pkgs>') === probe);
        if (existing) {
            existing.rows = existing.rows.concat(group.rows);
            existing.label += ` + ${group.label}`;
        } else {
            merged.push({ ...group });
        }
    }

    console.log('\n======================================================');
    console.log('💡 Run the command(s) below to upgrade (exact versions)');
    console.log('======================================================\n');

    for (const group of merged) {
        const pkgs = group.rows.map(r => `${r.name}@${r.remoteVersion}`).join(' ');
        console.log(`# ${group.label}`);
        console.log(`${group.build(pkgs)}\n`);
    }
}

// ============================================================================
// Entry point
// ============================================================================

// Reads package.json from the given directory or exits with an error.
function readPackageJson(cwd) {
    const pkgPath = path.resolve(cwd, 'package.json');

    if (!fs.existsSync(pkgPath)) {
        console.error('❌ Error: package.json not found in the current directory.');
        process.exit(1);
    }

    try {
        return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    } catch (error) {
        console.error('❌ Error reading package.json:', error.message);
        process.exit(1);
    }
}

async function run() {
    const { days, type, ignore } = parseArgs(process.argv.slice(2));
    const cwd = process.cwd();
    const pkg = readPackageJson(cwd);

    const packageManager = detectPackageManager(cwd, pkg);
    const commands = getCommands(packageManager);
    const ignoreSet = new Set(ignore);

    console.log(`🔧 Package manager: ${packageManager}`);
    console.log(`⏳ Cool-off period: ${days} day(s)`);
    console.log(`🔎 Type filter: ${type}`);
    if (ignoreSet.size > 0) {
        console.log(`🚫 Ignored packages: ${[...ignoreSet].join(', ')}`);
    }

    const allowedTypes = TYPE_FILTERS[type];
    const filterByType = rows => rows.filter(r => allowedTypes.includes(r.type));

    // dependencies first, devDependencies after — a single table.
    const depRows = filterByType(await analyzeDependencies(pkg.dependencies, 'dependencies', days, ignoreSet));
    const devDepRows = filterByType(await analyzeDependencies(pkg.devDependencies, 'devDependencies', days, ignoreSet));
    const rows = [...depRows, ...devDepRows];

    if (rows.length === 0) {
        console.log('\n✅ Everything is up to date for the given cool-off period and type filter.\n');
        return;
    }

    console.log(`\n${renderTable(rows)}\n`);
    printUpdateCommands(commands, depRows, devDepRows);
}

/* node:coverage disable */
if (require.main === module) {
    run().catch(error => {
        console.error('❌ Unexpected error:', error.message);
        process.exit(1);
    });
}
/* node:coverage enable */

module.exports = {
    parseArgs,
    toParts,
    cleanVersion,
    isSemverGreater,
    getUpdateType,
    getPackageData,
    getLatestStableOverDays,
    detectFromPackageJson,
    detectFromLockFile,
    detectPackageManager,
    getCommands,
    analyzeDependencies,
    renderTable,
    printUpdateCommands,
    readPackageJson,
    run,
    PACKAGE_MANAGERS,
    DEFAULT_PACKAGE_MANAGER,
    TYPE_FILTERS,
    DEFAULT_DAYS,
    DEFAULT_TYPE,
    VALID_TYPES
};
