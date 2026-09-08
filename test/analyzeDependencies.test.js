'use strict';

const { describe, it, mock, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const { analyzeDependencies } = require('../index');

function isoDaysAgo(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
}

// Builds a registry payload whose newest stable release is `version`,
// published `days` ago.
function registryPayload(version, days) {
    return {
        ok: true,
        json: async () => ({
            time: {
                created: isoDaysAgo(999),
                '0.9.0': isoDaysAgo(400),
                [version]: isoDaysAgo(days)
            }
        })
    };
}

describe('analyzeDependencies', () => {
    beforeEach(() => {
        mock.method(console, 'warn', () => {});
    });

    afterEach(() => {
        mock.restoreAll();
    });

    it('returns an empty array for missing or empty deps', async () => {
        assert.deepEqual(
            await analyzeDependencies(undefined, 'dependencies', 7, new Set()),
            []
        );
        assert.deepEqual(
            await analyzeDependencies({}, 'dependencies', 7, new Set()),
            []
        );
    });

    it('reports a package that has an upgrade past the cool-off window', async () => {
        mock.method(global, 'fetch', async () => registryPayload('1.5.0', 30));

        const rows = await analyzeDependencies(
            { lodash: '^1.2.3' },
            'dependencies',
            7,
            new Set()
        );

        assert.equal(rows.length, 1);
        assert.deepEqual(
            { ...rows[0], remoteReleaseDate: undefined },
            {
                name: 'lodash',
                localVersion: '1.2.3',
                remoteVersion: '1.5.0',
                remoteReleaseDate: undefined,
                type: 'minor',
                section: 'dependencies'
            }
        );
        assert.match(rows[0].remoteReleaseDate, /^\d{4}-\d{2}-\d{2}$/);
    });

    it('skips packages listed in the ignore set', async () => {
        const fetchMock = mock.method(global, 'fetch', async () =>
            registryPayload('9.0.0', 30)
        );

        const rows = await analyzeDependencies(
            { lodash: '^1.2.3' },
            'dependencies',
            7,
            new Set(['lodash'])
        );

        assert.deepEqual(rows, []);
        assert.equal(fetchMock.mock.callCount(), 0);
    });

    it('skips non-semver ranges with a warning', async () => {
        const fetchMock = mock.method(global, 'fetch', async () => {
            throw new Error('should not be called');
        });
        const warn = mock.method(console, 'warn', () => {});

        const rows = await analyzeDependencies(
            { local: 'workspace:*' },
            'dependencies',
            7,
            new Set()
        );

        assert.deepEqual(rows, []);
        assert.equal(fetchMock.mock.callCount(), 0);
        assert.equal(warn.mock.callCount(), 1);
    });

    it('skips packages that cannot be fetched', async () => {
        mock.method(global, 'fetch', async () => ({ ok: false }));
        const warn = mock.method(console, 'warn', () => {});

        const rows = await analyzeDependencies(
            { private: '^1.0.0' },
            'dependencies',
            7,
            new Set()
        );

        assert.deepEqual(rows, []);
        assert.equal(warn.mock.callCount(), 1);
    });

    it('skips packages whose metadata has no "time" map', async () => {
        mock.method(global, 'fetch', async () => ({ ok: true, json: async () => ({}) }));
        const warn = mock.method(console, 'warn', () => {});

        const rows = await analyzeDependencies(
            { weird: '^1.0.0' },
            'dependencies',
            7,
            new Set()
        );

        assert.deepEqual(rows, []);
        assert.equal(warn.mock.callCount(), 1);
    });

    it('does not report a package that is already up to date', async () => {
        mock.method(global, 'fetch', async () => registryPayload('1.2.3', 30));

        const rows = await analyzeDependencies(
            { lodash: '^1.2.3' },
            'dependencies',
            7,
            new Set()
        );

        assert.deepEqual(rows, []);
    });

    it('does not report an upgrade that is still inside the cool-off window', async () => {
        mock.method(global, 'fetch', async () => registryPayload('2.0.0', 2));

        const rows = await analyzeDependencies(
            { lodash: '^1.2.3' },
            'dependencies',
            7,
            new Set()
        );

        assert.deepEqual(rows, []);
    });
});
