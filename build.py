"""Generate a portable, dependency-free static website. No network is needed."""
import argparse
import html
import json
import re
import shutil
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent
OUT = ROOT / 'dist'
CONFIG = json.loads((ROOT / 'site-config.json').read_text(encoding='utf-8-sig'))
parser = argparse.ArgumentParser()
parser.add_argument('--production', action='store_true', help='Require confirmed publisher and privacy information.')
args = parser.parse_args()
missing = [key for key in ('publisherName', 'supportEmail', 'privacyEffectiveDate', 'supportRetention', 'hostingPrivacyText') if not CONFIG.get(key)]
if not CONFIG['christmasBreaker'].get('privacyHtmlFile'):
    missing.append('christmasBreaker.privacyHtmlFile')
if not CONFIG.get('supportEmailConfirmed'):
    missing.append('supportEmailConfirmed')
if not CONFIG['christmasBreaker'].get('privacyPracticesReviewed'):
    missing.append('christmasBreaker.privacyPracticesReviewed')
if CONFIG.get('supportEmail') and not re.fullmatch(r'[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+', CONFIG['supportEmail']):
    raise SystemExit('supportEmail must be an actual email address.')
if CONFIG.get('privacyEffectiveDate'):
    date.fromisoformat(CONFIG['privacyEffectiveDate'])
for game in ('christmasBreaker', 'snowPush'):
    url = CONFIG[game].get('storeUrl')
    if url and (urlparse(url).scheme != 'https' or urlparse(url).hostname != 'apps.apple.com'):
        raise SystemExit(f'{game}.storeUrl must be a verified HTTPS apps.apple.com link.')
if args.production and missing:
    raise SystemExit('Production build needs confirmed values: ' + ', '.join(missing))

def esc(value):
    return html.escape(str(value), quote=True)

OUT.mkdir(exist_ok=True)
assets = OUT / 'assets'
assets.mkdir(exist_ok=True)
for name in ('styles.css', 'site.js', 'favicon.svg', 'christmas-art.svg', 'christmas.css', 'christmas.js'):
    shutil.copyfile(ROOT / 'src' / name, assets / name)
media = ROOT / 'src' / 'media'
media.mkdir(exist_ok=True)
shutil.copyfile(media / 'christmas-forest.webp', assets / 'christmas-forest.webp')
for name, original in [('LilitaOne.ttf', REPO / 'Assets/SnowPush/Resources/UI/LilitaOne.ttf'), ('LilitaOne-OFL.txt', REPO / 'Assets/SnowPush/Fonts/LilitaOne-OFL.txt')]:
    if not (media / name).exists():
        shutil.copyfile(original, media / name)
    shutil.copyfile(media / name, assets / name)
images = {
    'snow-push-key-art': REPO / 'Assets/illustrations/01-snow-push-key-art.png',
    'snow-push-gameplay': REPO / 'Releases/Metadata/1.0.0/Preview-iPhone/05-match-hud.png',
    'snow-push-settings': REPO / 'Releases/Metadata/1.0.0/Preview-iPhone/03-settings.png',
}
try:
    from PIL import Image
    for name, source in images.items():
        retained = media / (name + '.webp')
        if not retained.exists():
            with Image.open(source) as im:
                im.thumbnail((1536, 1024))
                im.convert('RGB').save(retained, 'WEBP', quality=85)
        shutil.copyfile(retained, assets / retained.name)
    extension = 'webp'
except ImportError:
    if all((media / (name + '.webp')).exists() for name in images):
        for name in images:
            shutil.copyfile(media / (name + '.webp'), assets / (name + '.webp'))
        extension = 'webp'
    else:
        for name, source in images.items():
            retained = media / (name + '.png')
            if not retained.exists(): shutil.copyfile(source, retained)
            shutil.copyfile(retained, assets / retained.name)
        extension = 'png'

# Retain the original screenshot URLs as well as the new asset locations.
for name in ('screen1.png', 'screen2.png', 'screen3.png'):
    if (media / name).exists():
        shutil.copyfile(media / name, assets / name)
        shutil.copyfile(media / name, OUT / name)

def picture(name, alt, extra=''):
    return f'<img src="/assets/{name}.{extension}" alt="{esc(alt)}" {extra}>'

