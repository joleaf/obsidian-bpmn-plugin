import {Plugin} from "obsidian";
import {ObsidianBpmnPluginSettings, ObsidianBpmnPluginSettingsTab} from "./settings";
import BpmnViewer from "bpmn-js/lib/NavigatedViewer";
import Modeler from "bpmn-js/lib/Modeler";

interface BpmnNodeParameters {
    url: string;
    readonly: boolean;
    opendiagram: boolean;
    height: number;
    zoom: number;
    x: number;
    y: number;
}

export default class ObsidianBPMNPlugin extends Plugin {
    settings: ObsidianBpmnPluginSettings;

    async onload() {
        console.log("BPMN loading...");

        this.settings = Object.assign(new ObsidianBpmnPluginSettings(), await this.loadData());
        this.addSettingTab(new ObsidianBpmnPluginSettingsTab(this.app, this));

        this.registerMarkdownCodeBlockProcessor("bpmn", async (src, el, ctx) => {
            // Get Parameters
            let parameters: BpmnNodeParameters | null = null;
            try {
                parameters = this.readParameters(src);
            } catch (e) {
                el.createEl("h2", {text: "BPMN parameters invalid: " + e.message});
                return;
            }

            console.log("Try to render a BPMN")
            try {
                if (parameters.url.startsWith("./")) {
                    const filePath = ctx.sourcePath;
                    const folderPath = filePath.substring(0, filePath.lastIndexOf("/"));
                    parameters.url = folderPath + "/" + parameters.url.substring(2, parameters.url.length);
                }

                el.addClass("bpmn-view");
                if (parameters.opendiagram) {
                    const href = el.createEl("a", {text: "Open diagram"});
                    href.href = parameters.url;
                    href.className = "internal-link";
                    el.addClass("bpmn-view-open-diagram");
                }

                const xml = await this.app.vault.adapter.read(parameters.url);
                el.setAttribute("style", "height: " + parameters.height + "px;");
                const bpmn = parameters.readonly ?
                    new BpmnViewer({
                        container: el,
                        keyboard: {
                            bindTo: window
                        }
                    }) : new Modeler({
                        container: el,
                        keyboard: {
                            bindTo: window
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
                    el.createEl("h2", {text: warnings + " " + message});
                });
            } catch (error) {
                el.createEl("h2", {text: error});
            }
        });
    }

    private readParameters(jsonString: string) {
        if (jsonString.contains("[[") && !jsonString.contains('"[[')) {
            jsonString = jsonString.replace("[[", '"[[');
            jsonString = jsonString.replace("]]", ']]"');
        }

        const parameters: BpmnNodeParameters = JSON.parse(jsonString);

        //Transform internal Link to external
        if (parameters.url.startsWith("[[")) {
            parameters.url = parameters.url.substring(2, parameters.url.length - 2);
            // @ts-ignore
            parameters.url = this.app.metadataCache.getFirstLinkpathDest(
                parameters.url,
                ""
            ).path;
        }

        if (parameters.readonly === undefined) {
            parameters.readonly = this.settings.readonly_by_default;
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

        if (parameters.y === undefined) {
            parameters.y = 0;
        }

        return parameters;
    }

    onunload() {
        console.log("Unloading BPMN plugin...");
    }
}
