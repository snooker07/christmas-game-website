// The checked-in dist/ is generated locally by build.py. Vercel needs only Node.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(resolve(root, 'site-config.json'), 'utf8'));
const pages = [
  'index.html', 'christmas-breaker/index.html', 'snow-push/index.html',
  'support/index.html', 'privacy/index.html', 'privacy/website/index.html',
  'christmas-breaker/support/index.html', 'christmas-breaker/privacy/index.html',
  'snow-push/support/index.html', 'snow-push/privacy/index.html', '404.html'
];
const failures = [];
for (const page of pages) {
  if (!existsSync(resolve(root, 'dist', page))) failures.push(`Missing generated page: ${page}`);
}
if (process.env.VERCEL_ENV === 'production') {
  for (const field of ['publisherName', 'supportEmail', 'privacyEffectiveDate', 'supportRetention', 'hostingPrivacyText']) {
    if (!config[field]) failures.push(`Publisher confirmation needed: ${field}`);
  }
  if (!config.christmasBreaker.privacyHtmlFile) failures.push('Christmas Breaker privacy policy needs verification.');
  if (!config.supportEmailConfirmed) failures.push('Support mailbox needs owner confirmation.');
  if (!config.christmasBreaker.privacyPracticesReviewed) failures.push('Confirm the current Christmas Breaker privacy practices.');
  for (const page of pages.filter(page => page !== '404.html')) {
    const path = resolve(root, 'dist', page);
    if (!existsSync(path)) continue;
    const content = readFileSync(path, 'utf8');
    if (content.includes('class="draft-note"') || content.includes('content="noindex,nofollow"')) {
      failures.push(`Draft page cannot be deployed to production: ${page}`);
    }
  }
}
if (failures.length) {
  console.error(failures.join('\n'));
  console.error('Confirm site-config.json, then run python build.py --production and python verify.py before deploying.');
  process.exit(1);
}
console.log(`Static website ready: ${pages.length} pages (${process.env.VERCEL_ENV || 'local verification'}).`);