def app_button(game):
    if CONFIG[game].get('storeUrl'):
        return f'<a class="button" href="{esc(CONFIG[game]["storeUrl"])}" target="_blank" rel="noopener noreferrer">View on the App Store <span aria-hidden="true">↗</span></a>'
    if game == 'snowPush':
        return '<span class="status"><span class="status-dot"></span>In development for iPhone &amp; iPad</span>'
    return ''

def contact(game=None):
    if not CONFIG.get('supportEmail'):
        return '<aside class="draft-note"><strong>Preview: contact details pending.</strong> The support email will be added before this website is published for App Store submission.</aside>'
    email = esc(CONFIG['supportEmail'])
    from urllib.parse import quote
    subject = quote((game or 'Fundelits') + ' support')
    return f'<div class="contact-box"><span class="eyebrow">Get in touch</span><h2>We’re here to help.</h2><p>Questions, feedback, or a problem with the game? Email us.</p><a class="button" href="mailto:{email}?subject={subject}">Email support <span aria-hidden="true">↗</span></a><p class="contact-address">{email}</p></div>'

pages = {}
def page(path, title, description, content, section='games'):
    pages[path] = (title, description, content, section)

keyart = picture('snow-push-key-art', 'Snow Push promotional illustration of winter animal riders racing on an iceberg', 'width="1536" height="1024" fetchpriority="high"')
page('/', 'Fundelits — A little Christmas magic', 'Follow a snowflake through a magical Christmas forest, then discover Christmas Breaker and Snow Push.', (ROOT / 'src' / 'homepage.html').read_text(encoding='utf-8'))

page('/snow-push/', 'Snow Push — Fundelits', 'An offline winter arcade game in development for iPhone and iPad. Ride a polar cub, ram three computer-controlled rivals, and survive the cracking ice.', f'''
<section class="product-hero wrap"><a class="back-link" href="/#games">← All games</a><div class="product-intro"><div><span class="eyebrow">The next winter adventure</span><h1>Snow <em>Push.</em></h1></div><div><p>Four riders. One shrinking iceberg.<br>Make your next ram count.</p>{app_button('snowPush')}</div></div><figure class="product-art">{keyart}<figcaption>Promotional artwork</figcaption></figure></section>
<section class="feature-section wrap"><div><span class="eyebrow">Stay on the ice</span><h2>Cold arena.<br>Warm competition.</h2></div><div class="feature-copy"><p>Hop onto your polar cub, steer across the frozen arena, and time your rams to send rival riders into the sea. As the ice cracks and breaks away, every round gets tighter.</p><p>The first version is designed for offline matches against three computer-controlled rivals, with no advertisements or in-app purchases.</p></div></section>
<section class="facts-grid wrap"><article><span class="fact-number">01</span><h3>Slide. Aim. Ram.</h3><p>Simple steering and a dedicated Ram button keep the action within reach.</p></article><article><span class="fact-number">02</span><h3>The ice won’t wait.</h3><p>A shrinking iceberg, falling ice, and real gaps make every move matter.</p></article><article><span class="fact-number">03</span><h3>Play your way.</h3><p>Adjust sound, screen shake, and control hints. Settings and match statistics stay on your device.</p></article></section>
<section class="screenshots wrap"><div class="section-heading"><div><span class="eyebrow">A closer look</span><h2>Inside the arena.</h2></div></div><figure>{picture('snow-push-gameplay','Development preview of a Snow Push match with steering and Ram controls','loading="lazy"')}<figcaption>Development preview. The released version may differ.</figcaption></figure></section>
<section class="support-strip wrap"><div><span class="eyebrow">Good to know</span><h2>Help is always close by.</h2></div><div class="link-pair"><a class="button secondary" href="/snow-push/support/">Snow Push support →</a><a class="text-link" href="/snow-push/privacy/">Privacy policy →</a></div></section>
''')

