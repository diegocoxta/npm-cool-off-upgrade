'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { renderTable } = require('../index');

const ROW = {
    name: 'lodash',
    localVersion: '4.17.20',
    remoteVersion: '4.17.21',
    remoteReleaseDate: '2021-02-20',
    type: 'patch'
};

describe('renderTable', () => {
    it('renders a header, a separator and one line per row', () => {
        const lines = renderTable([ROW]).split('\n');

        assert.equal(lines.length, 3);
        assert.ok(lines[0].includes('package name'));
        assert.ok(lines[0].includes('remote version release date'));
        assert.match(lines[1], /^\| -+ \| -+ \| -+ \| -+ \| -+ \|$/);
        assert.ok(lines[2].includes('lodash'));
        assert.ok(lines[2].includes('4.17.21'));
    });

    it('keeps every row the same width as the header', () => {
        const lines = renderTable([
            ROW,
            { ...ROW, name: 'a-much-longer-package-name', type: 'major' }
        ]).split('\n');

        const width = lines[0].length;
        for (const line of lines) {
            assert.equal(line.length, width);
        }
    });

    it('pads a column to fit its widest value', () => {
        const table = renderTable([{ ...ROW, type: 'major' }]);
        // "major" is wider than the "type" header, so that column's header
        // cell is padded out to 5 characters.
        assert.ok(table.includes('| type  |'));
    });
});
