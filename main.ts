import {Plugin, WorkspaceLeaf, parseYaml} from "obsidian";
import {ObsidianBpmnPluginSettings, ObsidianBpmnPluginSettingsTab} from "./settings";
import BpmnViewer from "bpmn-js/lib/NavigatedViewer";
import {BpmnModelerView, VIEW_TYPE_BPMN} from "./bpmnModeler"

interface BpmnNodeParameters {
    url: string;
    opendiagram: boolean;
    showzoom: boolean;
    height: number;
    zoom: number;
    x: number;
    y: number;
    forcewhitebackground: boolean;
}

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
            (leaf: WorkspaceLeaf) => new BpmnModelerView(leaf)
        );
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
                }
                const bpmnDiv = rootDiv.createEl("div", {cls: "bpmn-view"});
                if (parameters.forcewhitebackground) {
                    bpmnDiv.addClass("bpmn-view-white-background");
                } else {
                    // @ts-ignore
                    const theme = app.getTheme();
                    if (theme === 'obsidian') {
                        bpmnDiv.addClass("bpmn-view-obsidian-theme");
                    } else if (theme === 'moonstone') {
                        bpmnDiv.addClass("bpmn-view-moonstone-theme");
                    }
                }
                const xml = await this.app.vault.adapter.read(parameters.url);
                bpmnDiv.setAttribute("style", "height: " + parameters.height + "px;");
                const bpmn = new BpmnViewer({
                    container: bpmnDiv,
                    keyboard: {
                        bindTo: bpmnDiv.win
                    }
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
                    console.log('something went wrong:', warnings, message);
                    bpmn.destroy();
                    rootDiv.createEl("h3", {text: warnings + " " + message});
                });
                if (parameters.showzoom) {
                    const zoomDiv = rootDiv.createEl("div");
                    const zoomInBtn = zoomDiv.createEl("button", {"text": "+"});
                    zoomInBtn.addEventListener("click", (e: Event) => bpmn.get('zoomScroll').stepZoom(0.5));
                    const zoomOutBtn = zoomDiv.createEl("button", {"text": "-"});
                    zoomOutBtn.addEventListener("click", (e: Event) => bpmn.get('zoomScroll').stepZoom(-0.5));
                }
            } catch (error) {
                el.createEl("h3", {text: error});
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