page('/christmas-breaker/', 'Christmas Breaker — Fundelits', CONFIG['christmasBreaker']['description'], f'''
<section class="product-hero wrap"><a class="back-link" href="/#games">← All games</a><div class="product-intro"><div><span class="eyebrow">Festive arcade</span><h1>Christmas<br><em>Breaker.</em></h1></div><div><p>{esc(CONFIG['christmasBreaker']['description'])}</p>{app_button('christmasBreaker')}</div></div><figure class="product-art christmas-product"><img src="/assets/screen1.png" alt="Christmas Breaker gameplay with numbered ice blocks and snowballs over a festive village" width="323" height="571"><figcaption>Christmas Breaker gameplay</figcaption></figure></section>
<section class="feature-section wrap"><div><span class="eyebrow">Break the ice</span><h2>A little festive play.</h2></div><div class="feature-copy"><p>Calculate your angles, launch your shots, and keep the board clear. Christmas Breaker brings a growing arcade challenge to a snowy Christmas setting.</p><a class="text-link" href="/snow-push/">Discover our next game, Snow Push →</a></div></section>
<section class="facts-grid wrap"><article><span class="fact-number">01</span><h3>Physics-based play.</h3><p>Precision matters. Find the right angle and watch your shots bounce through the board.</p></article><article><span class="fact-number">02</span><h3>A growing challenge.</h3><p>Keep clearing the ice as the endless arcade challenge escalates.</p></article><article><span class="fact-number">03</span><h3>An ad-free option.</h3><p>The existing game offers advertising and a Remove Ads purchase. See its own privacy policy for details.</p></article></section>
<section id="gallery" class="screenshots wrap"><div class="section-heading"><div><span class="eyebrow">In-game action</span><h2>A snowy little world.</h2></div></div><div class="portrait-gallery"><figure><img src="/assets/screen1.png" alt="Christmas Breaker numbered ice blocks above a festive village" width="323" height="571" loading="lazy"></figure><figure><img src="/assets/screen2.png" alt="Christmas Breaker gameplay screenshot from the original website" width="323" height="571" loading="lazy"></figure><figure><img src="/assets/screen3.png" alt="Christmas Breaker game action from the original website" width="323" height="571" loading="lazy"></figure></div></section>
<section class="support-strip wrap"><div><span class="eyebrow">Christmas Breaker</span><h2>Looking for help?</h2></div><div class="link-pair"><a class="button secondary" href="/christmas-breaker/support/">Game support →</a><a class="text-link" href="/christmas-breaker/privacy/">Privacy policy →</a></div></section>
''')

def heading(kicker, title, subtitle):
    return f'<section class="page-heading wrap"><span class="eyebrow">{kicker}</span><h1>{title}</h1><p>{subtitle}</p></section>'

page('/support/', 'Support — Fundelits', 'Get help with Christmas Breaker and Snow Push. Choose your game to find answers and contact Fundelits.', heading('Here to help', 'Let’s get you<br><em>back to play.</em>', 'Choose your game for help, answers, and contact information.') + '''
<section class="directory wrap"><a href="/christmas-breaker/support/"><span class="eyebrow">Game support</span><h2>Christmas Breaker <span aria-hidden="true">↗</span></h2><p>Questions, feedback, and help with the game.</p></a><a href="/snow-push/support/"><span class="eyebrow">Game support</span><h2>Snow Push <span aria-hidden="true">↗</span></h2><p>Controls, saved progress, settings, and troubleshooting.</p></a></section>''' + f'<section class="wrap narrow">{contact()}</section>', 'support')

def faq(question, answer):
    return f'<details><summary>{question}<span aria-hidden="true">+</span></summary><div class="faq-answer">{answer}</div></details>'

