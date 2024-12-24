import Modeler from "bpmn-js/lib/Modeler";
import {
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule
} from 'bpmn-js-properties-panel';
import {setIcon, TextFileView, WorkspaceLeaf} from "obsidian";
import {ObsidianBpmnPluginSettings} from "./settings";
import {SaveSVGResult} from "bpmn-js/lib/BaseViewer";
import TokenSimulationModule from "bpmn-js-token-simulation";
import SimulationSupportModule from 'bpmn-js-token-simulation/lib/simulation-support';
import BpmnColorPickerModule from "bpmn-js-color-picker";
// @ts-ignore
import gridModule from 'diagram-js-grid';
import minimapModule from 'diagram-js-minimap';
import sketchyRendererModule from 'bpmn-js-sketchy';
import HeatMap, {DataPoint} from "heatmap-ts";

export const VIEW_TYPE_BPMN = "bpmn-view";

export class BpmnModelerView extends TextFileView {
    bpmnXml: string;
    bpmnDiv: HTMLElement;
    // @ts-ignore
    bpmnModeler: Modeler;
    intervalId: NodeJS.Timeout;

    constructor(
        public leaf: WorkspaceLeaf,
        public settings: ObsidianBpmnPluginSettings,
    ) {
        super(leaf);
    }

    getViewData() {
        return this.data;
    }

    setViewData(data: string, clear: boolean) {
        this.bpmnXml = data;
        this.bpmnModeler.importXML(this.bpmnXml).catch(function (err: { warnings: any; message: string; }) {
            console.error(err);
        });
    }

