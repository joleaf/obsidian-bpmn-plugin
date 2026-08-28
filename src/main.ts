import {Plugin, WorkspaceLeaf, parseYaml, setIcon, MarkdownPostProcessorContext, TFile, MarkdownView, Notice } from "obsidian";
import {autocompletion, type Completion, type CompletionContext, type CompletionResult} from "@codemirror/autocomplete";
import {EditorState, type Text} from "@codemirror/state";
import {BPMN_BLOCK_PARAMETERS} from "./parameters";
import {BpmnBlockInsertModal} from "./bpmnBlockModal";
import {ObsidianBpmnPluginSettings, ObsidianBpmnPluginSettingsTab} from "./settings";
import NavigatedViewer from "bpmn-js/lib/NavigatedViewer";
import BpmnViewer from "bpmn-js/lib/Viewer";
import type {Canvas, ZoomScroll} from "diagram-js";
import type {ModuleDeclaration} from "didi";
import sketchyRendererModule from 'bpmn-js-sketchy';
import {BpmnModelerView, VIEW_TYPE_BPMN} from "./bpmnModeler"

interface BpmnNodeParameters {
    url: string;
    opendiagram: boolean;
    showzoom: boolean;
    enablepanzoom: boolean;
    height: number;
    zoom: number;
    x: number;
    y: number;
    forcewhitebackground: boolean;
}

const emptyBpmn = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<bpmn2:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd" id="sample-diagram" targetNamespace="http://bpmn.io/schema/bpmn">\n' +
    '  <bpmn2:process id="Process_1" isExecutable="false">\n' +
    '    <bpmn2:startEvent id="StartEvent_1"/>\n' +
    '  </bpmn2:process>\n' +
    '  <bpmndi:BPMNDiagram id="BPMNDiagram_1">\n' +
    '    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">\n' +
    '      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">\n' +
    '        <dc:Bounds height="36.0" width="36.0" x="412.0" y="240.0"/>\n' +
    '      </bpmndi:BPMNShape>\n' +
    '    </bpmndi:BPMNPlane>\n' +
    '  </bpmndi:BPMNDiagram>\n' +
    '</bpmn2:definitions>'

// Autocompletion for the code block's parameters, active only while the
// cursor is inside a ```bpmn fenced code block. It is registered through
// the editor's language data (the default source mechanism of the
// autocompletion extension) so it coexists with any other completions.
function isInsideBpmnFence(doc: Text, pos: number): boolean {
    const line = doc.lineAt(pos);
    for (let i = line.number - 1; i >= 1; i--) {
        const text = doc.line(i).text;
        if (!text.trimStart().startsWith("```")) continue;
        const info = text.trim().slice(3).split(/\s+/)[0]?.toLowerCase() ?? "";
        if (info !== "bpmn") return false;
        // the opening fence must still be open at the cursor line
        for (let j = i + 1; j < line.number; j++) {
            if (doc.line(j).text.trimStart().startsWith("```")) return false;
        }
        return true;
    }
    return false;
}

function bpmnParameterOptions(context: CompletionContext): CompletionResult | null {
    const line = context.state.doc.lineAt(context.pos);
    // only complete bare parameter keys, i.e. the "key" part before ": value"
    const match = line.text.match(/^\s*([a-z]*)$/i);
    if (!match) return null;
    const prefix = match[1];
    const options = BPMN_BLOCK_PARAMETERS
        .filter((p) => p.name.startsWith(prefix))
        .map((p): Completion => ({
            label: p.name,
            type: "property",
            info: p.description,
            detail: p.values,
            apply(view, completion, from, to) {
                view.dispatch(view.state.update({changes: {from, to, insert: completion.label + ": "}}));
            },
        }));
    if (options.length === 0) return null;
    return {from: line.from + (match[0].length - prefix.length), options};
}

function bpmnParameterActivate(context: CompletionContext): boolean {
    return isInsideBpmnFence(context.state.doc, context.pos);
}

// Carries both the new (function) and legacy (object) CompletionSource
// shapes, so the source works regardless of the bundled CM6 version.
const bpmnParameterSource = Object.assign(bpmnParameterOptions, {
    activate: bpmnParameterActivate,
    options: bpmnParameterOptions,
});

const bpmnBlockAutocompletion = [
    autocompletion(),
    EditorState.languageData.of((state: EditorState, pos: number) => {
        if (!isInsideBpmnFence(state.doc, pos)) return [];
        return [{autocomplete: bpmnParameterSource}];
    }),
];

export default class ObsidianBPMNPlugin extends Plugin {
    settings: ObsidianBpmnPluginSettings;