snow_faq = ''.join([
    faq('How do I play?', '<p>Steer your rider across the ice and use the Ram button to knock rivals off the iceberg. Avoid gaps and falling ice. The last rider on the iceberg wins.</p>'),
    faq('Do I need an internet connection or an account?', '<p>The current version is designed for offline play against three computer-controlled opponents. It has no account registration or online matchmaking.</p>'),
    faq('Where are my settings and progress stored?', '<p>Your sound and display preferences, cosmetic selections, and completed-match statistics are saved locally on your device. The current version does not synchronize saves between devices.</p>'),
    faq('How do I change sound or screen shake?', '<p>Open Settings from the main menu. You can adjust the volume, turn screen shake on or off, and toggle control hints.</p>'),
    faq('What happens if I delete the app?', '<p>Deleting the app can remove its local settings and progress. Offloading an app may retain its data. Device or operating-system backups may also retain copies; these are managed through your device and Apple settings.</p>'),
    faq('The game freezes or closes. What should I include in a report?', '<p>Include your device model, iOS or iPadOS version, game version, and the steps leading to the issue. A screenshot is helpful. Avoid including passwords or other sensitive information.</p>'),
    faq('Is Snow Push available on the App Store?', '<p>' + ('Use the App Store link on the <a href="/snow-push/">Snow Push page</a> to see availability.' if CONFIG['snowPush'].get('storeUrl') else 'Snow Push is currently in development. The App Store link will appear on its game page when it is available.') + '</p>'),
])
page('/snow-push/support/', 'Snow Push Support — Fundelits', 'Help with Snow Push controls, offline play, local saves, settings, and troubleshooting.', heading('Snow Push · Support', 'A helping <em>hand.</em>', 'A few answers before your next match.') + f'<section class="support-layout wrap"><div class="faq">{snow_faq}</div><aside>{contact("Snow Push")}<a class="text-link" href="/snow-push/privacy/">Snow Push privacy policy →</a></aside></section>', 'support')
page('/christmas-breaker/support/', 'Christmas Breaker Support — Fundelits', 'Contact Fundelits for Christmas Breaker support, feedback, and troubleshooting.', heading('Christmas Breaker · Support', 'Here for your<br><em>next round.</em>', 'Questions about Christmas Breaker? Get in touch.') + f'<section class="support-layout wrap"><div class="prose"><h2>Tell us what happened.</h2><p>For technical issues, include your device model, operating-system version, game version, and what you were doing when the issue occurred. A screenshot can help us understand the problem.</p><p>Please avoid sending passwords, payment details, or other sensitive information.</p><a class="text-link" href="/christmas-breaker/">Back to Christmas Breaker →</a></div><aside>{contact("Christmas Breaker")}<a class="text-link" href="/christmas-breaker/privacy/">Christmas Breaker privacy policy →</a></aside></section>', 'support')

page('/privacy/', 'Privacy — Fundelits', 'Find the privacy information for Snow Push, Christmas Breaker, and the Fundelits website.', heading('Your information', 'Privacy, in<br><em>plain language.</em>', 'Each game has its own privacy information. Choose the one you use.') + '''<section class="directory wrap"><a href="/snow-push/privacy/"><span class="eyebrow">Game privacy</span><h2>Snow Push <span aria-hidden="true">↗</span></h2><p>Offline play and information stored on your device.</p></a><a href="/christmas-breaker/privacy/"><span class="eyebrow">Game privacy</span><h2>Christmas Breaker <span aria-hidden="true">↗</span></h2><p>Privacy information specific to Christmas Breaker.</p></a><a href="/privacy/website/"><span class="eyebrow">Website privacy</span><h2>This website <span aria-hidden="true">↗</span></h2><p>Website hosting and contacting Fundelits.</p></a></section>''', 'privacy')

publisher = esc(CONFIG.get('publisherName') or 'Publisher identity pending confirmation')
effective = esc(CONFIG.get('privacyEffectiveDate') or 'To be confirmed before publication')
draft = '<aside class="draft-note"><strong>Draft policy for review.</strong> Publisher identity, contact details, the effective date, and support correspondence practices must be confirmed before App Store submission.</aside>' if any(not CONFIG.get(key) for key in ('publisherName', 'supportEmail', 'privacyEffectiveDate', 'supportRetention')) else ''
contact_policy = f'<p>Contact {publisher} at <a href="mailto:{esc(CONFIG["supportEmail"])}">{esc(CONFIG["supportEmail"])}</a>.</p>' if CONFIG.get('supportEmail') else '<p>A confirmed support email will be included in the final policy.</p>'
support_retention = esc(CONFIG.get('supportRetention') or 'The retention period for support correspondence is awaiting publisher confirmation.')
page('/snow-push/privacy/', 'Snow Push Privacy Policy — Fundelits', 'Privacy policy for the current offline version of Snow Push, including local storage, data sharing, retention, and contact details.', heading('Snow Push · Privacy', 'Your game.<br><em>Your device.</em>', 'Privacy policy for the current offline version of Snow Push.') + f'''
<article class="legal wrap narrow">{draft}<div class="policy-meta"><p><strong>Publisher:</strong> {publisher}</p><p><strong>Effective date:</strong> {effective}</p></div>
<h2>1. Scope</h2><p>This policy describes the current offline version of Snow Push for iPhone and iPad. It does not describe other Fundelits games, this website, or services that may be introduced in later versions.</p>
<h2>2. Information stored on your device</h2><p>The game stores a randomly generated local player identifier, sound and display preferences, completed-match counts and results, ram counts, and starter cosmetic identifiers. These records preserve settings and game progress between launches.</p><p>This information is stored in the app’s local device container. The game does not send these records to a Fundelits server or link them to an Apple account.</p>
<h2>3. Accounts, advertising, and analytics</h2><p>The current version has no account registration, advertising, in-app purchases, analytics SDKs, tracking, or online matchmaking. The game does not collect personal information for these purposes.</p>
<h2>4. Sharing and third-party services</h2><p>The current game does not transmit local player records to third parties. Apple may independently process information when you use the App Store, device backup, or operating-system services under Apple’s own privacy policy.</p>
<h2>5. Retention and deletion</h2><p>Local settings and game records remain on the device while retained by the app. Deleting the app can remove this data; offloading may retain it. Copies included in device or operating-system backups are managed through your device and Apple settings. Fundelits cannot access or remotely delete local saves. The current game does not synchronize progress between devices.</p>
<h2>6. Support correspondence</h2><p>If you contact support, we receive the email address, message, and attachments you choose to send. We use them to respond to your request and investigate issues. Please send only information needed to explain the problem.</p><p>{support_retention}</p><p>You can request deletion of support correspondence using the contact details below, subject to applicable retention obligations.</p>
<h2>7. Children’s information</h2><p>The current offline game does not request names, email addresses, dates of birth, or account information from players, and does not include advertising or tracking. Please avoid including a child’s personal information in support messages.</p>
<h2>8. Changes</h2><p>If a future version introduces online services, cloud saves, analytics, purchases, or other data practices, this policy will be updated to explain them. The effective date identifies the current policy.</p>
<h2>9. Contact</h2>{contact_policy}<a class="text-link" href="/snow-push/support/">Snow Push support →</a></article>''', 'privacy')

