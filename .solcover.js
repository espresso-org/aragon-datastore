module.exports = {
    copyNodeModules: true,
    norpc: false,
    compileCommand: '../node_modules/.bin/truffle compile',
    testCommand: 'node --max-old-space-size=4096 ../node_modules/.bin/truffle test --network coverage',
    deepSkip: true
}