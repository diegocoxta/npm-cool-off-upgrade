const fs = require('fs');
const path = require('path');

// Gerenciadores suportados: qual lock file identifica cada um e como
// eles montam o comando de instalação de dependências e devDependencies.
const PACKAGE_MANAGERS = {
    npm: {
        lockFiles: ['package-lock.json', 'npm-shrinkwrap.json'],
        install: pkgs => `npm install ${pkgs}`,
        installDev: pkgs => `npm install -D ${pkgs}`
    },
    yarn: {
        lockFiles: ['yarn.lock'],
        install: pkgs => `yarn add ${pkgs}`,
        installDev: pkgs => `yarn add -D ${pkgs}`
    },
    pnpm: {
        lockFiles: ['pnpm-lock.yaml'],
        install: pkgs => `pnpm add ${pkgs}`,
        installDev: pkgs => `pnpm add -D ${pkgs}`
    },
    bun: {
        lockFiles: ['bun.lockb', 'bun.lock'],
        install: pkgs => `bun add ${pkgs}`,
        installDev: pkgs => `bun add -d ${pkgs}`
    }
};

const DEFAULT_PACKAGE_MANAGER = 'npm';

// Lê o campo "packageManager" do package.json (ex.: "pnpm@8.6.0" -> "pnpm").
function detectFromPackageJson(pkg) {
    if (!pkg || typeof pkg.packageManager !== 'string') return null;
    const name = pkg.packageManager.split('@')[0].trim();
    return PACKAGE_MANAGERS[name] ? name : null;
}

// Procura, no diretório informado, um lock file conhecido.
function detectFromLockFile(cwd) {
    for (const [name, config] of Object.entries(PACKAGE_MANAGERS)) {
        if (config.lockFiles.some(file => fs.existsSync(path.join(cwd, file)))) {
            return name;
        }
    }
    return null;
}

// Descobre o gerenciador de pacotes em uso.
// Prioridade: campo "packageManager" do package.json > lock file > npm (padrão).
function detectPackageManager(cwd, pkg) {
    return (
        detectFromPackageJson(pkg) ||
        detectFromLockFile(cwd) ||
        DEFAULT_PACKAGE_MANAGER
    );
}

// Devolve o objeto com os construtores de comando do gerenciador informado.
function getCommands(name) {
    return PACKAGE_MANAGERS[name] || PACKAGE_MANAGERS[DEFAULT_PACKAGE_MANAGER];
}

module.exports = {
    PACKAGE_MANAGERS,
    DEFAULT_PACKAGE_MANAGER,
    detectPackageManager,
    getCommands
};
