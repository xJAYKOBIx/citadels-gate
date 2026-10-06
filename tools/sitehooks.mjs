// Module hooks so Node can load the website's Worker code: a stand-in for "cloudflare:workers" and
// extensionless relative imports resolved to .ts (the bundler does both in the real build).
import { register } from 'node:module';
register('data:text/javascript,' + encodeURIComponent(`
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export async function resolve(spec, ctx, next) {
  if (spec === 'cloudflare:workers') return { url: 'data:text/javascript,' + encodeURIComponent('export class DurableObject{ constructor(ctx,env){ this.ctx=ctx; this.env=env; } }'), shortCircuit: true };
  if ((spec.startsWith('./') || spec.startsWith('../')) && !/\\.[cm]?[jt]s$/.test(spec) && ctx.parentURL && ctx.parentURL.startsWith('file:')) {
    const u = new URL(spec + '.ts', ctx.parentURL);
    if (existsSync(fileURLToPath(u))) return { url: u.href, shortCircuit: true };
  }
  return next(spec, ctx);
}`));