cb_policy_file = CONFIG['christmasBreaker'].get('privacyHtmlFile')
cb_policy = (ROOT / cb_policy_file).read_text(encoding='utf-8') if cb_policy_file else '<aside class="draft-note"><strong>Privacy policy pending verification.</strong> The existing Christmas Breaker policy and its actual data practices need to be reviewed before this page is published for App Store use.</aside><p>Christmas Breaker has a separate privacy policy from Snow Push. Snow Push’s offline data practices should not be assumed to apply to this game.</p>'
cb_review = '<aside class="draft-note"><strong>Existing policy retained for review.</strong> This policy comes from the previous Christmas Breaker website. Its current advertising, purchase, and data practices must be checked before release.</aside>' if not CONFIG['christmasBreaker'].get('privacyPracticesReviewed') else ''
page('/christmas-breaker/privacy/', 'Christmas Breaker Privacy — Fundelits', 'Privacy information for Christmas Breaker.', heading('Christmas Breaker · Privacy', 'Christmas Breaker<br><em>privacy.</em>', 'Privacy information specific to this game.') + f'<article class="legal wrap narrow">{cb_review}{cb_policy}<a class="text-link" href="/christmas-breaker/support/">Christmas Breaker support →</a></article>', 'privacy')
hosting = '<p>' + esc(CONFIG['hostingPrivacyText']) + '</p>' if CONFIG.get('hostingPrivacyText') else '<p>The fundelits.com website is hosted by Vercel. The domain is registered through Namecheap.</p><aside class="draft-note"><strong>Hosting details pending.</strong> Request logs, recipients, and retention practices must be confirmed before publication on fundelits.com.</aside>'
page('/privacy/website/', 'Website Privacy — Fundelits', 'Information about the Fundelits website and support correspondence.', heading('Fundelits · Website privacy', 'A clear view of<br><em>website privacy.</em>', 'Information about browsing this website and contacting us.') + f'<article class="legal wrap narrow"><h2>Website features</h2><p>This website’s application code does not use analytics, advertising scripts, tracking pixels, cookies, or browser storage. Fonts and artwork are served locally. There are no accounts or newsletter forms.</p><h2>Hosting</h2>{hosting}<h2>External links</h2><p>App Store links, when available, open Apple’s website. Email links open your email application. These services process information under their own policies.</p><h2>Contacting support</h2><p>When you email support, we receive the information you send to us and use it to respond to your request.</p><p>{support_retention}</p><h2>Contact</h2>{contact_policy}</article>', 'privacy')
page('/404.html', 'Page not found — Fundelits', 'This page could not be found. Explore Fundelits games or visit support.', heading('A little detour', 'Lost in the <em>snow?</em>', 'That page could not be found.') + '<div class="wrap error-actions"><a class="button" href="/">Back to home →</a><a class="text-link" href="/support/">Visit support →</a></div>')


