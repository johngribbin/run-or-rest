from pathlib import Path

EXCLUDED_DIR_NAMES = frozenset(
    {
        ".cache",
        ".git",
        ".pytest_cache",
        ".ruff_cache",
        ".venv",
        "__pycache__",
        "canaries",
        "dist",
        "node_modules",
    },
)
GENERATED_FILES = frozenset({Path("frontend/src/api/schema.ts")})


def source_files(root: Path, suffixes: frozenset[str]) -> list[Path]:
    found: list[Path] = []
    for directory, dir_names, file_names in root.walk():
        dir_names[:] = sorted(set(dir_names) - EXCLUDED_DIR_NAMES)
        found.extend(
            directory / name
            for name in file_names
            if Path(name).suffix in suffixes
            and (directory / name).relative_to(root) not in GENERATED_FILES
        )
    return sorted(found)
