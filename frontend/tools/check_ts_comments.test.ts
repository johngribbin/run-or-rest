import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkTree,
  findViolations,
  listSourceFiles,
  render,
} from "./check_ts_comments.ts";

const CHECKER = path.join(import.meta.dirname, "check_ts_comments.ts");

function kinds(file: string, text: string): [number, string][] {
  return findViolations(file, text).map((violation) => [
    violation.line,
    violation.kind,
  ]);
}

function makeTree(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "ts-comments-"));
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), text);
  }
  return root;
}

describe("findViolations", () => {
  it("passes clean code with comment-like text in strings, templates, regexes and JSX", () => {
    const text = [
      'const url = "https://example.com // not a comment";',
      "const note = `/* not a comment */ ${url}`;",
      "const pattern = /\\/\\/ literal/;",
      "export const view = <p>// not a comment {note}</p>;",
      "export const matched = pattern.test(url);",
      "",
    ].join("\n");

    expect(findViolations("clean.tsx", text)).toEqual([]);
  });

  it("reports a line comment", () => {
    expect(kinds("a.ts", "const a = 1;\n// why\n")).toEqual([[2, "comment"]]);
  });

  it("reports a trailing line comment", () => {
    expect(kinds("a.ts", "const a = 1; // why\n")).toEqual([[1, "comment"]]);
  });

  it("reports a block comment", () => {
    expect(kinds("a.ts", "/* why */\nconst a = 1;\n")).toEqual([
      [1, "comment"],
    ]);
  });

  it("reports a JSDoc comment", () => {
    expect(kinds("a.ts", "/** Adds. */\nexport const a = 1;\n")).toEqual([
      [1, "comment"],
    ]);
  });

  it("reports a comment at the end of the file", () => {
    expect(kinds("a.ts", "const a = 1;\n\n// trailing\n")).toEqual([
      [3, "comment"],
    ]);
  });

  it("reports a comment inside a JSX expression", () => {
    const text = "export const v = (\n  <div>\n    {/* why */}\n  </div>\n);\n";

    expect(kinds("a.tsx", text)).toEqual([[3, "comment"]]);
  });

  it("reports a triple-slash directive", () => {
    expect(
      kinds("a.ts", '/// <reference types="vite/client" />\nconst a = 1;\n'),
    ).toEqual([[1, "triple-slash directive"]]);
  });

  it.each([
    "// eslint-disable-next-line @typescript-eslint/no-explicit-any",
    "/* eslint-disable */",
    "// @ts-ignore",
    "// @ts-expect-error",
    "// @ts-nocheck",
    "// prettier-ignore",
  ])("reports %s as a suppression", (comment) => {
    expect(kinds("a.ts", `${comment}\nconst a = 1;\n`)).toEqual([
      [1, "suppression"],
    ]);
  });
});

describe("checkTree", () => {
  it("checks .ts and .tsx files and skips other extensions", () => {
    const root = makeTree({
      "src/a.ts": "// a\n",
      "src/b.tsx": "// b\n",
      "src/c.js": "// c\n",
    });

    expect(checkTree(root).map(render)).toEqual([
      `${path.join("src", "a.ts")}:1: comment`,
      `${path.join("src", "b.tsx")}:1: comment`,
    ]);
  });

  it("skips the generated schema, canaries, dist and node_modules", () => {
    const root = makeTree({
      "src/api/schema.ts": "// generated\n",
      "tools/canaries/any.ts": "// canary\n",
      "dist/out.ts": "// built\n",
      "node_modules/pkg/index.ts": "// vendored\n",
      "src/ok.ts": "export const ok = 1;\n",
    });

    expect(listSourceFiles(root)).toEqual([path.join("src", "ok.ts")]);
    expect(checkTree(root)).toEqual([]);
  });
});

describe("command line", () => {
  function runChecker(root: string) {
    return spawnSync(process.execPath, [CHECKER], {
      cwd: root,
      encoding: "utf8",
    });
  }

  it("exits 1 and lists violations", () => {
    const result = runChecker(
      makeTree({ "src/a.ts": "const a = 1; // why\n" }),
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toBe(`${path.join("src", "a.ts")}:1: comment\n`);
  });

  it("exits 0 on a clean tree", () => {
    const result = runChecker(
      makeTree({ "src/a.ts": "export const a = 1;\n" }),
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });
});
