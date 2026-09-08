// Acesso à API pública do registro do NPM.

// Busca os metadados de um pacote. Retorna null em caso de erro ou pacote privado.
async function getPackageData(packageName) {
    try {
        const response = await fetch(`https://registry.npmjs.org/${packageName}`);
        if (!response.ok) throw new Error('Pacote não encontrado ou privado');
        return await response.json();
    } catch (e) {
        return null;
    }
}

// Encontra a versão estável mais recente publicada há mais de 7 dias.
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

module.exports = { getPackageData, getLatestOver7Days };
