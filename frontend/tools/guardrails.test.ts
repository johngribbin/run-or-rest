import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ESLint } from "eslint";
import prettier from "prettier";
import { describe, expect, it } from "vitest";

const FRONTEND_DIR = path.resolve(import.meta.dirname, "..");
const CANARIES = path.join(import.meta.dirname, "canaries");
const TSC = path.join(FRONTEND_DIR, "node_modules", "typescript", "bin", "tsc");

async function eslintRuleIds(canary: string): Promise<(string | null)[]> {
  const eslint = new ESLint({ cwd: FRONTEND_DIR, ignore: false });
  const results = await eslint.lintFiles([path.join(CANARIES, canary)]);
  return results.flatMap((result) =>
    result.messages.map((message) => message.ruleId),
  );
}

describe("ESLint canaries", () => {
  it.each([
    ["explicit_any.ts", "@typescript-eslint/no-explicit-any"],
    ["type_assertion.ts", "@typescript-eslint/consistent-type-assertions"],
    ["complexity.ts", "complexity"],
  ])("%s fails with %s", async (canary, rule) => {
    expect(await eslintRuleIds(canary)).toEqual([rule]);
  });
});

describe("TypeScript strict canary", () => {
  it("fails implicit_any.ts with TS7006 and nothing else", () => {
    const result = spawnSync(
      process.execPath,
      [
        TSC,
        "--noEmit",
        "--pretty",
        "false",
        "-p",
        path.join(CANARIES, "tsconfig.json"),
      ],
      { cwd: FRONTEND_DIR, encoding: "utf8" },
    );

    const errors = result.stdout.trim().split("\n");
    expect(result.status).toBe(2);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("implicit_any.ts");
    expect(errors[0]).toContain("error TS7006");
  });
});

describe("Prettier canary", () => {
  it("reports unformatted.ts as not formatted", async () => {
    const file = path.join(CANARIES, "unformatted.ts");
    const options = await prettier.resolveConfig(file, {
      config: path.join(FRONTEND_DIR, ".prettierrc.json"),
    });

    const formatted = await prettier.check(readFileSync(file, "utf8"), {
      ...options,
      filepath: file,
    });

    expect(options).not.toBeNull();
    expect(formatted).toBe(false);
  });
});
