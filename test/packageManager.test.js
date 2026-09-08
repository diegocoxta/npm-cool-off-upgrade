'use strict';

const fs = require('fs');
const path = require('path');

const {
    detectFromPackageJson,
    detectFromLockFile,
    detectPackageManager,
    getCommands,
    DEFAULT_PACKAGE_MANAGER
} = require('../index');

describe('detectFromPackageJson', () => {
    it('reads the name out of the "packageManager" field', () => {
        expect(detectFromPackageJson({ packageManager: 'pnpm@8.6.0' })).toBe('pnpm');
        expect(detectFromPackageJson({ packageManager: 'yarn@4.1.0' })).toBe('yarn');
    });

    it('returns null for an unknown manager or a missing field', () => {
        expect(detectFromPackageJson({ packageManager: 'rush@5' })).toBeNull();
        expect(detectFromPackageJson({})).toBeNull();
        expect(detectFromPackageJson(null)).toBeNull();
    });
});

describe('detectFromLockFile', () => {
    afterEach(() => jest.restoreAllMocks());

    it('maps a lock file to its package manager', () => {
        jest.spyOn(fs, 'existsSync').mockImplementation(
            file => file === path.join('/project', 'pnpm-lock.yaml')
        );

        expect(detectFromLockFile('/project')).toBe('pnpm');
    });

    it('recognises yarn.lock', () => {
        jest.spyOn(fs, 'existsSync').mockImplementation(
            file => file === path.join('/project', 'yarn.lock')
        );

        expect(detectFromLockFile('/project')).toBe('yarn');
    });

    it('returns null when no known lock file exists', () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(false);
        expect(detectFromLockFile('/project')).toBeNull();
    });
});

describe('detectPackageManager', () => {
    afterEach(() => jest.restoreAllMocks());

    it('prefers the package.json field over a lock file', () => {
        jest.spyOn(fs, 'existsSync').mockImplementation(
            file => file === path.join('/project', 'package-lock.json')
        );

        expect(
            detectPackageManager('/project', { packageManager: 'yarn@4.1.0' })
        ).toBe('yarn');
    });

    it('falls back to the lock file when there is no field', () => {
        jest.spyOn(fs, 'existsSync').mockImplementation(
            file => file === path.join('/project', 'bun.lockb')
        );

        expect(detectPackageManager('/project', {})).toBe('bun');
    });

    it('falls back to the default when nothing matches', () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(false);
        expect(detectPackageManager('/project', {})).toBe(DEFAULT_PACKAGE_MANAGER);
    });
});

describe('getCommands', () => {
    it('builds install commands for a known manager', () => {
        const pnpm = getCommands('pnpm');
        expect(pnpm.install('a@1 b@2')).toBe('pnpm add a@1 b@2');
        expect(pnpm.installDev('a@1')).toBe('pnpm add -D a@1');
    });

    it('falls back to the default manager for an unknown name', () => {
        expect(getCommands('rush').install('a@1')).toBe('npm install a@1');
    });
});
