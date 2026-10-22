import json
from pathlib import Path

from tools.export_openapi import main
from tools.tests.script_runner import run_tool_script


def read_title(path: Path) -> str:
    return str(json.loads(path.read_text(encoding="utf-8"))["info"]["title"])


def test_writes_the_app_openapi_document_creating_parents(tmp_path: Path) -> None:
    output = tmp_path / "nested" / "openapi.json"

    assert main([str(output)]) == 0
    assert read_title(output) == "Run or Rest"


def test_cli_exits_zero_after_writing(tmp_path: Path) -> None:
    output = tmp_path / "openapi.json"

    assert run_tool_script("export_openapi", str(output)) == 0
    assert read_title(output) == "Run or Rest"
