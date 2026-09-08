'use strict';

const { getPackageData, getLatestStableOverDays } = require('../index');

function isoDaysAgo(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
}

describe('getPackageData', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        delete global.fetch;
    });

    it('returns the parsed body when the response is ok', async () => {
        const body = { name: 'lodash' };
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(body)
        });

        await expect(getPackageData('lodash')).resolves.toEqual(body);
        expect(global.fetch).toHaveBeenCalledWith(
            'https://registry.npmjs.org/lodash'
        );
    });

    it('returns null when the response is not ok', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: false });
        await expect(getPackageData('nope')).resolves.toBeNull();
    });

    it('returns null when fetch rejects', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('network'));
        await expect(getPackageData('offline')).resolves.toBeNull();
    });
});

describe('getLatestStableOverDays', () => {
    it('picks the newest stable version older than the cool-off window', () => {
        const time = {
            created: isoDaysAgo(1000),
            modified: isoDaysAgo(1),
            '1.0.0': isoDaysAgo(100),
            '1.1.0': isoDaysAgo(30),
            '1.2.0': isoDaysAgo(10),
            '1.3.0': isoDaysAgo(2)
        };

        expect(getLatestStableOverDays(time, 7)).toEqual({
            version: '1.2.0',
            date: new Date(time['1.2.0']).toISOString().split('T')[0]
        });
    });

    it('ignores pre-release versions', () => {
        const time = {
            '1.0.0': isoDaysAgo(40),
            '2.0.0-rc.1': isoDaysAgo(30)
        };

        expect(getLatestStableOverDays(time, 7).version).toBe('1.0.0');
    });

    it('returns null when every version is inside the cool-off window', () => {
        const time = {
            '1.0.0': isoDaysAgo(3),
            '1.1.0': isoDaysAgo(1)
        };

        expect(getLatestStableOverDays(time, 7)).toBeNull();
    });

    it('formats the release date as YYYY-MM-DD', () => {
        const time = { '1.0.0': '2021-02-20T10:15:00.000Z' };
        expect(getLatestStableOverDays(time, 0).date).toBe('2021-02-20');
    });
});
