"""Copy the app into an existing homepage checkout without build dependencies."""
import shutil
import sys
from pathlib import Path

source = Path(__file__).resolve().parent.parent
destination = Path(sys.argv[1]).resolve() / 'hypertextify'
destination.mkdir(parents=True, exist_ok=True)
if source == destination:
    print(destination)
    sys.exit(0)
for name in ('index.html', 'app.js', 'core.js', 'styles.css', 'theme.css', 'starfield.js', 'README.md', 'AGENTS.md', 'package.json', '.gitignore'):
    shutil.copy2(source / name, destination / name)
for name in ('fonts', 'vendor', 'test', 'scripts'):
    shutil.copytree(source / name, destination / name, dirs_exist_ok=True)
print(destination)
