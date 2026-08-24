#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Função auxiliar para comparar versões SemVer (retorna true se v1 > v2)
function isSemverGreater(v1, v2) {
    if (v1 === 'Nenhuma' || v1 === 'Erro/Privado' || v1 === '-' || !v1 || !v2) return false;
    
    const v1Parts = v1.split('.').map(Number);
    const v2Parts = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
        const p1 = v1Parts[i] || 0;
        const p2 = v2Parts[i] || 0;
        if (p1 > p2) return true;
        if (p1 < p2) return false;
    }
    return false;
}

// Função para buscar dados da API do NPM
async function getPackageData(packageName) {
    try {
        const response = await fetch(`https://registry.npmjs.org/${packageName}`);
        if (!response.ok) throw new Error('Pacote não encontrado ou privado');
        return await response.json();
    } catch (e) {
        return null;
    }
}

// Função para encontrar a versão mais recente publicada há mais de 7 dias
function getLatestOver7Days(timeObj) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const validVersions = Object.keys(timeObj)
        .filter(key => key !== 'modified' && key !== 'created') 
        .filter(version => {
            const releaseDate = new Date(timeObj[version]);
            return releaseDate <= sevenDaysAgo && !version.includes('-');
        })
        .sort((a, b) => new Date(timeObj[b]) - new Date(timeObj[a]));

    return validVersions.length > 0 ? validVersions[0] : 'Nenhuma';
}

// Função principal de análise
async function analyzeDependencies(deps, type) {
    if (!deps || Object.keys(deps).length === 0) return [];
    
    console.log(`\n📦 Analisando ${type}...`);
    const results = [];

    for (const [name, currentVersion] of Object.entries(deps)) {
        const data = await getPackageData(name);
        const cleanLocalVersion = currentVersion.replace(/[\^~]/g, '');
        
        if (!data) {
            results.push({
                'Pacote': name,
                'Versão Local': cleanLocalVersion,
                'Última do NPM': 'Erro/Privado',
                'Data da Última': '-',
                'Última > 7 dias': '-'
            });
            continue;
        }

        const latestVersion = data['dist-tags'].latest;
        const latestDate = new Date(data.time[latestVersion]);
        const formattedLatestDate = latestDate.toISOString().split('T')[0];
        const latestOver7 = getLatestOver7Days(data.time);

        results.push({
            'Pacote': name,
            'Versão Local': cleanLocalVersion,
            'Última do NPM': latestVersion,
            'Data da Última': formattedLatestDate,
            'Última > 7 dias': latestOver7
        });
    }
    
    return results;
}

// Execução
async function run() {
    const pkgPath = path.resolve(process.cwd(), 'package.json');

    if (!fs.existsSync(pkgPath)) {
        console.error('❌ Erro: package.json não encontrado no diretório atual.');
        process.exit(1);
    }

    try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        
        // Analisa e exibe tabelas
        const depResults = await analyzeDependencies(pkg.dependencies, 'dependencies');
        if (depResults.length > 0) console.table(depResults);
        
        const devDepResults = await analyzeDependencies(pkg.devDependencies, 'devDependencies');
        if (devDepResults.length > 0) console.table(devDepResults);

        // Gera comandos de atualização
        const depsToUpdate = depResults.filter(r => isSemverGreater(r['Última > 7 dias'], r['Versão Local']));
        const devDepsToUpdate = devDepResults.filter(r => isSemverGreater(r['Última > 7 dias'], r['Versão Local']));

        if (depsToUpdate.length > 0 || devDepsToUpdate.length > 0) {
            console.log('\n======================================================');
            console.log('💡 COMANDOS SUGERIDOS PARA ATUALIZAÇÃO (Versões Fixas)');
            console.log('======================================================');
        }

        if (depsToUpdate.length > 0) {
            const installStr = depsToUpdate.map(r => `${r['Pacote']}@${r['Última > 7 dias']}`).join(' ');
            console.log(`\n🚀 Para atualizar as dependências normais, execute:\n`);
            console.log(`npm install ${installStr}\n`);
        }

        if (devDepsToUpdate.length > 0) {
            const installStr = devDepsToUpdate.map(r => `${r['Pacote']}@${r['Última > 7 dias']}`).join(' ');
            console.log(`\n🛠️  Para atualizar as devDependencies, execute:\n`);
            console.log(`npm install -D ${installStr}\n`);
        }

        if (depsToUpdate.length === 0 && devDepsToUpdate.length === 0) {
            console.log('\n✅ Tudo atualizado! Nenhuma dependência segura (> 7 dias) pendente encontrada.\n');
        }

    } catch (error) {
        console.error('❌ Erro ao ler ou processar o package.json:', error.message);
    }
}

run();
