'use strict';

const { describe, it, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const { getPackageData, getLatestStableOverDays } = require('../index');

function isoDaysAgo(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
}

describe('getPackageData', () => {
    afterEach(() => {
        mock.restoreAll();
    });

    it('returns the parsed body when the response is ok', async () => {
        const body = { name: 'lodash' };
        const fetchMock = mock.method(global, 'fetch', async () => ({
            ok: true,
            json: async () => body
        }));

        assert.deepEqual(await getPackageData('lodash'), body);
        assert.deepEqual(fetchMock.mock.calls[0].arguments, [
            'https://registry.npmjs.org/lodash'
        ]);
    });

    it('returns null when the response is not ok', async () => {
        mock.method(global, 'fetch', async () => ({ ok: false }));
        assert.equal(await getPackageData('nope'), null);
    });

    it('returns null when fetch rejects', async () => {
        mock.method(global, 'fetch', async () => {
            throw new Error('network');
        });
        assert.equal(await getPackageData('offline'), null);
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

        assert.deepEqual(getLatestStableOverDays(time, 7), {
            version: '1.2.0',
            date: new Date(time['1.2.0']).toISOString().split('T')[0]
        });
    });

    it('ignores pre-release versions', () => {
        const time = {
            '1.0.0': isoDaysAgo(40),
            '2.0.0-rc.1': isoDaysAgo(30)
        };

        assert.equal(getLatestStableOverDays(time, 7).version, '1.0.0');
    });

    it('returns null when every version is inside the cool-off window', () => {
        const time = {
            '1.0.0': isoDaysAgo(3),
            '1.1.0': isoDaysAgo(1)
        };

        assert.equal(getLatestStableOverDays(time, 7), null);
    });

    it('formats the release date as YYYY-MM-DD', () => {
        const time = { '1.0.0': '2021-02-20T10:15:00.000Z' };
        assert.equal(getLatestStableOverDays(time, 0).date, '2021-02-20');
    });
});