    async onload() {
        // Add settings
        this.settings = Object.assign(
            new ObsidianBpmnPluginSettings(),
            (await this.loadData()) as Partial<ObsidianBpmnPluginSettings>
        );
        this.addSettingTab(new ObsidianBpmnPluginSettingsTab(this.app, this));

        // Autocomplete the code block's parameters inside ```bpmn fences
        this.registerEditorExtension(bpmnBlockAutocompletion);

        // Add modeler
        this.registerView(
            VIEW_TYPE_BPMN,
            (leaf: WorkspaceLeaf) => new BpmnModelerView(leaf, this.settings)
        );
        // Register bpmn extension
        this.registerExtensions(["bpmn"], VIEW_TYPE_BPMN);
        // Add code block extension
        this.registerMarkdownCodeBlockProcessor("bpmn", async (src, el, ctx) => {
            // Get Parameters
            let parameters: BpmnNodeParameters | null = null;
            try {
                parameters = this.readParameters(src);
            } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                el.createEl("h3", {text: "BPMN parameters invalid: \n" + message});
                return;
            }
            await this.renderBPMNBlock(parameters, el, ctx);
        });
        // Add ![[]] embedding
        this.registerMarkdownPostProcessor((el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
            const embeds = el.querySelectorAll(".internal-embed");
            embeds.forEach((embed: HTMLElement) => {
                void this.renderBpmnEmbed(el, ctx, embed);
            });
        });

        // Insert / edit a code block via popup (only with a markdown file active)
        this.addCommand({
            id: "insert-bpmn-block",
            name: "Insert / Edit BPMN code block",
            callback: () => {
                const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (view == null) {
                    new Notice("BPMN: open a markdown file first.");
                    return;
                }
                try {
                    new BpmnBlockInsertModal(this.app, this.settings).open();
                } catch (e) {
                    new Notice("BPMN: " + (e instanceof Error ? e.message : String(e)));
                }
            },
        });

        // Create a new BPMN file in the vault
        this.addCommand({
            id: "create-bpmn",
            name: "Create BPMN",
            callback: () => {
                void this.createNewBpmn();
            },
        });

