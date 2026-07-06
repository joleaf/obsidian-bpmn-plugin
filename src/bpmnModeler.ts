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
import {CreateAppendAnythingModule} from 'bpmn-js-create-append-anything';
// @ts-ignore
import gridModule from 'diagram-js-grid';
import minimapModule from 'diagram-js-minimap';
import sketchyRendererModule from 'bpmn-js-sketchy';
import HeatMap, {DataPoint} from "heatmap-ts";

export const VIEW_TYPE_BPMN = "bpmn-view";

// bpmn-js positions its popup menus (create/append/replace, also via the
// keyboard shortcuts n/a/r) with position: fixed in viewport coordinates.
// Obsidian's workspace panes and this plugin's dark-mode filter establish
// CSS containing blocks, so those viewport coordinates resolve relative to
// an ancestor element instead: the popup lands in the wrong place, and
// focusing its search field then auto-scrolls the pane to reach it, which
// makes the popup visibly jump around. Fix it at the source: right before
// the popup renders, rewrite the position bpmn-js is about to use so that
// the very first paint is already correct. The popup is placed at the
// element being appended to (append menu) or at the position bpmn-js chose
// (e.g. the mouse cursor), translated into the containing block's
// coordinate space and clamped so it stays inside the diagram view. A
// second pass after rendering refines the clamping with the popup's actual
// size, still before the browser paints.
export function installPopupMenuRepositioning(
    // @ts-ignore
    bpmnModeler: Modeler,
    containerEl: HTMLElement,
) {
    const popupMenu = bpmnModeler.get("popupMenu");
    const canvas = bpmnModeler.get("canvas");
    let popupObserver: MutationObserver | null = null;
    let desired: { x: number, y: number } | null = null;

    // Where the popup should appear, in real viewport coordinates.
    const getDesiredPosition = function (current: any): { x: number, y: number } {
        const target = current.target;
        if (current.providerId === "bpmn-append" &&
            target && typeof target.x === "number" && typeof target.width === "number") {
            // Anchor the append menu to the element it appends to, at its
            // top-right corner, keeping clear of the context pad icons.
            const viewbox = canvas.viewbox();
            const canvasRect = canvas.getContainer().getBoundingClientRect();
            let x = canvasRect.left + (target.x + target.width - viewbox.x) * viewbox.scale + 12;
            const y = canvasRect.top + (target.y - viewbox.y) * viewbox.scale;
            const pad = containerEl.querySelector(".djs-context-pad.open");
            if (pad !== null) {
                x = Math.max(x, pad.getBoundingClientRect().right + 5);
            }
            return {x: x, y: y};
        }
        return {x: current.position.x, y: current.position.y};
    };

    // Keep the popup inside the diagram view; Obsidian clips anything that
    // sticks out of the pane, and a popup outside the pane makes the search
    // field's focus auto-scroll the workspace.
    const clampToView = function (x: number, y: number, width: number, height: number) {
        const bounds = containerEl.getBoundingClientRect();
        return {
            x: Math.max(Math.min(x, bounds.right - width), bounds.left),
            y: Math.max(Math.min(y, bounds.bottom - height), bounds.top),
        };
    };

    // Viewport coordinates of the popup's containing block origin, i.e.
    // where `position: fixed; left: 0; top: 0` actually ends up. Zero when
    // fixed positioning works normally.
    const getContainingBlockOrigin = function (parentEl: HTMLElement): { x: number, y: number } {
        const probe = document.createElement("div");
        probe.style.cssText = "position: fixed; left: 0; top: 0; width: 0; height: 0; pointer-events: none;";
        parentEl.appendChild(probe);
        const rect = probe.getBoundingClientRect();
        probe.remove();
        return {x: rect.left, y: rect.top};
    };

    // Second pass, after the popup rendered: re-clamp with its actual size.
    // Also runs when a popup re-render resets the inline position.
    const refine = function () {
        const popupEl = containerEl.querySelector(".djs-popup-parent .djs-popup") as HTMLElement | null;
        if (desired === null || popupEl === null) {
            return;
        }
        const styleLeft = parseFloat(popupEl.style.left);
        const styleTop = parseFloat(popupEl.style.top);
        if (isNaN(styleLeft) || isNaN(styleTop)) {
            return;
        }
        const rect = popupEl.getBoundingClientRect();
        const originX = rect.left - styleLeft;
        const originY = rect.top - styleTop;
        const clamped = clampToView(desired.x, desired.y, rect.width, rect.height);
        const newLeft = clamped.x - originX;
        const newTop = clamped.y - originY;
        if (Math.abs(newLeft - styleLeft) >= 0.5 || Math.abs(newTop - styleTop) >= 0.5) {
            popupEl.style.left = newLeft + "px";
            popupEl.style.top = newTop + "px";
        }
    };

    bpmnModeler.on("popupMenu.open", function () {
        const current = popupMenu._current;
        if (!current || !current.position || !current.container) {
            return;
        }
        // Rewrite the position before the popup renders. The popup's size is
        // not known yet, so clamp with its configured width and a generous
        // height estimate; the refine pass fixes the estimate.
        const origin = getContainingBlockOrigin(current.container);
        desired = getDesiredPosition(current);
        const width = (current.options && current.options.width) || 300;
        const clamped = clampToView(desired.x, desired.y, width, 400);
        current.position = Object.assign({}, current.position, {
            x: clamped.x - origin.x,
            y: clamped.y - origin.y,
        });
        // The popup renders synchronously right after this event fires;
        // refining in a microtask still happens before the next paint.
        queueMicrotask(function () {
            refine();
            const popupEl = containerEl.querySelector(".djs-popup-parent .djs-popup");
            if (popupEl !== null && popupObserver === null) {
                popupObserver = new MutationObserver(refine);
                popupObserver.observe(popupEl, {attributes: true, attributeFilter: ["style"]});
            }
        });
    });
    bpmnModeler.on("popupMenu.close", function () {
        if (popupObserver !== null) {
            popupObserver.disconnect();
            popupObserver = null;
        }
    });
}

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

        const bpmnModeler = this.bpmnModeler;
        const canvas = bpmnModeler.get('canvas');
        const thisRef = this;
        // bpmn-js binds its keyboard shortcuts (a, n, e, r, h, l, s, ...) to the
        // canvas SVG element, which only receives key events while focused.
        // Obsidian keeps focus on its own workspace elements, so the built-in
        // autoFocus (which requires document.body to be focused) never kicks in.
        // Focus the canvas when the mouse enters the diagram, unless the user is
        // typing somewhere else (e.g. the properties panel or a note).
        this.registerDomEvent(this.bpmnDiv, "mouseenter", function () {
            const active = document.activeElement;
            if (active instanceof HTMLElement &&
                (active.isContentEditable ||
                    active.tagName === "INPUT" ||
                    active.tagName === "TEXTAREA" ||
                    active.tagName === "SELECT")) {
                return;
            }
            // @ts-ignore
            canvas.focus();
        });
        installPopupMenuRepositioning(this.bpmnModeler, this.bpmnDiv);
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
