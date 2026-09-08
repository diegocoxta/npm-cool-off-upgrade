const { getPackageData, getLatestOver7Days } = require('./npmRegistry');

// Analisa um conjunto de dependências e devolve uma linha por pacote,
// pronta para ser exibida com console.table.
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

module.exports = { analyzeDependencies };
