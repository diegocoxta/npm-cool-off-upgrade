'use strict';

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

        expect(lines).toHaveLength(3);
        expect(lines[0]).toContain('package name');
        expect(lines[0]).toContain('remote version release date');
        expect(lines[1]).toMatch(/^\| -+ \| -+ \| -+ \| -+ \| -+ \|$/);
        expect(lines[2]).toContain('lodash');
        expect(lines[2]).toContain('4.17.21');
    });

    it('keeps every row the same width as the header', () => {
        const lines = renderTable([
            ROW,
            { ...ROW, name: 'a-much-longer-package-name', type: 'breaking change' }
        ]).split('\n');

        const width = lines[0].length;
        for (const line of lines) {
            expect(line.length).toBe(width);
        }
    });

    it('pads a column to fit its widest value', () => {
        const table = renderTable([{ ...ROW, type: 'breaking change' }]);
        // "breaking change" is wider than the "type" header, so the header cell
        // for that column is padded out to 15 characters.
        expect(table).toContain('| type            |');
    });
});
