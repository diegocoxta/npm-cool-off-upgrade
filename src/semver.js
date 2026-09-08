// Comparação de versões SemVer.

// Retorna true se v1 for estritamente maior que v2.
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

module.exports = { isSemverGreater };
