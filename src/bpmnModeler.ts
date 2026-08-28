import Modeler from "bpmn-js/lib/Modeler";
import {
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule
} from 'bpmn-js-properties-panel';
import {setIcon, TextFileView, WorkspaceLeaf } from "obsidian";
import {ObsidianBpmnPluginSettings} from "./settings";
import TokenSimulationModule, {SimulationSupport, SimulationTrace} from "bpmn-js-token-simulation";
import SimulationSupportModule from 'bpmn-js-token-simulation/lib/simulation-support';
import BpmnColorPickerModule from "bpmn-js-color-picker";
import {CreateAppendAnythingModule} from 'bpmn-js-create-append-anything';
import gridModule from 'diagram-js-grid';
import minimapModule from 'diagram-js-minimap';
import sketchyRendererModule from 'bpmn-js-sketchy';
import HeatMap, {DataPoint} from "heatmap-ts";
import type {Canvas, CommandStack, ElementRegistry} from "diagram-js";

export const VIEW_TYPE_BPMN = "bpmn-view";

export class BpmnModelerView extends TextFileView {
    bpmnXml: string;
    bpmnDiv: HTMLElement;
    bpmnModeler: Modeler;
    intervalId: number;

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
        this.bpmnModeler.importXML(this.bpmnXml).catch((err) => {
            console.error(err);
        });
    }

    async onOpen() {
        let contentEl = this.contentEl.createDiv({cls: "bpmn-content"});
        let buttonbar = contentEl.createDiv();
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
        let bpmn_view_classes = "bpmn-view bpmn-view-modeler";
        this.bpmnDiv = contentEl.createDiv({cls: bpmn_view_classes});
        let propertyPanel = contentEl.createDiv({cls: "bpmn-properties-panel hide"});
        let modules = [
            BpmnPropertiesPanelModule,
            BpmnPropertiesProviderModule,
            BpmnColorPickerModule,
            CreateAppendAnythingModule,
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
            canvas: {
                autoFocus: true
            },
        });
        if (this.settings.force_white_background_by_default) {
            this.bpmnDiv.addClass("bpmn-view-white-background");
        }

        const popupMenu = this.bpmnModeler.get<{
            _createContainer(config: {provider: string}): HTMLElement;
        }>("popupMenu");
        // Function.prototype.bind is typed to return `any`, so re-assert the
        // known signature to keep the no-unsafe-* rules happy.
        const originalCreateContainer =
            popupMenu._createContainer.bind(popupMenu) as typeof popupMenu._createContainer;
        popupMenu._createContainer = function(config) {
            const container = originalCreateContainer(config);
            document.body.appendChild(container);
            return container;
        };

        const bpmnModeler = this.bpmnModeler;
        const canvas = bpmnModeler.get<Canvas>('canvas');
        // bpmn-js binds its keyboard shortcuts (a, n, e, r, h, l, s, ...) to the
        // canvas SVG element, which only receives key events while focused.
        // Obsidian keeps focus on its own workspace elements, so the built-in
        // autoFocus (which requires document.body to be focused) never kicks in.
        // Focus the canvas when the mouse enters the diagram, unless the user is
        // typing somewhere else (e.g. the properties panel or a note).
        this.registerDomEvent(this.bpmnDiv, "mouseenter", () => {
            const active = document.activeElement;
            if (active instanceof HTMLElement &&
                (active.isContentEditable ||
                    active.tagName === "INPUT" ||
                    active.tagName === "TEXTAREA" ||
                    active.tagName === "SELECT")) {
                return;
            }
            canvas.focus();
        });
        this.bpmnModeler.on("commandStack.changed", () => {
            void bpmnModeler.saveXML({format: true}).then((data) => {
                const {xml} = data;
                if (xml !== undefined) {
                    this.data = xml;
                }
            });
        });
        // Heatmap for token simulation
        if (this.settings.enable_token_simulator && this.settings.enable_simulation_heatmap) {
            const currentHistory: Map<string, number> = new Map();
            let last_index = 0;
            const heatMap = new HeatMap({
                container: this.bpmnDiv,
                maxOpacity: .8,
                radius: 50,
                blur: 0.80,
                width: this.bpmnDiv.innerWidth,
                height: this.bpmnDiv.innerHeight
            });


            const simulationTrace = bpmnModeler.get<SimulationTrace>('simulationTrace');
            const registry = bpmnModeler.get<ElementRegistry>('elementRegistry');
            const simulationSupport = bpmnModeler.get<SimulationSupport>('simulationSupport');

            simulationTrace.start();
            this.intervalId = window.setInterval(updateHeatmap, 1000);

            function updateHeatmap() {
                const history = simulationSupport.getHistory();
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

            this.bpmnModeler.on("tokenSimulation.toggleMode", () => {
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
        bpmnSave.addEventListener("click", () => {
            this.requestSave();
        });
        setIcon(bpmnSave, "save");
        bpmnUndo.addEventListener("click", () => {
            bpmnModeler.get<CommandStack>("commandStack").undo();
        });
        setIcon(bpmnUndo, "undo");
        bpmnRedo.addEventListener("click", () => {
            bpmnModeler.get<CommandStack>("commandStack").redo();
        });
        setIcon(bpmnRedo, "redo");
        bpmnProperties.addEventListener("click", function (e: Event) {
            propertyPanel.classList.toggle("hide");
        });
        setIcon(bpmnProperties, "settings");
        bpmnSaveSvg.addEventListener("click", () => {
            void this.exportSvg();
        });
        setIcon(bpmnSaveSvg, "image");

        // PNG is not working for now
        bpmnSavePng.addEventListener("click", () => {
            void this.exportPng();
        });
        // HIDE PNG BUTTON, as it is not working right now...
        bpmnSavePng.hide();
    }

    async exportSvg() {
        const result = await this.bpmnModeler.saveSVG();
        await this.saveImageFile(result.svg, "svg");
    }

    async exportPng() {
        const pngString = undefined;
        if (pngString !== undefined) {
            await this.saveImageFile(pngString, "png");
        }
    }

    async saveImageFile(data: string, format: string) {
        let path = "/";
        const currentFile = this.app.workspace.getActiveFile();
        if (currentFile != null) {
            path = currentFile.path.replace(".bpmn", "." + format);
        }
        // getAbstractFileByPath is synchronous
        const existingFile = this.app.vault.getAbstractFileByPath(path);
        if (existingFile !== null) {
            await this.app.fileManager.trashFile(existingFile);
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
        window.clearInterval(this.intervalId);
    }

    clear() {
        // nothing to clear
    }

    getViewType() {
        return VIEW_TYPE_BPMN;
    }
}