        // Add icon
        this.addRibbonIcon("file-input", "New BPMN", () => {
            void this.createNewBpmn();
        });
    }

    private async createNewBpmn() {
        let path = "/";
        const currentFile = this.app.workspace.getActiveFile();
        if (currentFile != null && currentFile.parent != null) {
            path = currentFile.parent.path + "/";
        }
        path += "model";
        // search for new non-existing file
        for (let i = 1; i < 99; i++) {
            const newPath = path + "_" + i + ".bpmn";
            if (!(await this.app.vault.adapter.exists(newPath))) {
                path = newPath;
                break;
            }
        }
        let newBpmnContent = emptyBpmn;
        // replace Process ID and Definition ID
        const randomId = (Math.random() + 1).toString(36).substring(7);
        newBpmnContent = newBpmnContent
            .replace("Process_1", "Process_" + randomId)
            .replace("BPMNDiagram_1", "BPMNDiagram_" + randomId)
            .replace("BPMNPlane_1", "BPMNPlane_" + randomId);
        let newBpmnFile = await this.app.vault.create(path, newBpmnContent);
        let leaf = this.app.workspace.getMostRecentLeaf();
        if (leaf != null) {
            await leaf.openFile(newBpmnFile);
        }
    }

    private async renderBpmnEmbed(el: HTMLElement, ctx: MarkdownPostProcessorContext, embed: HTMLElement) {
        const src = embed.getAttribute("src");
        if (!src || !src.endsWith(".bpmn")) return;
        const file = this.app.vault.getAbstractFileByPath(src);
        if (!(file instanceof TFile)) return;
        let parameters: BpmnNodeParameters | null = null;
        try {
            parameters = this.readParameters("url: " + file.path);
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            embed.createEl("h3", {text: "BPMN parameters invalid: \n" + message});
            return;
        }
        embed.innerHTML = "";
        await this.renderBPMNBlock(parameters, el, ctx);
        embed.addClass("bpmn-embed");
    }

    private async renderBPMNBlock(parameters: BpmnNodeParameters, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        try {
            if (parameters.url.startsWith("./")) {
                const filePath = ctx.sourcePath;
                const folderPath = filePath.substring(0, filePath.lastIndexOf("/"));
                parameters.url = folderPath + "/" + parameters.url.substring(2, parameters.url.length);
            }

            const rootDiv = el.createDiv();

            if (parameters.opendiagram) {
                const href = rootDiv.createEl("a", {text: "Open diagram"});
                href.href = parameters.url;
                href.className = "internal-link";
                setIcon(href, "file-edit");
            }
            let bpmn_view_classes = "bpmn-view"
            const bpmnDiv = rootDiv.createDiv({cls: bpmn_view_classes});
            if (parameters.forcewhitebackground) {
                bpmnDiv.addClass("bpmn-view-white-background");
            } else {
                const theme = this.app.getTheme();
                if (theme === 'obsidian') {
                    bpmnDiv.addClass("bpmn-view-obsidian-theme");
                } else if (theme === 'moonstone') {
                    bpmnDiv.addClass("bpmn-view-moonstone-theme");
                }
            }
            const xml = await this.app.vault.adapter.read(parameters.url);
            bpmnDiv.setAttribute("style", "height: " + parameters.height + "px;");
            let modules: ModuleDeclaration[] = [];
            if (this.settings.enable_sketchy) {
                modules.push(sketchyRendererModule);
            }
            let textRenderer = undefined;
            if (this.settings.enable_sketchy) {
                modules.push(sketchyRendererModule);
                textRenderer = {
                    defaultStyle: {
                        fontFamily: '"Comic Sans MS"',
                        fontWeight: 'normal',
                        fontSize: 14,
                        lineHeight: 1.1
                    },
                    externalStyle: {
                        fontSize: 14,
                        lineHeight: 1.1
                    }
                };
            }
            const bpmn = parameters.enablepanzoom ?
                new NavigatedViewer({
                    container: bpmnDiv,
                    additionalModules: modules,
                    textRenderer: textRenderer
                }) :
                new BpmnViewer({
                    container: bpmnDiv,
                    additionalModules: modules,
                    textRenderer: textRenderer
                });
            const p_zoom = parameters.zoom;
            const p_x = parameters.x;
            const p_y = parameters.y;
            bpmn.importXML(xml).then(() => {
                const canvas = bpmn.get<Canvas>('canvas');
                if (p_zoom === undefined) {
                    canvas.zoom('fit-viewport');
                } else {
                    canvas.zoom(p_zoom, {x: p_x, y: p_y});
                }
            }).catch((err) => {
                const e = err as Error & {warnings?: unknown[]};
                const details = Array.isArray(e.warnings) ? e.warnings.map(String) : [];
                details.push(e instanceof Error ? e.message : String(err));
                const message = details.join(" ");
                console.error('something went wrong:', message);
                bpmn.destroy();
                rootDiv.createEl("h3", {text: message});
            });
            if (parameters.showzoom && parameters.enablepanzoom) {
                const zoomDiv = rootDiv.createDiv();
                const zoomInBtn = zoomDiv.createEl("button", {"text": "+"});
                zoomInBtn.addEventListener("click", () => bpmn.get<ZoomScroll>('zoomScroll').stepZoom(0.5));
                const zoomOutBtn = zoomDiv.createEl("button", {"text": "-"});
                zoomOutBtn.addEventListener("click", () => bpmn.get<ZoomScroll>('zoomScroll').stepZoom(-0.5));
                setIcon(zoomInBtn, "zoom-in");
                setIcon(zoomOutBtn, "zoom-out");
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            el.createEl("h3", {text: message});
            console.error(message);
        }
    }

    private readParameters(yamlString: string) {
        if (yamlString.contains("[[") && !yamlString.contains('"[[')) {
            yamlString = yamlString.replace("[[", '"[[');
            yamlString = yamlString.replace("]]", ']]"');
        }

        const parameters = parseYaml(yamlString) as BpmnNodeParameters;

        //Transform internal Link to external
        if (parameters.url.startsWith("[[")) {
            parameters.url = parameters.url.substring(2, parameters.url.length - 2);
            // @ts-ignore
            parameters.url = this.app.metadataCache.getFirstLinkpathDest(
                parameters.url,
                ""
            ).path;
        }

        if (parameters.showzoom === undefined) {
            parameters.showzoom = this.settings.showzoom_by_default;
        }

        if (parameters.enablepanzoom === undefined) {
            parameters.enablepanzoom = this.settings.enablepanzoom_by_default;
        }

        if (parameters.opendiagram === undefined) {
            parameters.opendiagram = this.settings.opendiagram_by_default;
        }

        if (parameters.height === undefined) {
            parameters.height = this.settings.height_by_default;
        }

        if (parameters.x === undefined) {
            parameters.x = 0;
        }
        parameters.x *= 10

        if (parameters.y === undefined) {
            parameters.y = 0;
        }
        parameters.y *= 10

        if (parameters.forcewhitebackground === undefined) {
            parameters.forcewhitebackground = this.settings.force_white_background_by_default;
        }

        return parameters;
    }

    onunload() {
    }
}
