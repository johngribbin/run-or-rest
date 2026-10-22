import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_DIR = BACKEND_DIR.parent
CANARIES = BACKEND_DIR / "tools" / "canaries"


def run(
    *args: str,
    cwd: Path = BACKEND_DIR,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=cwd,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )


def run_python_tool(
    *args: str,
    cwd: Path = BACKEND_DIR,
) -> subprocess.CompletedProcess[str]:
    return run(sys.executable, "-m", *args, cwd=cwd)


def run_make(
    target: str,
    *overrides: str,
    data_dir: Path,
) -> subprocess.CompletedProcess[str]:
    make = shutil.which("make")
    assert make is not None
    env = {**os.environ, "COVERAGE_FILE": str(data_dir / ".coverage")}
    return run(
        make,
        "--no-print-directory",
        "-C",
        str(REPO_DIR),
        target,
        *overrides,
        env=env,
    )


def ruff_codes(canary: str) -> list[tuple[int, str]]:
    result = run_python_tool(
        "ruff",
        "check",
        "--no-cache",
        "--no-force-exclude",
        "--output-format",
        "json",
        str(CANARIES / canary),
    )
    assert result.returncode == 1
    return [
        (finding["location"]["row"], finding["code"])
        for finding in json.loads(result.stdout)
    ]


@pytest.mark.parametrize(
    ("canary", "expected"),
    [
        ("lint_unused_import.py", [(1, "F401")]),
        ("complexity.py", [(4, "C901")]),
        ("any_import.py", [(1, "TID251")]),
        ("cast_call.py", [(1, "TID251")]),
        ("any_annotation.py", [(1, "TID251"), (4, "ANN401")]),
    ],
)
def test_ruff_canary_fails_with_expected_rule(
    canary: str,
    expected: list[tuple[int, str]],
) -> None:
    assert ruff_codes(canary) == expected


def test_ruff_format_canary_fails() -> None:
    canary = CANARIES / "unformatted.py"

    result = run_python_tool(
        "ruff",
        "format",
        "--check",
        "--no-cache",
        "--no-force-exclude",
        str(canary),
    )

    assert result.returncode == 1
    assert "1 file would be reformatted" in result.stdout


def test_pyright_strict_canary_fails_with_strict_rule() -> None:
    result = run_python_tool(
        "pyright",
        "--outputjson",
        str(CANARIES / "pyright_strict.py"),
    )

    report = json.loads(result.stdout)
    assert result.returncode == 1
    assert [diagnostic["rule"] for diagnostic in report["generalDiagnostics"]] == [
        "reportUnnecessaryIsInstance",
    ]


def copy_project(name: str, tmp_path: Path) -> Path:
    project = tmp_path / name
    shutil.copytree(CANARIES / name, project)
    return project


def test_coverage_gate_fails_on_partial_coverage(tmp_path: Path) -> None:
    project = copy_project("coverage_project", tmp_path)

    result = run_make(
        "coverage",
        f"COV_ARGS=-p no:cacheprovider --rootdir={project} --cov={project} {project}",
        f"LCOV={project / 'lcov.info'}",
        data_dir=project,
    )

    assert result.returncode != 0
    assert "Required test coverage of 100% not reached" in result.stdout


def test_crap_gate_fails_on_score_above_ten(tmp_path: Path) -> None:
    project = copy_project("crap_project", tmp_path)
    lcov = project / "lcov.info"
    measured = run_python_tool(
        "pytest",
        "-p",
        "no:cacheprovider",
        "--rootdir=.",
        "--cov=.",
        "--cov-branch",
        f"--cov-report=lcov:{lcov}",
        ".",
        cwd=project,
    )
    assert measured.returncode == 0

    result = run_make(
        "crap",
        f"CRAP_DIR={project}",
        "CRAP_PATHS=.",
        f"LCOV={lcov}",
        data_dir=project,
    )

    assert result.returncode != 0
    assert "bucket" in result.stdout
    assert "10.5" in result.stdout
