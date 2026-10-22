from pathlib import Path

import pytest

from tools.check_line_cap import overlong_files
from tools.tests.script_runner import run_tool_script


def write_lines(path: Path, count: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("x = 1\n" * count, encoding="utf-8")


def test_file_of_400_lines_passes(tmp_path: Path) -> None:
    write_lines(tmp_path / "ok.py", 400)

    assert overlong_files(tmp_path) == []


def test_file_of_401_lines_fails(tmp_path: Path) -> None:
    write_lines(tmp_path / "long.py", 401)

    assert overlong_files(tmp_path) == [(tmp_path / "long.py", 401)]


@pytest.mark.parametrize("name", ["view.ts", "view.tsx"])
def test_typescript_files_are_capped(tmp_path: Path, name: str) -> None:
    write_lines(tmp_path / name, 401)

    assert overlong_files(tmp_path) == [(tmp_path / name, 401)]


def test_other_file_types_are_not_capped(tmp_path: Path) -> None:
    write_lines(tmp_path / "data.csv", 401)

    assert overlong_files(tmp_path) == []


def test_generated_schema_is_not_capped(tmp_path: Path) -> None:
    write_lines(tmp_path / "frontend/src/api/schema.ts", 401)

    assert overlong_files(tmp_path) == []


@pytest.mark.parametrize(
    "directory",
    ["node_modules/pkg", ".venv/lib", "frontend/tools/canaries", "frontend/dist"],
)
def test_excluded_directories_are_not_capped(tmp_path: Path, directory: str) -> None:
    write_lines(tmp_path / directory / "long.ts", 401)

    assert overlong_files(tmp_path) == []


def test_cli_fails_and_names_overlong_file(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    write_lines(tmp_path / "long.py", 401)

    assert run_tool_script("check_line_cap", str(tmp_path)) == 1
    assert capsys.readouterr().out == f"{tmp_path / 'long.py'}: 401 lines (max 400)\n"


def test_cli_passes_when_every_file_fits(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    write_lines(tmp_path / "ok.py", 400)

    assert run_tool_script("check_line_cap", str(tmp_path)) == 0
    assert capsys.readouterr().out == ""
