'use strict';

const { describe, it, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const {
    printUpdateCommands,
    readPackageJson,
    run,
    getCommands
} = require('../index');

function isoDaysAgo(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
}

function captureLog() {
    const log = mock.method(console, 'log', () => {});
    return () => log.mock.calls.map(call => String(call.arguments[0])).join('\n');
}

describe('printUpdateCommands', () => {
    afterEach(() => mock.restoreAll());

    const depRows = [{ name: 'lodash', remoteVersion: '4.17.21' }];
    const devRows = [{ name: 'chalk', remoteVersion: '5.3.0' }];

    it('prints nothing when there is no work to do', () => {
        const output = captureLog();
        printUpdateCommands(getCommands('npm'), [], []);
        assert.equal(output(), '');
    });

    it('prints only the dependencies group', () => {
        const output = captureLog();
        printUpdateCommands(getCommands('npm'), depRows, []);
        const text = output();
        assert.ok(text.includes('# dependencies'));
        assert.ok(text.includes('npm install lodash@4.17.21'));
        assert.ok(!text.includes('devDependencies'));
    });

    it('prints only the devDependencies group', () => {
        const output = captureLog();
        printUpdateCommands(getCommands('npm'), [], devRows);
        const text = output();
        assert.ok(text.includes('# devDependencies'));
        assert.ok(text.includes('npm install -D chalk@5.3.0'));
    });

    it('keeps the two groups separate when the commands differ', () => {
        const output = captureLog();
        printUpdateCommands(getCommands('npm'), depRows, devRows);
        const text = output();
        assert.ok(text.includes('# dependencies'));
        assert.ok(text.includes('# devDependencies'));
        assert.ok(!text.includes('dependencies + devDependencies'));
    });

    it('merges the groups when both build the same command', () => {
        const output = captureLog();
        const sameCommand = { install: p => `x add ${p}`, installDev: p => `x add ${p}` };
        printUpdateCommands(sameCommand, depRows, devRows);
        const text = output();
        assert.ok(text.includes('# dependencies + devDependencies'));
        assert.ok(text.includes('x add lodash@4.17.21 chalk@5.3.0'));
    });
});

describe('readPackageJson', () => {
    afterEach(() => mock.restoreAll());

    it('parses the package.json found in the given directory', () => {
        mock.method(fs, 'existsSync', () => true);
        mock.method(fs, 'readFileSync', () => '{ "name": "demo" }');
        assert.deepEqual(readPackageJson('/project'), { name: 'demo' });
    });

    it('exits when package.json is missing', () => {
        mock.method(fs, 'existsSync', () => false);
        mock.method(console, 'error', () => {});
        const exit = mock.method(process, 'exit', () => {
            throw new Error('process.exit');
        });
        assert.throws(() => readPackageJson('/project'), /process\.exit/);
        assert.deepEqual(exit.mock.calls[0].arguments, [1]);
    });

    it('exits when package.json is not valid JSON', () => {
        mock.method(fs, 'existsSync', () => true);
        mock.method(fs, 'readFileSync', () => '{ not json');
        mock.method(console, 'error', () => {});
        const exit = mock.method(process, 'exit', () => {
            throw new Error('process.exit');
        });
        assert.throws(() => readPackageJson('/project'), /process\.exit/);
        assert.deepEqual(exit.mock.calls[0].arguments, [1]);
    });
});

describe('run', () => {
    const originalArgv = process.argv;

    afterEach(() => {
        mock.restoreAll();
        process.argv = originalArgv;
    });

    function stubProject(pkg) {
        mock.method(process, 'cwd', () => '/project');
        mock.method(fs, 'existsSync', () => true);
        mock.method(fs, 'readFileSync', () => JSON.stringify(pkg));
    }

    it('prints the table and upgrade commands when upgrades are available', async () => {
        process.argv = ['node', 'index.js', '--ignore', 'left-pad'];
        stubProject({
            packageManager: 'npm@10.0.0',
            dependencies: { lodash: '^1.0.0' },
            devDependencies: { rimraf: '^1.0.0' }
        });
        mock.method(global, 'fetch', async () => ({
            ok: true,
            json: async () => ({
                time: {
                    created: isoDaysAgo(999),
                    '1.0.0': isoDaysAgo(400),
                    '1.4.0': isoDaysAgo(30)
                }
            })
        }));
        const output = captureLog();

        await run();
        const text = output();

        assert.ok(text.includes('🔧 Package manager: npm'));
        assert.ok(text.includes('🚫 Ignored packages: left-pad'));
        assert.ok(text.includes('| package name'));
        assert.ok(text.includes('npm install lodash@1.4.0'));
        assert.ok(text.includes('npm install -D rimraf@1.4.0'));
    });

    it('reports when everything is within the cool-off period', async () => {
        process.argv = ['node', 'index.js'];
        stubProject({
            packageManager: 'npm@10.0.0',
            dependencies: { lodash: '^1.0.0' }
        });
        mock.method(global, 'fetch', async () => ({
            ok: true,
            json: async () => ({
                time: {
                    created: isoDaysAgo(999),
                    '1.0.0': isoDaysAgo(400),
                    '2.0.0': isoDaysAgo(2)
                }
            })
        }));
        const output = captureLog();

        await run();
        const text = output();

        assert.ok(text.includes('✅ Everything is up to date'));
        assert.ok(!text.includes('🚫 Ignored packages'));
    });
});
