import os
import shutil
import subprocess
from pathlib import Path

import pytest

MAKEFILE = Path(__file__).resolve().parents[3] / "Makefile"
KEY = "GRIDSTATUS_API_KEY"
PRINT_KEY_INSTEAD_OF_FETCHING = f"BACKEND=printenv {KEY}; exit 0;"


def key_seen_by_fetch(
    directory: Path,
    dotenv: str | None,
    exported: str | None,
) -> str:
    if dotenv is not None:
        (directory / ".env").write_text(dotenv, encoding="utf-8")
    env = {
        name: value
        for name, value in os.environ.items()
        if name not in {KEY, "MAKEFLAGS", "MFLAGS", "MAKELEVEL"}
    }
    if exported is not None:
        env[KEY] = exported
    make = shutil.which("make")
    assert make is not None
    result = subprocess.run(
        [
            make,
            "-s",
            "-C",
            str(directory),
            "-f",
            str(MAKEFILE),
            "fetch",
            PRINT_KEY_INSTEAD_OF_FETCHING,
        ],
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )
    assert result.returncode == 0, result.stderr
    return result.stdout.strip()


@pytest.mark.parametrize(
    ("dotenv", "exported", "expected"),
    [
        ("GRIDSTATUS_API_KEY=from-dotenv\n", None, "from-dotenv"),
        (None, "from-shell", "from-shell"),
        ("GRIDSTATUS_API_KEY=from-dotenv\n", "from-shell", "from-shell"),
        ("GRIDSTATUS_API_KEY=\n", "from-shell", "from-shell"),
    ],
)
def test_fetch_gets_the_key_from_dotenv_or_the_environment(
    tmp_path: Path,
    dotenv: str | None,
    exported: str | None,
    expected: str,
) -> None:
    assert key_seen_by_fetch(tmp_path, dotenv, exported) == expected


def test_fetch_without_any_key_passes_an_empty_key(tmp_path: Path) -> None:
    assert key_seen_by_fetch(tmp_path, None, None) == ""
