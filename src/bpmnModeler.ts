import Modeler from "bpmn-js/lib/Modeler";
import {
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    ZeebePropertiesProviderModule
} from 'bpmn-js-properties-panel';
import {setIcon, TextFileView, WorkspaceLeaf} from "obsidian";
import {ObsidianBpmnPluginSettings} from "./settings";
import {SaveSVGResult} from "bpmn-js/lib/BaseViewer";
import TokenSimulationModule from "bpmn-js-token-simulation";
import BpmnColorPickerModule from "bpmn-js-color-picker";

export const VIEW_TYPE_BPMN = "bpmn-view";

export class BpmnModelerView extends TextFileView {
    bpmnXml: string;
    bpmnDiv: HTMLElement;
    // @ts-ignore
    bpmnModeler: Modeler;

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
        const thisRef = this;
        this.bpmnModeler.importXML(this.bpmnXml).catch(function (err: { warnings: any; message: string; }) {
            thisRef.clear();
            thisRef.contentEl.createEl("div", {text: err.message});
        });
    }

    async onOpen() {
        let bpmnSave = this.contentEl.createEl("button", {text: "Save", attr: {"aria-label": "Save"}});
        let bpmnUndo = this.contentEl.createEl("button", {text: "Undo", attr: {"aria-label": "Undo"}});
        let bpmnRedo = this.contentEl.createEl("button", {text: "Redo", attr: {"aria-label": "Redo"}});
        let bpmnProperties = this.contentEl.createEl("button", {
            text: "Properties",
            attr: {"aria-label": "Show properties"}
        });
        let bpmnSaveSvg = this.contentEl.createEl("button", {
            text: "Export SVG",
            attr: {"aria-label": "Export as SVG"}
        });
        let bpmnSavePng = this.contentEl.createEl("button", {
            text: "Export PNG",
            attr: {"aria-label": "Export as PNG"}
        });
        this.bpmnDiv = this.contentEl.createEl("div", {cls: "bpmn-view"});
        let propertyPanel = this.contentEl.createEl("div", {cls: "bpmn-properties-panel hide"});
        let modules = [
            BpmnPropertiesPanelModule,
            BpmnPropertiesProviderModule,
            BpmnColorPickerModule
        ];
        if (this.settings.enable_zeebe_properties) {
            modules.push(ZeebePropertiesProviderModule);
        }
        if (this.settings.enable_token_simulator) {
            modules.push(TokenSimulationModule);
        }
        this.bpmnModeler = new Modeler({
            container: this.bpmnDiv,
            keyboard: {
                bindTo: this.bpmnDiv.win
            },
            propertiesPanel: {
                parent: propertyPanel
            },
            additionalModules: modules
        });
        if (this.settings.force_white_background_by_default) {
            this.bpmnDiv.addClass("bpmn-view-white-background");
        }

        const bpmnModeler = this.bpmnModeler
        const thisRef = this;
        this.bpmnModeler.on("commandStack.changed", function () {
            bpmnModeler.saveXML({format: true}).then(function (data: any) {
                const {xml} = data;
                thisRef.data = xml;
            });
        });
        bpmnSave.addEventListener("click", function (e: Event) {
            thisRef.save();
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
    }

    clear() {
        this.contentEl.empty();
    }

    getViewType() {
        return VIEW_TYPE_BPMN;
    }
}