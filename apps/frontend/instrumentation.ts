import { registerProductionFrontendEnvChecks } from './lib/server/productionFrontendEnv';

export async function register() {
  registerProductionFrontendEnvChecks();
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { installVisitorFetch } = await import('./lib/server/visitorFetch');
    installVisitorFetch();
  }
}
