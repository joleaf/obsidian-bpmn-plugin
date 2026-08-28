import {App, Editor, MarkdownView, Modal, Notice, parseYaml, Setting, SuggestModal, TextComponent, TFile} from 'obsidian';
import {BPMN_BLOCK_PARAMETERS} from "./parameters";
import {ObsidianBpmnPluginSettings} from "./settings";

// Suggest modal filtered to the *.bpmn files of the vault (for the URL field).
class BpmnFileSuggestModal extends SuggestModal<TFile> {
    private onChooseFile: (path: string) => void;

    constructor(app: App, onChooseFile: (path: string) => void) {
        super(app);
        this.onChooseFile = onChooseFile;
        this.setPlaceholder("Choose a *.bpmn file...");
    }

    getSuggestions(query: string): TFile[] {
        const q = query.toLowerCase();
        return this.app.vault.getFiles().filter((file) => file.path.endsWith(".bpmn") && file.path.toLowerCase().includes(q));
    }

    renderSuggestion(file: TFile, el: HTMLElement): void {
        el.createDiv({text: file.path});
    }

    onChooseSuggestion(file: TFile): void {
        this.onChooseFile(file.path);
    }
}

// Finds the ```bpmn fence containing the cursor and returns its range
// (document offsets, so it can be replaced with Editor.replaceRange) and body.
function findBpmnFence(editor: Editor): {start: number; end: number; body: string} | null {
    const cursorLine = editor.getCursor().line;
    for (let i = cursorLine - 1; i >= 0; i--) {
        const text = editor.getLine(i);
        if (!text.trimStart().startsWith("```")) continue;
        const info = text.trim().slice(3).split(/\s+/)[0]?.toLowerCase() ?? "";
        if (info !== "bpmn") return null;
        // a closing fence above the cursor means the cursor is outside this fence
        for (let j = i + 1; j < cursorLine; j++) {
            if (editor.getLine(j).trimStart().startsWith("```")) return null;
        }
        const bodyLines: string[] = [];
        let closeLine = editor.lastLine();
        for (let j = i + 1; j <= editor.lastLine(); j++) {
            if (editor.getLine(j).trimStart().startsWith("```")) {
                closeLine = j;
                break;
            }
            bodyLines.push(editor.getLine(j));
        }
        const closeText = editor.getLine(closeLine);
        return {
            start: editor.posToOffset({line: i, ch: 0}),
            end: editor.posToOffset({line: closeLine, ch: closeText.length}),
            body: bodyLines.join("\n"),
        };
    }
    return null;
}

// The values edited in the popup, mirroring the ```bpmn code block parameters.
interface BpmnBlockValues {
    url: string;
    height: number;
    opendiagram: boolean;
    showzoom: boolean;
    enablepanzoom: boolean;
    zoom: string;
    x: string;
    y: string;
    forcewhitebackground: boolean;
}

export class BpmnBlockInsertModal extends Modal {
    private values: BpmnBlockValues;
    private urlInput: TextComponent | null = null;
    // If the cursor is inside an existing ```bpmn block, its range — Insert then
    // replaces that block (edit) instead of creating a new one below the cursor.
    private existingFence: {start: number; end: number} | null;

