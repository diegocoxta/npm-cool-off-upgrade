'use strict';

const { describe, it, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const { parseArgs, DEFAULT_DAYS, DEFAULT_TYPE } = require('../index');

describe('parseArgs', () => {
    it('returns the defaults when no flags are given', () => {
        assert.deepEqual(parseArgs([]), {
            days: DEFAULT_DAYS,
            type: DEFAULT_TYPE,
            ignore: []
        });
    });

    it('ignores positional arguments that are not flags', () => {
        assert.deepEqual(parseArgs(['check', 'now']), {
            days: DEFAULT_DAYS,
            type: DEFAULT_TYPE,
            ignore: []
        });
    });

    it('parses the "--flag value" form', () => {
        const parsed = parseArgs(['--days', '14', '--type', 'minor']);
        assert.equal(parsed.days, 14);
        assert.equal(parsed.type, 'minor');
    });

    it('parses the "--flag=value" form', () => {
        const parsed = parseArgs(['--days=30', '--type=patch']);
        assert.equal(parsed.days, 30);
        assert.equal(parsed.type, 'patch');
    });

    it('accepts --days 0', () => {
        assert.equal(parseArgs(['--days', '0']).days, 0);
    });

    it('collects repeated --ignore flags', () => {
        assert.deepEqual(parseArgs(['--ignore', 'react', '--ignore', 'vue']).ignore, [
            'react',
            'vue'
        ]);
    });

    it('splits a comma-separated --ignore list and trims each name', () => {
        assert.deepEqual(parseArgs(['--ignore', ' react , react-dom ,vue ']).ignore, [
            'react',
            'react-dom',
            'vue'
        ]);
    });

    it('combines repeated and comma-separated --ignore values', () => {
        assert.deepEqual(parseArgs(['--ignore=a,b', '--ignore', 'c']).ignore, [
            'a',
            'b',
            'c'
        ]);
    });

    it('drops an --ignore flag with no value', () => {
        assert.deepEqual(parseArgs(['--ignore']).ignore, []);
    });

    describe('invalid input', () => {
        afterEach(() => mock.restoreAll());

        function stubExit() {
            mock.method(console, 'error', () => {});
            return mock.method(process, 'exit', () => {
                throw new Error('process.exit');
            });
        }

        it('exits on a non-integer --days value', () => {
            const exit = stubExit();
            assert.throws(() => parseArgs(['--days', 'soon']), /process\.exit/);
            assert.deepEqual(exit.mock.calls[0].arguments, [1]);
        });

        it('exits on a negative --days value', () => {
            const exit = stubExit();
            assert.throws(() => parseArgs(['--days', '-3']), /process\.exit/);
            assert.deepEqual(exit.mock.calls[0].arguments, [1]);
        });

        it('exits on an unknown --type value', () => {
            const exit = stubExit();
            assert.throws(() => parseArgs(['--type', 'major']), /process\.exit/);
            assert.deepEqual(exit.mock.calls[0].arguments, [1]);
        });
    });
});
