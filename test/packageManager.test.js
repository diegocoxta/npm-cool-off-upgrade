'use strict';

const { describe, it, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
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
        assert.equal(detectFromPackageJson({ packageManager: 'pnpm@8.6.0' }), 'pnpm');
        assert.equal(detectFromPackageJson({ packageManager: 'yarn@4.1.0' }), 'yarn');
    });

    it('returns null for an unknown manager or a missing field', () => {
        assert.equal(detectFromPackageJson({ packageManager: 'rush@5' }), null);
        assert.equal(detectFromPackageJson({}), null);
        assert.equal(detectFromPackageJson(null), null);
    });
});

describe('detectFromLockFile', () => {
    afterEach(() => mock.restoreAll());

    it('maps a lock file to its package manager', () => {
        mock.method(fs, 'existsSync', file => file === path.join('/project', 'pnpm-lock.yaml'));
        assert.equal(detectFromLockFile('/project'), 'pnpm');
    });

    it('recognises yarn.lock', () => {
        mock.method(fs, 'existsSync', file => file === path.join('/project', 'yarn.lock'));
        assert.equal(detectFromLockFile('/project'), 'yarn');
    });

    it('returns null when no known lock file exists', () => {
        mock.method(fs, 'existsSync', () => false);
        assert.equal(detectFromLockFile('/project'), null);
    });
});

describe('detectPackageManager', () => {
    afterEach(() => mock.restoreAll());

    it('prefers the package.json field over a lock file', () => {
        mock.method(fs, 'existsSync', file => file === path.join('/project', 'package-lock.json'));
        assert.equal(
            detectPackageManager('/project', { packageManager: 'yarn@4.1.0' }),
            'yarn'
        );
    });

    it('falls back to the lock file when there is no field', () => {
        mock.method(fs, 'existsSync', file => file === path.join('/project', 'bun.lockb'));
        assert.equal(detectPackageManager('/project', {}), 'bun');
    });

    it('falls back to the default when nothing matches', () => {
        mock.method(fs, 'existsSync', () => false);
        assert.equal(detectPackageManager('/project', {}), DEFAULT_PACKAGE_MANAGER);
    });
});

describe('getCommands', () => {
    it('builds install commands for every supported manager', () => {
        assert.equal(getCommands('npm').install('a@1 b@2'), 'npm install a@1 b@2');
        assert.equal(getCommands('npm').installDev('a@1'), 'npm install -D a@1');

        assert.equal(getCommands('yarn').install('a@1'), 'yarn add a@1');
        assert.equal(getCommands('yarn').installDev('a@1'), 'yarn add -D a@1');

        assert.equal(getCommands('pnpm').install('a@1'), 'pnpm add a@1');
        assert.equal(getCommands('pnpm').installDev('a@1'), 'pnpm add -D a@1');

        assert.equal(getCommands('bun').install('a@1'), 'bun add a@1');
        assert.equal(getCommands('bun').installDev('a@1'), 'bun add -d a@1');
    });

    it('falls back to the default manager for an unknown name', () => {
        assert.equal(getCommands('rush').install('a@1'), 'npm install a@1');
    });
});
