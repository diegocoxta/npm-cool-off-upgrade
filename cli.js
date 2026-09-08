#!/usr/bin/env node

const { run } = require('./src/run');

run().catch(error => {
    console.error('❌ Erro inesperado:', error.message);
    process.exit(1);
});
