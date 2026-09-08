'use strict';

const {
    toParts,
    cleanVersion,
    isSemverGreater,
    getUpdateType
} = require('../index');

describe('toParts', () => {
    it('splits a version into numeric parts', () => {
        expect(toParts('1.2.3')).toEqual([1, 2, 3]);
    });

    it('treats non-numeric parts as 0', () => {
        expect(toParts('1.x.3')).toEqual([1, 0, 3]);
    });
});

describe('cleanVersion', () => {
    it.each([
        ['^1.2.3', '1.2.3'],
        ['~4.5.6', '4.5.6'],
        ['>=10.0.1', '10.0.1'],
        ['1.2.3', '1.2.3']
    ])('extracts %s -> %s', (input, expected) => {
        expect(cleanVersion(input)).toBe(expected);
    });

    it.each(['*', 'latest', 'workspace:*', 'file:../pkg', ''])(
        'returns null for the non-semver range "%s"',
        input => {
            expect(cleanVersion(input)).toBeNull();
        }
    );
});

describe('isSemverGreater', () => {
    it('is true when the first version is higher', () => {
        expect(isSemverGreater('1.2.4', '1.2.3')).toBe(true);
        expect(isSemverGreater('2.0.0', '1.9.9')).toBe(true);
        expect(isSemverGreater('1.3.0', '1.2.9')).toBe(true);
    });

    it('is false when the versions are equal or lower', () => {
        expect(isSemverGreater('1.2.3', '1.2.3')).toBe(false);
        expect(isSemverGreater('1.2.3', '1.2.4')).toBe(false);
    });

    it('is false for known invalid / missing values', () => {
        expect(isSemverGreater('Nenhuma', '1.0.0')).toBe(false);
        expect(isSemverGreater('Erro/Privado', '1.0.0')).toBe(false);
        expect(isSemverGreater('', '1.0.0')).toBe(false);
        expect(isSemverGreater('1.0.0', '')).toBe(false);
    });
});

describe('getUpdateType', () => {
    it('classifies a major bump as a breaking change', () => {
        expect(getUpdateType('1.2.3', '2.0.0')).toBe('breaking change');
    });

    it('classifies a minor bump as minor', () => {
        expect(getUpdateType('1.2.3', '1.3.0')).toBe('minor');
    });

    it('classifies a patch bump as patch', () => {
        expect(getUpdateType('1.2.3', '1.2.9')).toBe('patch');
    });
});