    async onOpen() {
        let contentEl = this.contentEl.createEl("div", {cls: "bpmn-content"});
        let buttonbar = contentEl.createEl("div");
        let bpmnSave = buttonbar.createEl("button", {text: "Save", attr: {"aria-label": "Save"}});
        let bpmnUndo = buttonbar.createEl("button", {text: "Undo", attr: {"aria-label": "Undo"}});
        let bpmnRedo = buttonbar.createEl("button", {text: "Redo", attr: {"aria-label": "Redo"}});
        let bpmnProperties = buttonbar.createEl("button", {
            text: "Properties",
            attr: {"aria-label": "Show properties"}
        });
        let bpmnSaveSvg = buttonbar.createEl("button", {
            text: "Export SVG",
            attr: {"aria-label": "Export as SVG"}
        });
        let bpmnSavePng = buttonbar.createEl("button", {
            text: "Export PNG",
            attr: {"aria-label": "Export as PNG"}
        });
        let bpmn_view_classes = "bpmn-view bpmn-view-modeler"
        this.bpmnDiv = contentEl.createEl("div", {cls: bpmn_view_classes});
        let propertyPanel = contentEl.createEl("div", {cls: "bpmn-properties-panel hide"});
        let modules = [
            BpmnPropertiesPanelModule,
            BpmnPropertiesProviderModule,
            BpmnColorPickerModule,
        ];
        if (this.settings.enable_token_simulator) {
            modules.push(TokenSimulationModule);
            modules.push(SimulationSupportModule);
        }
        if (this.settings.enable_minimap) {
            modules.push(minimapModule);
        }
        if (this.settings.enable_grid) {
            modules.push(gridModule);
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
        this.bpmnModeler = new Modeler({
            container: this.bpmnDiv,
            propertiesPanel: {
                parent: propertyPanel
            },
            additionalModules: modules,
            textRenderer: textRenderer,
        });
        if (this.settings.force_white_background_by_default) {
            this.bpmnDiv.addClass("bpmn-view-white-background");
        }

        const bpmnModeler = this.bpmnModeler;
        const canvas = bpmnModeler.get('canvas');
        const thisRef = this;
        this.bpmnModeler.on("commandStack.changed", function () {
            bpmnModeler.saveXML({format: true}).then(function (data: any) {
                const {xml} = data;
                thisRef.data = xml;
            });
        });
        // Heatmap for token simulation
        if (this.settings.enable_token_simulator && this.settings.enable_simulation_heatmap) {
            const currentHistory: Map<String, number> = new Map();
            let last_index = 0;
            const heatMap = new HeatMap({
                container: this.bpmnDiv,
                maxOpacity: .8,
                radius: 50,
                blur: 0.80,
                width: this.bpmnDiv.innerWidth,
                height: this.bpmnDiv.innerHeight
            });


            const simulationTrace = bpmnModeler.get('simulationTrace');
            const registry = bpmnModeler.get('elementRegistry');
            const simulationSupport = bpmnModeler.get('simulationSupport');

            simulationTrace.start();
            this.intervalId = setInterval(updateHeatmap, 1000);

            function updateHeatmap() {
                let history: Array<String> = simulationSupport.getHistory();
                for (let i = last_index; i < history.length; i++) {
                    if (!history[i].startsWith("Flow")) {
                        currentHistory.set(history[i], (currentHistory.get(history[i]) || 0) + 1);
                    }
                    last_index = i + 1;
                }
                let data: Array<DataPoint> = [];
                const viewbox = canvas.viewbox();
                const x_off = viewbox.x;
                const y_off = viewbox.y;
                const scale = viewbox.scale; // TODO: Why is it not rendered when zooming in/or out?
                for (const [key, value] of currentHistory) {
                    const element = registry.get(key);
                    const centerx = scale * (element.x + (element.width / 2) - x_off);
                    const centery = scale * (element.y + (element.height / 2) - y_off);
                    data.push({
                        x: centerx,
                        y: centery,
                        value: value * 4
                    });
                }
                heatMap.setData({
                    data: data
                });
            }

            this.bpmnModeler.on("tokenSimulation.toggleMode", function () {
                simulationTrace.stop();
                simulationTrace._events = [];
                let data: Array<DataPoint> = [];
                heatMap.setData({
                    data: data
                });
                currentHistory.clear();
                last_index = 0;
                simulationTrace.start();
            });
            setIcon(bpmnSave, "save");
        }

        // Button Controller
        bpmnSave.addEventListener("click", function (e: Event) {
            thisRef.requestSave();
        });
        setIcon(bpmnSave, "save");
        bpmnUndo.addEventListener("click", function (e: Event) {
            bpmnModeler.get("commandStack").undo();
        });
        setIcon(bpmnUndo, "undo");
        bpmnRedo.addEventListener("click", function (e: Event) {
            bpmnModeler.get("commandStack").redo();
        });
        setIcon(bpmnRedo, "redo");
        bpmnProperties.addEventListener("click", function (e: Event) {
            propertyPanel.classList.toggle("hide");
        });
        setIcon(bpmnProperties, "settings");
        bpmnSaveSvg.addEventListener("click", async function (e: Event) {
            let result: SaveSVGResult = await bpmnModeler.saveSVG();
            await thisRef.saveImageFile(result.svg, "svg");
        });
        setIcon(bpmnSaveSvg, "image");

        // PNG is not working for now
        bpmnSavePng.addEventListener("click", async function (e: Event) {
            const svg = (await bpmnModeler.saveSVG()).svg;
            const pngString = undefined;
            if (pngString !== undefined) {
                await thisRef.saveImageFile(pngString, "png");
            }

        });
        // HIDE PNG BUTTON, as it is not working right now...
        bpmnSavePng.hide();
    }

    async saveImageFile(data: string, format: string) {
        let path = "/";
        const currentFile = this.app.workspace.getActiveFile();
        if (currentFile != null) {
            path = currentFile.path.replace(".bpmn", "." + format);
        }
        const existingFile = await this.app.vault.getAbstractFileByPath(path);
        if (existingFile !== null) {
            await this.app.vault.delete(existingFile);
        }
        let newFile = await this.app.vault.create(path, data);
        let leaf = this.app.workspace.getMostRecentLeaf();
        if (leaf != null) {
            await leaf.openFile(newFile);
        }
    }

    async onClose() {
        await this.save();
        this.contentEl.empty();
        clearInterval(this.intervalId);
    }

    clear() {
        // nothing to clear
    }

    getViewType() {
        return VIEW_TYPE_BPMN;
    }
}