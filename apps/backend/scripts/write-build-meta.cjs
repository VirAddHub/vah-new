const fs = require('fs'), path = require('path');
const meta = {
  commit: process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || '',
  branch: process.env.RENDER_GIT_BRANCH || process.env.GIT_BRANCH || '',
  builtAt: new Date().toISOString(),
};
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync(path.join('dist','build-meta.json'), JSON.stringify(meta, null, 2));
console.log('[build] wrote dist/build-meta.json', meta);
