import ast
import io
import sys
import tokenize
from collections.abc import Sequence
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path

from tools.source_files import source_files

SUPPRESSION_MARKERS = ("noqa", "type:", "pyright:", "ruff:", "pragma:", "fmt:")
DocstringOwner = ast.Module | ast.ClassDef | ast.FunctionDef | ast.AsyncFunctionDef


class ViolationKind(StrEnum):
    COMMENT = "comment"
    SUPPRESSION = "suppression"
    DOCSTRING = "docstring"


@dataclass(frozen=True)
class Violation:
    path: Path
    line: int
    kind: ViolationKind

    def render(self) -> str:
        return f"{self.path}:{self.line}: {self.kind}"


def _comment_kind(text: str) -> ViolationKind:
    body = text.lstrip("#").strip().lower()
    if body.startswith(SUPPRESSION_MARKERS):
        return ViolationKind.SUPPRESSION
    return ViolationKind.COMMENT


def _comment_violations(path: Path, source: str) -> list[Violation]:
    tokens = tokenize.generate_tokens(io.StringIO(source).readline)
    return [
        Violation(path, token.start[0], _comment_kind(token.string))
        for token in tokens
        if token.type == tokenize.COMMENT
    ]


def _docstring_violations(path: Path, source: str) -> list[Violation]:
    return [
        Violation(path, node.body[0].lineno, ViolationKind.DOCSTRING)
        for node in ast.walk(ast.parse(source))
        if isinstance(node, DocstringOwner)
        and ast.get_docstring(node, clean=False) is not None
    ]


def find_violations(path: Path, source: str) -> list[Violation]:
    found = _comment_violations(path, source) + _docstring_violations(path, source)
    return sorted(found, key=lambda violation: violation.line)


def main(argv: Sequence[str]) -> int:
    [root] = argv
    violations = [
        violation
        for path in source_files(Path(root), frozenset({".py"}))
        for violation in find_violations(path, path.read_text(encoding="utf-8"))
    ]
    for violation in violations:
        sys.stdout.write(violation.render() + "\n")
    return 1 if violations else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
