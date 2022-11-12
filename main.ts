import {Plugin} from "obsidian";
import {ObsidianBpmnPluginSettings, ObsidianBpmnPluginSettingsTab} from "./settings";
import BpmnViewer from "bpmn-js/lib/NavigatedViewer";
import Modeler from "bpmn-js/lib/Modeler";

interface BpmnNodeParameters {
    url: string;
    readonly: boolean;
    height: number;
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

                const href = el.createEl("a", {text: "Open diagram"});
                href.href = parameters.url;
                href.className = "internal-link";

                const xml = await this.app.vault.adapter.read(parameters.url);
                el.setAttribute("style", "height: " + parameters.height + "px;");
                console.log(parameters.readonly);
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
                console.log(parameters.readonly);
                console.log(bpmn);
                bpmn.importXML(xml).then(function (result: { warnings: any; }) {
                    const {warnings} = result;
                    const canvas = bpmn.get('canvas');
                    canvas.zoom('fit-viewport');
                    // TODO ZOOM scale, ect... as parameter
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
            parameters.url = parameters.url.substr(2, parameters.url.length - 4);
            // @ts-ignore
            parameters.url = this.app.metadataCache.getFirstLinkpathDest(
                parameters.url,
                ""
            ).path;
        }

        if (parameters.readonly === undefined) {
            parameters.readonly = this.settings.readonly_by_default;
        }

        if (parameters.height === undefined) {
            parameters.height = this.settings.height_by_default;
        }

        return parameters;
    }

    onunload() {
        console.log("Unloading BPMN plugin...");
    }
}
