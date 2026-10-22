import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

export type ViolationKind =
  "comment" | "suppression" | "triple-slash directive";

export interface Violation {
  readonly file: string;
  readonly line: number;
  readonly kind: ViolationKind;
}

const EXCLUDED_DIR_NAMES = new Set(["node_modules", "dist", "canaries"]);
const GENERATED_FILES = new Set([path.join("src", "api", "schema.ts")]);
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const TRIPLE_SLASH = /^\/\/\/\s*</;
const SUPPRESSION =
  /^\/[/*]\s*(eslint-disable|eslint-enable|eslint\s|global\s|@ts-ignore|@ts-expect-error|@ts-nocheck|prettier-ignore|istanbul\s|c8\s|v8\s)/;

function classify(comment: string): ViolationKind {
  if (TRIPLE_SLASH.test(comment)) {
    return "triple-slash directive";
  }
  if (SUPPRESSION.test(comment)) {
    return "suppression";
  }
  return "comment";
}

function scriptKind(file: string): ts.ScriptKind {
  return file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

function collectRanges(
  source: ts.SourceFile,
  node: ts.Node,
  ranges: Map<number, ts.CommentRange>,
  jsxText: ts.TextRange[],
): void {
  if (node.kind === ts.SyntaxKind.JsxText) {
    jsxText.push({ pos: node.getStart(source), end: node.getEnd() });
  }
  const text = source.getFullText();
  const found = [
    ...(ts.getLeadingCommentRanges(text, node.getFullStart()) ?? []),
    ...(ts.getTrailingCommentRanges(text, node.getEnd()) ?? []),
  ];
  for (const range of found) {
    ranges.set(range.pos, range);
  }
  for (const child of node.getChildren(source)) {
    collectRanges(source, child, ranges, jsxText);
  }
}

export function findViolations(file: string, text: string): Violation[] {
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(file),
  );
  const ranges = new Map<number, ts.CommentRange>();
  const jsxText: ts.TextRange[] = [];
  collectRanges(source, source, ranges, jsxText);
  return [...ranges.values()]
    .filter(
      (range) =>
        !jsxText.some((span) => range.pos >= span.pos && range.pos < span.end),
    )
    .sort((left, right) => left.pos - right.pos)
    .map((range) => ({
      file,
      line: source.getLineAndCharacterOfPosition(range.pos).line + 1,
      kind: classify(text.slice(range.pos, range.end)),
    }));
}

export function listSourceFiles(root: string, relative = ""): string[] {
  return readdirSync(path.join(root, relative), { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const entryPath = path.join(relative, entry.name);
      if (entry.isDirectory()) {
        return EXCLUDED_DIR_NAMES.has(entry.name)
          ? []
          : listSourceFiles(root, entryPath);
      }
      const checked =
        SOURCE_EXTENSIONS.has(path.extname(entry.name)) &&
        !GENERATED_FILES.has(entryPath);
      return checked ? [entryPath] : [];
    });
}

export function checkTree(root: string): Violation[] {
  return listSourceFiles(root).flatMap((file) =>
    findViolations(file, readFileSync(path.join(root, file), "utf8")),
  );
}

export function render(violation: Violation): string {
  return `${violation.file}:${String(violation.line)}: ${violation.kind}`;
}

if (import.meta.main) {
  const violations = checkTree(process.cwd());
  for (const violation of violations) {
    process.stdout.write(`${render(violation)}\n`);
  }
  process.exitCode = violations.length > 0 ? 1 : 0;
}
