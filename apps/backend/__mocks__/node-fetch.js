// Mock for node-fetch to avoid ESM issues in Jest
module.exports = (...args) => global.fetch(...args);
module.exports.default = module.exports;
