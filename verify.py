"""Check all static documents, links, assets, and required support/privacy routes."""
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent / 'dist'
errors = []
checked = 0

class Document(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.ids = []
        self.title = False
        self.description = False
        self.main = 0
        self.h1 = 0
        self.lang = False
    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == 'html': self.lang = values.get('lang') == 'en'
        if tag == 'title': self.title = True
        if tag == 'meta' and values.get('name') == 'description': self.description = True
        if tag == 'main': self.main += 1
        if tag == 'h1': self.h1 += 1
        if 'id' in values: self.ids.append(values['id'])
        if tag == 'img' and not values.get('alt'): errors.append('Image missing alternative text')
        for key in ('href','src'):
            if key in values: self.links.append(values[key])

documents = {}
for file in ROOT.rglob('*.html'):
    parsed = Document()
    parsed.feed(file.read_text(encoding='utf-8'))
    documents[file] = parsed
    if not all((parsed.title, parsed.description, parsed.lang, parsed.main == 1, parsed.h1 == 1)):
        errors.append(str(file.relative_to(ROOT)) + ': missing document metadata or main heading')
    if len(parsed.ids) != len(set(parsed.ids)):
        errors.append(str(file.relative_to(ROOT)) + ': duplicate IDs')

for file, parsed in documents.items():
    for link in parsed.links:
        split = urlsplit(link)
        if split.scheme or split.netloc: continue
        checked += 1
        path = unquote(split.path)
        target = ROOT / path.lstrip('/') if path.startswith('/') else file.parent / path if path else file
        if target.is_dir(): target /= 'index.html'
        if not target.exists():
            errors.append(str(file.relative_to(ROOT)) + ': broken link ' + link)
        elif split.fragment and target in documents and split.fragment not in documents[target].ids:
            errors.append(str(file.relative_to(ROOT)) + ': missing anchor ' + link)

for route in ('snow-push/support', 'snow-push/privacy', 'christmas-breaker/support', 'christmas-breaker/privacy'):
    if not (ROOT / route / 'index.html').exists(): errors.append('Missing route: ' + route)
print(json.dumps({'htmlPages':len(documents),'internalLinksAndAssets':checked,'errors':errors}, indent=2))
raise SystemExit(1 if errors else 0)
