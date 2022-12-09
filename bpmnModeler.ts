import Modeler from "bpmn-js/lib/Modeler";
import {TextFileView} from "obsidian";

export const VIEW_TYPE_BPMN = "bpmn-view";

export class BpmnModelerView extends TextFileView {
    bpmnXml: string;
    bpmnDiv: HTMLElement;
    // @ts-ignore
    bpmnModeler: Modeler;

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
        this.bpmnDiv = this.contentEl.createEl("div", {cls: "bpmn-view bpmn-fullscreen"});
        this.bpmnModeler = new Modeler({
            container: this.bpmnDiv,
            keyboard: {
                bindTo: this.bpmnDiv.win
            }
        });
        this.bpmnDiv.addClass("bpmn-view-white-background");

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
    }

    async onClose() {
        this.contentEl.empty();
    }

    clear() {
        this.contentEl.empty();
    }

    getViewType() {
        return VIEW_TYPE_BPMN;
    }
}