    constructor(app: App, settings: ObsidianBpmnPluginSettings) {
        super(app);
        this.existingFence = null;
        this.values = {
            url: "",
            height: settings.height_by_default,
            opendiagram: settings.opendiagram_by_default,
            showzoom: settings.showzoom_by_default,
            enablepanzoom: settings.enablepanzoom_by_default,
            zoom: "",
            x: "",
            y: "",
            forcewhitebackground: settings.force_white_background_by_default,
        };

        // "Edit": if the cursor is inside an existing ```bpmn block, pre-fill
        // from it (defaults are kept for anything the block does not set).
        const view = app.workspace.getActiveViewOfType(MarkdownView);
        if (view) {
            const fence = findBpmnFence(view.editor);
            if (fence) {
                this.existingFence = {start: fence.start, end: fence.end};
                try {
                    const parsed = parseYaml(fence.body) as Record<string, unknown> | null;
                    if (parsed) {
                        if (typeof parsed["url"] === "string") this.values.url = parsed["url"];
                        if (typeof parsed["height"] === "number") this.values.height = parsed["height"];
                        if (typeof parsed["opendiagram"] === "boolean") this.values.opendiagram = parsed["opendiagram"];
                        if (typeof parsed["showzoom"] === "boolean") this.values.showzoom = parsed["showzoom"];
                        if (typeof parsed["enablepanzoom"] === "boolean") this.values.enablepanzoom = parsed["enablepanzoom"];
                        if (typeof parsed["zoom"] === "string" || typeof parsed["zoom"] === "number") this.values.zoom = String(parsed["zoom"]);
                        if (typeof parsed["x"] === "string" || typeof parsed["x"] === "number") this.values.x = String(parsed["x"]);
                        if (typeof parsed["y"] === "string" || typeof parsed["y"] === "number") this.values.y = String(parsed["y"]);
                        if (typeof parsed["forcewhitebackground"] === "boolean") this.values.forcewhitebackground = parsed["forcewhitebackground"];
                    }
                } catch {
                    // block does not parse — keep the defaults
                }
            }
        }
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.createEl("h2", {text: this.existingFence ? "Edit BPMN code block" : "Insert BPMN code block"});
        const desc = (name: string) => BPMN_BLOCK_PARAMETERS.find((p) => p.name === name)?.description ?? "";

        new Setting(contentEl)
            .setName("URL")
            .setDesc(desc("url"))
            .addText((text) => {
                this.urlInput = text;
                text.setPlaceholder("folder/my-diagram.bpmn");
                text.setValue(this.values.url);
                text.inputEl.addEventListener("change", () => {
                    this.values.url = text.inputEl.value.trim();
                });
            })
            .addButton((button) =>
                button
                    .setButtonText("Browse...")
                    .setTooltip("Choose a *.bpmn file from the vault")
                    .onClick(() => {
                        new BpmnFileSuggestModal(this.app, (path) => {
                            this.values.url = path;
                            if (this.urlInput) this.urlInput.setValue(path);
                        }).open();
                    })
            );

        new Setting(contentEl)
            .setName("Height")
            .setDesc(desc("height"))
            .addSlider((slider) =>
                slider
                    .setLimits(200, 1000, 20)
                    .setValue(this.values.height)
                    .onChange((value) => {
                        this.values.height = value;
                    })
            );

        new Setting(contentEl)
            .setName("Open diagram link")
            .setDesc(desc("opendiagram"))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.values.opendiagram)
                    .onChange((value) => {
                        this.values.opendiagram = value;
                    })
            );

        new Setting(contentEl)
            .setName("Zoom buttons")
            .setDesc(desc("showzoom"))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.values.showzoom)
                    .onChange((value) => {
                        this.values.showzoom = value;
                    })
            );

        new Setting(contentEl)
            .setName("Pan & zoom")
            .setDesc(desc("enablepanzoom"))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.values.enablepanzoom)
                    .onChange((value) => {
                        this.values.enablepanzoom = value;
                    })
            );

        new Setting(contentEl)
            .setName("Zoom level")
            .setDesc(desc("zoom"))
            .addText((text) => {
                text.setPlaceholder("empty = fit-viewport");
                text.setValue(this.values.zoom);
                text.inputEl.addEventListener("change", () => {
                    this.values.zoom = text.inputEl.value.trim();
                });
            });

        new Setting(contentEl)
            .setName("X coordinate")
            .setDesc(desc("x"))
            .addText((text) => {
                text.setPlaceholder("empty = 0");
                text.setValue(this.values.x);
                text.inputEl.addEventListener("change", () => {
                    this.values.x = text.inputEl.value.trim();
                });
            });

        new Setting(contentEl)
            .setName("Y coordinate")
            .setDesc(desc("y"))
            .addText((text) => {
                text.setPlaceholder("empty = 0");
                text.setValue(this.values.y);
                text.inputEl.addEventListener("change", () => {
                    this.values.y = text.inputEl.value.trim();
                });
            });

        new Setting(contentEl)
            .setName("White background")
            .setDesc(desc("forcewhitebackground"))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.values.forcewhitebackground)
                    .onChange((value) => {
                        this.values.forcewhitebackground = value;
                    })
            );

        new Setting(contentEl)
            .addButton((button) =>
                button
                    .setButtonText("Insert")
                    .setCta()
                    .onClick(() => {
                        this.insertBlock();
                        this.close();
                    })
            );
    }

    private insertBlock(): void {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view == null) {
            new Notice("BPMN: open a markdown file first.");
            return;
        }
        if (this.values.url === "") {
            new Notice("BPMN: the url parameter is required.");
            return;
        }
        const lines = ["url: " + this.values.url];
        lines.push("height: " + this.values.height);
        lines.push("opendiagram: " + this.values.opendiagram);
        lines.push("showzoom: " + this.values.showzoom);
        lines.push("enablepanzoom: " + this.values.enablepanzoom);
        if (this.values.zoom !== "") lines.push("zoom: " + this.values.zoom);
        if (this.values.x !== "") lines.push("x: " + this.values.x);
        if (this.values.y !== "") lines.push("y: " + this.values.y);
        lines.push("forcewhitebackground: " + this.values.forcewhitebackground);
        const block = "```bpmn\n" + lines.join("\n") + "\n```";

        const editor = view.editor;
        if (this.existingFence != null) {
            editor.replaceRange(block, editor.offsetToPos(this.existingFence.start), editor.offsetToPos(this.existingFence.end));
            return;
        }
        // Insert at the cursor position; keep the surrounding text on its own lines.
        const cursor = editor.getCursor();
        const lineText = editor.getLine(cursor.line);
        const before = lineText.substring(0, cursor.ch);
        const after = lineText.substring(cursor.ch);
        const insert = (before !== "" ? "\n" : "") + block + (after !== "" ? "\n" : "");
        editor.replaceRange(insert, cursor);
    }
}
