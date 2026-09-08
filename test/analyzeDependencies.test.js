'use strict';

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
        json: () =>
            Promise.resolve({
                time: {
                    created: isoDaysAgo(999),
                    '0.9.0': isoDaysAgo(400),
                    [version]: isoDaysAgo(days)
                }
            })
    };
}

describe('analyzeDependencies', () => {
    let warnSpy;

    beforeEach(() => {
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete global.fetch;
    });

    it('returns an empty array for missing or empty deps', async () => {
        await expect(analyzeDependencies(undefined, 'dependencies', 7, new Set()))
            .resolves.toEqual([]);
        await expect(analyzeDependencies({}, 'dependencies', 7, new Set()))
            .resolves.toEqual([]);
    });

    it('reports a package that has an upgrade past the cool-off window', async () => {
        global.fetch = jest.fn().mockResolvedValue(registryPayload('1.5.0', 30));

        const rows = await analyzeDependencies(
            { lodash: '^1.2.3' },
            'dependencies',
            7,
            new Set()
        );

        expect(rows).toEqual([
            {
                name: 'lodash',
                localVersion: '1.2.3',
                remoteVersion: '1.5.0',
                remoteReleaseDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
                type: 'minor',
                section: 'dependencies'
            }
        ]);
    });

    it('skips packages listed in the ignore set', async () => {
        global.fetch = jest.fn().mockResolvedValue(registryPayload('9.0.0', 30));

        const rows = await analyzeDependencies(
            { lodash: '^1.2.3' },
            'dependencies',
            7,
            new Set(['lodash'])
        );

        expect(rows).toEqual([]);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('skips non-semver ranges with a warning', async () => {
        global.fetch = jest.fn();

        const rows = await analyzeDependencies(
            { local: 'workspace:*' },
            'dependencies',
            7,
            new Set()
        );

        expect(rows).toEqual([]);
        expect(global.fetch).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalled();
    });

    it('skips packages that cannot be fetched', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: false });

        const rows = await analyzeDependencies(
            { private: '^1.0.0' },
            'dependencies',
            7,
            new Set()
        );

        expect(rows).toEqual([]);
        expect(warnSpy).toHaveBeenCalled();
    });

    it('does not report a package that is already up to date', async () => {
        global.fetch = jest.fn().mockResolvedValue(registryPayload('1.2.3', 30));

        const rows = await analyzeDependencies(
            { lodash: '^1.2.3' },
            'dependencies',
            7,
            new Set()
        );

        expect(rows).toEqual([]);
    });

    it('does not report an upgrade that is still inside the cool-off window', async () => {
        global.fetch = jest.fn().mockResolvedValue(registryPayload('2.0.0', 2));

        const rows = await analyzeDependencies(
            { lodash: '^1.2.3' },
            'dependencies',
            7,
            new Set()
        );

        expect(rows).toEqual([]);
    });
});