home_title, home_description, home_content, home_section = pages['/']
home_content = (ROOT / 'src' / 'homepage.html').read_text(encoding='utf-8')
legacy = '<section class="legacy-anchor wrap" id="privacy"><h2>Christmas Breaker privacy policy</h2><p><a href="/christmas-breaker/privacy/">Read the Christmas Breaker privacy policy →</a></p></section><section class="legacy-anchor wrap" id="game"><a href="/christmas-breaker/">Visit Christmas Breaker →</a></section><section class="legacy-anchor wrap" id="gallery"><a href="/christmas-breaker/#gallery">View Christmas Breaker screenshots →</a></section>'
pages['/'] = (home_title, home_description, home_content + legacy, home_section)

for path, (title, description, content, section) in pages.items():
    home_head = '<link rel="stylesheet" href="/assets/christmas.css"><script src="/assets/christmas.js" defer></script>' if path == '/' else ''
    body_class = ' class="home-magic"' if path == '/' else ''
    theme_color = '#071522' if path == '/' else '#f6f4ed'
    color_scheme = 'dark' if path == '/' else 'light'
    robots = 'index,follow' if args.production and path != '/404.html' else 'noindex,nofollow'
    canonical = f'<link rel="canonical" href="{esc(CONFIG["productionOrigin"].rstrip("/") + path)}">' if args.production else ''
    nav = ''.join(f'<a href="{url}"' + (' aria-current="page"' if section == key else '') + f'>{label}</a>' for key, label, url in [('games','Games','/#games'),('support','Support','/support/'),('privacy','Privacy','/privacy/')])
    document = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="{color_scheme}"><title>{esc(title)}</title><meta name="description" content="{esc(description)}"><meta name="robots" content="{robots}">{canonical}<meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(description)}"><meta property="og:type" content="website"><meta name="theme-color" content="{theme_color}"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/styles.css"><script src="/assets/site.js" defer></script>{home_head}</head>
<body{body_class}><a class="skip-link" href="#main">Skip to content</a><header class="site-header wrap"><a class="brand" href="/" aria-label="Fundelits home"><span class="brand-mark" aria-hidden="true">✳</span>fundelits<span class="brand-period">.</span></a><button class="menu-toggle" type="button" aria-label="Open navigation" aria-controls="site-nav" aria-expanded="false" hidden>Menu <span aria-hidden="true">☰</span></button><nav id="site-nav" aria-label="Main navigation">{nav}</nav></header><main id="main">{content}</main><footer class="site-footer wrap"><div><a class="brand" href="/">fundelits<span class="brand-period">.</span></a><p>A little play. A lot of joy.</p></div><nav aria-label="Footer navigation"><a href="/#games">Games</a><a href="/support/">Support</a><a href="/privacy/">Privacy</a></nav><div class="copyright">© {date.today().year} {esc(CONFIG.get('publisherName') or 'Fundelits')}</div></footer></body></html>'''
    destination = OUT / ('index.html' if path == '/' else path.lstrip('/') if path.endswith('.html') else path.strip('/') + '/index.html')
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(document, encoding='utf-8')

(OUT / 'robots.txt').write_text('User-agent: *\n' + ('Allow: /\nSitemap: ' + CONFIG['productionOrigin'].rstrip('/') + '/sitemap.xml\n' if args.production else 'Disallow: /\n'), encoding='utf-8')
if args.production:
    urls = ''.join('<url><loc>' + esc(CONFIG['productionOrigin'].rstrip('/') + p) + '</loc></url>' for p in pages if not p.endswith('.html'))
    (OUT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="utf-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls + '</urlset>', encoding='utf-8')
elif (OUT / 'sitemap.xml').exists():
    (OUT / 'sitemap.xml').unlink()
(OUT / '_headers').write_text('/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src \'self\'; script-src \'self\'; style-src \'self\'; img-src \'self\'; font-src \'self\'; object-src \'none\'; base-uri \'self\'; frame-ancestors \'none\'; form-action \'none\'\n', encoding='utf-8')
print(json.dumps({'pages': len(pages), 'mode': 'production' if args.production else 'preview', 'output': str(OUT), 'remainingPublisherInputs': missing}, indent=2))
