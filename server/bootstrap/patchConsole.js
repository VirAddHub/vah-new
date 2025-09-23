// server/bootstrap/patchConsole.js
const FLAG = Symbol.for('vah.console.error.patched');

function patchConsole() {
    if (console[FLAG]) return; // avoid double-patching

    const origError = console.error.bind(console);
    const origWarn = console.warn.bind(console);
    const origLog = console.log.bind(console);

    console.error = (...args) => origError('🚨', ...args);
    console.warn = (...args) => origWarn('[warn]', ...args);
    console.log = (...args) => origLog('[info]', ...args);

    console[FLAG] = true;
}

module.exports = { patchConsole };
