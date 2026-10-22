from pathlib import Path

import pytest

from tools.check_python_source import Violation, ViolationKind, find_violations
from tools.tests.script_runner import run_tool_script

SOURCE_PATH = Path("example.py")


def kinds_by_line(source: str) -> list[tuple[int, ViolationKind]]:
    return [
        (violation.line, violation.kind)
        for violation in find_violations(SOURCE_PATH, source)
    ]


def test_clean_source_has_no_violations() -> None:
    source = (
        "from pydantic import BaseModel, Field\n"
        "\n"
        "\n"
        "class Period(BaseModel):\n"
        '    start_utc: str = Field(description="Window start # in UTC")\n'
        "\n"
        "\n"
        "def label() -> str:\n"
        '    text = "# not a comment"\n'
        "    return text\n"
    )

    assert find_violations(SOURCE_PATH, source) == []


def test_full_line_comment_is_reported() -> None:
    assert kinds_by_line("x = 1\n# explains x\n") == [(2, ViolationKind.COMMENT)]


def test_trailing_comment_is_reported() -> None:
    assert kinds_by_line("x = 1  # explains x\n") == [(1, ViolationKind.COMMENT)]


@pytest.mark.parametrize(
    "comment",
    [
        "# noqa: E501",
        "# type: ignore[arg-type]",
        "# pyright: ignore[reportUnknownMemberType]",
        "# ruff: noqa",
        "# pragma: no cover",
        "# fmt: off",
    ],
)
def test_suppression_comment_is_reported_as_suppression(comment: str) -> None:
    assert kinds_by_line(f"x = 1  {comment}\n") == [(1, ViolationKind.SUPPRESSION)]


def test_module_docstring_is_reported() -> None:
    assert kinds_by_line('"""Module."""\nx = 1\n') == [(1, ViolationKind.DOCSTRING)]


def test_class_docstring_is_reported() -> None:
    source = 'class Fleet:\n    """Fleet."""\n'

    assert kinds_by_line(source) == [(2, ViolationKind.DOCSTRING)]


def test_function_docstring_is_reported() -> None:
    source = 'def run() -> None:\n    """Run."""\n'

    assert kinds_by_line(source) == [(2, ViolationKind.DOCSTRING)]


def test_async_function_docstring_is_reported() -> None:
    source = 'async def run() -> None:\n    """Run."""\n'

    assert kinds_by_line(source) == [(2, ViolationKind.DOCSTRING)]


def test_empty_docstring_is_reported() -> None:
    source = 'def run() -> None:\n    ""\n'

    assert kinds_by_line(source) == [(2, ViolationKind.DOCSTRING)]


def test_string_after_first_statement_is_not_a_docstring() -> None:
    source = 'def run() -> None:\n    x = 1\n    "later"\n    print(x)\n'

    assert find_violations(SOURCE_PATH, source) == []


def test_violation_renders_path_line_and_kind() -> None:
    violation = Violation(Path("src/a.py"), 3, ViolationKind.SUPPRESSION)

    assert violation.render() == "src/a.py:3: suppression"


def test_cli_fails_and_lists_violations(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    (tmp_path / "bad.py").write_text("x = 1  # why\n", encoding="utf-8")
    (tmp_path / "good.py").write_text("x = 1\n", encoding="utf-8")

    assert run_tool_script("check_python_source", str(tmp_path)) == 1
    assert capsys.readouterr().out == f"{tmp_path / 'bad.py'}:1: comment\n"


def test_cli_passes_clean_tree(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    (tmp_path / "good.py").write_text("x = 1\n", encoding="utf-8")

    assert run_tool_script("check_python_source", str(tmp_path)) == 0
    assert capsys.readouterr().out == ""


def test_cli_skips_canaries_and_virtualenv(tmp_path: Path) -> None:
    for directory in ("tools/canaries", ".venv/lib"):
        (tmp_path / directory).mkdir(parents=True)
        (tmp_path / directory / "bad.py").write_text("# why\n", encoding="utf-8")

    assert run_tool_script("check_python_source", str(tmp_path)) == 0
