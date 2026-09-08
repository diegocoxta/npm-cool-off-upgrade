'use strict';

const { parseArgs, DEFAULT_DAYS, DEFAULT_TYPE } = require('../index');

describe('parseArgs', () => {
    it('returns the defaults when no flags are given', () => {
        expect(parseArgs([])).toEqual({
            days: DEFAULT_DAYS,
            type: DEFAULT_TYPE,
            ignore: []
        });
    });

    it('ignores positional arguments that are not flags', () => {
        expect(parseArgs(['check', 'now'])).toEqual({
            days: DEFAULT_DAYS,
            type: DEFAULT_TYPE,
            ignore: []
        });
    });

    it('parses the "--flag value" form', () => {
        expect(parseArgs(['--days', '14', '--type', 'minor'])).toMatchObject({
            days: 14,
            type: 'minor'
        });
    });

    it('parses the "--flag=value" form', () => {
        expect(parseArgs(['--days=30', '--type=patch'])).toMatchObject({
            days: 30,
            type: 'patch'
        });
    });

    it('accepts --days 0', () => {
        expect(parseArgs(['--days', '0']).days).toBe(0);
    });

    it('collects repeated --ignore flags', () => {
        expect(parseArgs(['--ignore', 'react', '--ignore', 'vue']).ignore).toEqual([
            'react',
            'vue'
        ]);
    });

    it('splits a comma-separated --ignore list and trims each name', () => {
        expect(parseArgs(['--ignore', ' react , react-dom ,vue ']).ignore).toEqual([
            'react',
            'react-dom',
            'vue'
        ]);
    });

    it('combines repeated and comma-separated --ignore values', () => {
        expect(parseArgs(['--ignore=a,b', '--ignore', 'c']).ignore).toEqual([
            'a',
            'b',
            'c'
        ]);
    });

    describe('invalid input', () => {
        let exitSpy;
        let errorSpy;

        beforeEach(() => {
            exitSpy = jest
                .spyOn(process, 'exit')
                .mockImplementation(() => {
                    throw new Error('process.exit');
                });
            errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        });

        afterEach(() => {
            exitSpy.mockRestore();
            errorSpy.mockRestore();
        });

        it('exits on a non-integer --days value', () => {
            expect(() => parseArgs(['--days', 'soon'])).toThrow('process.exit');
            expect(exitSpy).toHaveBeenCalledWith(1);
        });

        it('exits on a negative --days value', () => {
            expect(() => parseArgs(['--days', '-3'])).toThrow('process.exit');
            expect(exitSpy).toHaveBeenCalledWith(1);
        });

        it('exits on an unknown --type value', () => {
            expect(() => parseArgs(['--type', 'major'])).toThrow('process.exit');
            expect(exitSpy).toHaveBeenCalledWith(1);
        });
    });
});
