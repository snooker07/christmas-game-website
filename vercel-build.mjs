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
  const publicationPath = resolve(root, 'dist', 'publication.json');
  const publication = existsSync(publicationPath) ? JSON.parse(readFileSync(publicationPath, 'utf8')) : { mode: 'preview' };
  if (!['portfolio', 'production'].includes(publication.mode)) failures.push('Generate a public build with python build.py --publish or --production.');
  if (publication.mode !== 'portfolio') {
  for (const field of ['publisherName', 'supportEmail', 'privacyEffectiveDate', 'supportRetention', 'hostingPrivacyText']) {
    if (!config[field]) failures.push(`Publisher confirmation needed: ${field}`);
  }
  if (!config.christmasBreaker.privacyHtmlFile) failures.push('Christmas Breaker privacy policy needs verification.');
  if (!config.supportEmailConfirmed) failures.push('Support mailbox needs owner confirmation.');
  if (!config.christmasBreaker.privacyPracticesReviewed) failures.push('Confirm the current Christmas Breaker privacy practices.');
  }
  if (!config.supportEmailConfirmed || !config.supportEmail) failures.push('A confirmed support mailbox is required for publication.');
  for (const page of pages.filter(page => page !== '404.html')) {
    const path = resolve(root, 'dist', page);
    if (!existsSync(path)) continue;
    const content = readFileSync(path, 'utf8');
    if (publication.mode === 'portfolio' && page.includes('privacy/')) {
      if (!content.includes('content="noindex,nofollow"')) failures.push(`Unfinished privacy page must stay unindexed: ${page}`);
      continue;
    }
    if (content.includes('class="draft-note"') || content.includes('content="noindex,nofollow"')) {
      failures.push(`Draft page cannot be deployed to production: ${page}`);
    }
  }
}
if (failures.length) {
  console.error(failures.join('\n'));
  console.error('Run python build.py --publish for the public portfolio, or confirm site-config.json and use --production for finalized policies. Then run python verify.py.');
  process.exit(1);
}
console.log(`Static website ready: ${pages.length} pages (${process.env.VERCEL_ENV || 'local verification'}).`);
