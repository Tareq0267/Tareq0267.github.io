"""Photo helper for Adam & Alvy (us/).

    python us/tools/photos.py scan
        Lists every photo in us/inbox/ with the date it was taken (from the
        camera's EXIF data, else the file name, e.g. WhatsApp or IMG_2026...),
        and which folders have a notes.txt. Also writes us/inbox/_scan.txt.

    python us/tools/photos.py export "<inbox folder>" <photo> [<photo> ...] [--name slug]
        Prepares chosen photos for the site: turned upright, at most 1600px on
        the long side, JPEG, with ALL metadata removed (including GPS location).
        Saved to us/photos/<date>-<slug>/ and printed as paths for data.js.

The inbox is git-ignored; only the prepared copies in us/photos/ are published.
"""
import os
import re
import sys
from datetime import datetime

from PIL import Image, ImageOps

try:  # iPhone HEIC photos, if the optional plugin is installed
    import pillow_heif
    pillow_heif.register_heif_opener()
    HEIC = True
except ImportError:
    HEIC = False

US = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INBOX = os.path.join(US, 'inbox')
PHOTOS = os.path.join(US, 'photos')
IMAGE_EXT = {'.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'}
LONG_EDGE = 1600
QUALITY = 82

# file-name dates: WhatsApp Image 2026-09-26 at 20.01.24, IMG_20260926_201024,
# PXL_20260926_..., Screenshot_20260926-..., 20260926_201024, 2026-09-26 ...
NAME_PATTERNS = [
    re.compile(r'(?P<y>20\d\d)-(?P<m>\d\d)-(?P<d>\d\d) at (?P<H>\d\d)\.(?P<M>\d\d)\.(?P<S>\d\d)'),
    re.compile(r'(?P<y>20\d\d)(?P<m>\d\d)(?P<d>\d\d)[_-](?P<H>\d\d)(?P<M>\d\d)(?P<S>\d\d)'),
    re.compile(r'(?P<y>20\d\d)-(?P<m>\d\d)-(?P<d>\d\d)'),
    re.compile(r'(?P<y>20\d\d)(?P<m>\d\d)(?P<d>\d\d)'),
]


def taken(path):
    """(datetime, source) for when a photo was taken; source is exif, name or file."""
    try:
        with Image.open(path) as im:
            exif = im.getexif()
            raw = exif.get_ifd(0x8769).get(36867) or exif.get(306)   # DateTimeOriginal, DateTime
            if raw:
                return datetime.strptime(str(raw).strip()[:19], '%Y:%m:%d %H:%M:%S'), 'exif'
    except Exception:
        pass
    name = os.path.basename(path)
    for pat in NAME_PATTERNS:
        m = pat.search(name)
        if not m:
            continue
        g = {k: int(v) for k, v in m.groupdict().items()}
        try:
            return datetime(g['y'], g['m'], g['d'], g.get('H', 0), g.get('M', 0), g.get('S', 0)), 'name'
        except ValueError:
            continue
    return datetime.fromtimestamp(os.path.getmtime(path)), 'file'


def folders():
    for entry in sorted(os.listdir(INBOX)):
        full = os.path.join(INBOX, entry)
        if os.path.isdir(full) and not entry.startswith('_'):
            yield entry, full


def images(folder):
    return sorted(f for f in os.listdir(folder) if os.path.splitext(f)[1].lower() in IMAGE_EXT)


def scan():
    if not os.path.isdir(INBOX):
        sys.exit('No us/inbox/ folder yet.')
    out, total = [], 0
    for name, full in folders():
        files = images(full)
        total += len(files)
        notes = os.path.exists(os.path.join(full, 'notes.txt'))
        out.append(f'\n== {name}  ({len(files)} photos, {"notes.txt" if notes else "NO notes.txt"})')
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in ('.heic', '.heif') and not HEIC:
                out.append(f'   {f:<48} HEIC: export it as JPEG first (or: pip install pillow-heif)')
                continue
            when, src = taken(os.path.join(full, f))
            flag = '' if src != 'file' else '   (guess: file date, may be wrong)'
            try:
                with Image.open(os.path.join(full, f)) as im:
                    size = f'{im.width}x{im.height}'
            except Exception:
                size = 'unreadable'
            out.append(f'   {f:<48} {when:%Y-%m-%d %H:%M}  {src:<4}  {size}{flag}')
    out.insert(0, f'{total} photos in {sum(1 for _ in folders())} folders')
    text = '\n'.join(out)
    print(text)
    with open(os.path.join(INBOX, '_scan.txt'), 'w', encoding='utf-8') as fh:
        fh.write(text + '\n')


def slugify(text):
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-') or 'photos'


def export(args):
    slug = None
    if '--name' in args:
        i = args.index('--name')
        slug = slugify(args[i + 1])
        args = args[:i] + args[i + 2:]
    if len(args) < 2:
        sys.exit('usage: photos.py export "<inbox folder>" <photo> [<photo> ...] [--name slug]')
    folder = os.path.join(INBOX, args[0])
    files = args[1:]
    stamps = [taken(os.path.join(folder, f))[0] for f in files]
    first = min(stamps)
    # folder names like "2026-09-26 first date" give the slug for free
    label = re.sub(r'^\s*\d{4}-\d\d-\d\d\s*', '', args[0])
    dest = os.path.join(PHOTOS, f'{first:%Y-%m-%d}-{slug or slugify(label)}')
    os.makedirs(dest, exist_ok=True)
    existing = len([f for f in os.listdir(dest) if f.endswith('.jpg')])
    for n, (f, when) in enumerate(sorted(zip(files, stamps), key=lambda p: p[1]), start=existing + 1):
        with Image.open(os.path.join(folder, f)) as im:
            im = ImageOps.exif_transpose(im).convert('RGB')
            im.thumbnail((LONG_EDGE, LONG_EDGE), Image.LANCZOS)
            out = os.path.join(dest, f'{n:02d}.jpg')
            # saving without exif= drops every tag, GPS location included
            im.save(out, 'JPEG', quality=QUALITY, optimize=True, progressive=True)
        rel = os.path.relpath(out, US).replace(os.sep, '/')
        kb = os.path.getsize(out) // 1024
        print(f'{f}  ->  {rel}  ({when:%Y-%m-%d %H:%M}, {kb} KB)')


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'scan'
    if cmd == 'scan':
        scan()
    elif cmd == 'export':
        export(sys.argv[2:])
    else:
        sys.exit(__doc__)
