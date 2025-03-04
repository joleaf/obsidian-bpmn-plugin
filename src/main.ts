import {Plugin, WorkspaceLeaf, parseYaml, setIcon} from "obsidian";
import {ObsidianBpmnPluginSettings, ObsidianBpmnPluginSettingsTab} from "./settings";
import NavigatedViewer from "bpmn-js/lib/NavigatedViewer";
import BpmnViewer from "bpmn-js/lib/Viewer";
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

export default class ObsidianBPMNPlugin extends Plugin {
    settings: ObsidianBpmnPluginSettings;

    async onload() {
        console.log("BPMN loading...");
        // Add settings
        this.settings = Object.assign(new ObsidianBpmnPluginSettings(), await this.loadData());
        this.addSettingTab(new ObsidianBpmnPluginSettingsTab(this.app, this));

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
                el.createEl("h3", {text: "BPMN parameters invalid: \n" + e.message});
                return;
            }

            console.log("Try to render a BPMN")
            try {
                if (parameters.url.startsWith("./")) {
                    const filePath = ctx.sourcePath;
                    const folderPath = filePath.substring(0, filePath.lastIndexOf("/"));
                    parameters.url = folderPath + "/" + parameters.url.substring(2, parameters.url.length);
                }

                const rootDiv = el.createEl("div");

                if (parameters.opendiagram) {
                    const href = rootDiv.createEl("a", {text: "Open diagram"});
                    href.href = parameters.url;
                    href.className = "internal-link";
                    setIcon(href, "file-edit");
                }
                let bpmn_view_classes = "bpmn-view"
                const bpmnDiv = rootDiv.createEl("div", {cls: bpmn_view_classes});
                if (parameters.forcewhitebackground) {
                    bpmnDiv.addClass("bpmn-view-white-background");
                } else {
                    // @ts-ignore
                    const theme = this.app.getTheme();
                    if (theme === 'obsidian') {
                        bpmnDiv.addClass("bpmn-view-obsidian-theme");
                    } else if (theme === 'moonstone') {
                        bpmnDiv.addClass("bpmn-view-moonstone-theme");
                    }
                }
                const xml = await this.app.vault.adapter.read(parameters.url);
                bpmnDiv.setAttribute("style", "height: " + parameters.height + "px;");
                let modules = [];
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
                bpmn.importXML(xml).then(function (result: { warnings: any; }) {
                    const canvas = bpmn.get('canvas');
                    if (p_zoom === undefined) {
                        canvas.zoom('fit-viewport');
                    } else {
                        canvas.zoom(p_zoom, {x: p_x, y: p_y});
                    }
                }).catch(function (err: { warnings: any; message: any; }) {
                    const {warnings, message} = err;
                    console.error('something went wrong:', warnings, message);
                    bpmn.destroy();
                    rootDiv.createEl("h3", {text: warnings + " " + message});
                });
                if (parameters.showzoom && parameters.enablepanzoom) {
                    const zoomDiv = rootDiv.createEl("div");
                    const zoomInBtn = zoomDiv.createEl("button", {"text": "+"});
                    zoomInBtn.addEventListener("click", (e: Event) => bpmn.get('zoomScroll').stepZoom(0.5));
                    const zoomOutBtn = zoomDiv.createEl("button", {"text": "-"});
                    zoomOutBtn.addEventListener("click", (e: Event) => bpmn.get('zoomScroll').stepZoom(-0.5));
                    setIcon(zoomInBtn, "zoom-in");
                    setIcon(zoomOutBtn, "zoom-out");
                }
            } catch (error) {
                el.createEl("h3", {text: error});
                console.error(error);
            }
        });
        // Add icon
        this.addRibbonIcon("file-input", "New BPMN", async () => {
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
        });
    }

    private readParameters(jsonString: string) {
        if (jsonString.contains("[[") && !jsonString.contains('"[[')) {
            jsonString = jsonString.replace("[[", '"[[');
            jsonString = jsonString.replace("]]", ']]"');
        }

        const parameters: BpmnNodeParameters = parseYaml(jsonString);

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
        console.log("Unloading BPMN plugin...");
    }
}
