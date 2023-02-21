import Modeler from "bpmn-js/lib/Modeler";
import {BpmnPropertiesPanelModule, BpmnPropertiesProviderModule} from 'bpmn-js-properties-panel';
import {TextFileView, WorkspaceLeaf} from "obsidian";
import {ObsidianBpmnPluginSettings} from "./settings";

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
        let bpmnSave = this.contentEl.createEl("button", {text: "Save"});
        let bpmnUndo = this.contentEl.createEl("button", {text: "Undo"});
        let bpmnRedo = this.contentEl.createEl("button", {text: "Redo"});
        let bpmnProperties = this.contentEl.createEl("button", {text: "Properties"});
        this.bpmnDiv = this.contentEl.createEl("div", {cls: "bpmn-view bpmn-fullscreen"});
        let propertyPanel = this.contentEl.createEl("div", {cls: "bpmn-properties-panel hide"});
        this.bpmnModeler = new Modeler({
            container: this.bpmnDiv,
            keyboard: {
                bindTo: this.bpmnDiv.win
            },
            propertiesPanel: {
                parent: propertyPanel
            },
            additionalModules: [
                BpmnPropertiesPanelModule,
                BpmnPropertiesProviderModule
                // TODO: Add camunda properties (if requested?) https://github.com/bpmn-io/bpmn-js-examples/tree/master/properties-panel
            ]
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
        bpmnUndo.addEventListener("click", function (e: Event) {
            bpmnModeler.get("commandStack").undo();
        });
        bpmnRedo.addEventListener("click", function (e: Event) {
            bpmnModeler.get("commandStack").redo();
        });
        bpmnProperties.addEventListener("click", function (e: Event) {
            propertyPanel.classList.toggle("hide");
        });
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