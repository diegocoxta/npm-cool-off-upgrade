const fs = require('fs');
const path = require('path');

const { isSemverGreater } = require('./semver');
const { analyzeDependencies } = require('./analyzeDependencies');
const { detectPackageManager, getCommands } = require('./packageManager');

// Lê o package.json do diretório atual ou encerra o processo com erro.
function readPackageJson(cwd) {
    const pkgPath = path.resolve(cwd, 'package.json');

    if (!fs.existsSync(pkgPath)) {
        console.error('❌ Erro: package.json não encontrado no diretório atual.');
        process.exit(1);
    }

    try {
        return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    } catch (error) {
        console.error('❌ Erro ao ler ou processar o package.json:', error.message);
        process.exit(1);
    }
}

// Imprime os comandos de atualização usando o gerenciador de pacotes detectado.
function printUpdateCommands(commands, depsToUpdate, devDepsToUpdate) {
    if (depsToUpdate.length === 0 && devDepsToUpdate.length === 0) {
        console.log('\n✅ Tudo atualizado! Nenhuma dependência segura (> 7 dias) pendente encontrada.\n');
        return;
    }

    console.log('\n======================================================');
    console.log('💡 COMANDOS SUGERIDOS PARA ATUALIZAÇÃO (Versões Fixas)');
    console.log('======================================================');

    if (depsToUpdate.length > 0) {
        const installStr = depsToUpdate.map(r => `${r['Pacote']}@${r['Última > 7 dias']}`).join(' ');
        console.log('\n🚀 Para atualizar as dependências normais, execute:\n');
        console.log(`${commands.install(installStr)}\n`);
    }

    if (devDepsToUpdate.length > 0) {
        const installStr = devDepsToUpdate.map(r => `${r['Pacote']}@${r['Última > 7 dias']}`).join(' ');
        console.log('\n🛠️  Para atualizar as devDependencies, execute:\n');
        console.log(`${commands.installDev(installStr)}\n`);
    }
}

// Fluxo principal do CLI.
async function run() {
    const cwd = process.cwd();
    const pkg = readPackageJson(cwd);

    const packageManager = detectPackageManager(cwd, pkg);
    const commands = getCommands(packageManager);
    console.log(`🔧 Gerenciador de pacotes detectado: ${packageManager}`);

    const depResults = await analyzeDependencies(pkg.dependencies, 'dependencies');
    if (depResults.length > 0) console.table(depResults);

    const devDepResults = await analyzeDependencies(pkg.devDependencies, 'devDependencies');
    if (devDepResults.length > 0) console.table(devDepResults);

    const depsToUpdate = depResults.filter(r => isSemverGreater(r['Última > 7 dias'], r['Versão Local']));
    const devDepsToUpdate = devDepResults.filter(r => isSemverGreater(r['Última > 7 dias'], r['Versão Local']));

    printUpdateCommands(commands, depsToUpdate, devDepsToUpdate);
}

module.exports = { run };
