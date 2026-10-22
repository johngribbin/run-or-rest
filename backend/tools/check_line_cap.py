import sys
from collections.abc import Sequence
from pathlib import Path

from tools.source_files import source_files

MAX_LINES = 400
CHECKED_SUFFIXES = frozenset({".py", ".ts", ".tsx"})


def overlong_files(root: Path) -> list[tuple[Path, int]]:
    counted = (
        (path, len(path.read_text(encoding="utf-8").splitlines()))
        for path in source_files(root, CHECKED_SUFFIXES)
    )
    return [(path, lines) for path, lines in counted if lines > MAX_LINES]


def main(argv: Sequence[str]) -> int:
    [root] = argv
    overlong = overlong_files(Path(root))
    for path, lines in overlong:
        sys.stdout.write(f"{path}: {lines} lines (max {MAX_LINES})\n")
    return 1 if overlong else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
