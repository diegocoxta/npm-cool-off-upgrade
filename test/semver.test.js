'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    toParts,
    cleanVersion,
    isSemverGreater,
    getUpdateType
} = require('../index');

describe('toParts', () => {
    it('splits a version into numeric parts', () => {
        assert.deepEqual(toParts('1.2.3'), [1, 2, 3]);
    });

    it('treats non-numeric parts as 0', () => {
        assert.deepEqual(toParts('1.x.3'), [1, 0, 3]);
    });
});

describe('cleanVersion', () => {
    for (const [input, expected] of [
        ['^1.2.3', '1.2.3'],
        ['~4.5.6', '4.5.6'],
        ['>=10.0.1', '10.0.1'],
        ['1.2.3', '1.2.3']
    ]) {
        it(`extracts ${input} -> ${expected}`, () => {
            assert.equal(cleanVersion(input), expected);
        });
    }

    for (const input of ['*', 'latest', 'workspace:*', 'file:../pkg', '']) {
        it(`returns null for the non-semver range "${input}"`, () => {
            assert.equal(cleanVersion(input), null);
        });
    }
});

describe('isSemverGreater', () => {
    it('is true when the first version is higher', () => {
        assert.equal(isSemverGreater('1.2.4', '1.2.3'), true);
        assert.equal(isSemverGreater('2.0.0', '1.9.9'), true);
        assert.equal(isSemverGreater('1.3.0', '1.2.9'), true);
    });

    it('is false when the versions are equal or lower', () => {
        assert.equal(isSemverGreater('1.2.3', '1.2.3'), false);
        assert.equal(isSemverGreater('1.2.3', '1.2.4'), false);
    });

    it('compares parts of differing length', () => {
        assert.equal(isSemverGreater('1.2.0.1', '1.2'), true);
        assert.equal(isSemverGreater('1.2', '1.2.0.1'), false);
    });

    it('is false for known invalid / missing values', () => {
        assert.equal(isSemverGreater('Nenhuma', '1.0.0'), false);
        assert.equal(isSemverGreater('Erro/Privado', '1.0.0'), false);
        assert.equal(isSemverGreater('', '1.0.0'), false);
        assert.equal(isSemverGreater('1.0.0', ''), false);
    });
});

describe('getUpdateType', () => {
    it('classifies a major bump as major', () => {
        assert.equal(getUpdateType('1.2.3', '2.0.0'), 'major');
    });

    it('classifies a minor bump as minor', () => {
        assert.equal(getUpdateType('1.2.3', '1.3.0'), 'minor');
    });

    it('classifies a patch bump as patch', () => {
        assert.equal(getUpdateType('1.2.3', '1.2.9'), 'patch');
    });
});
