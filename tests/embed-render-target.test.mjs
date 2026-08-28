import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("embedded BPMN diagrams render inside their embed element", () => {
    const source = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
    const postProcessor = source.match(
        /\/\/ Add !\[\[\]\] embedding([\s\S]*?)\/\/ Add icon/
    );

    assert.ok(postProcessor, "BPMN embed post-processor should be registered");
    assert.match(
        postProcessor[1],
        /this\.renderBPMNBlock\(parameters,\s*embed,\s*ctx\)/,
        "embedded BPMN viewer should render inside the matched embed element"
    );
});
