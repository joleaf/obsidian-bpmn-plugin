import {App, Component, MarkdownRenderer, Modal, Plugin, PluginSettingTab} from 'obsidian';
import type {SettingDefinitionItem} from 'obsidian';
import {BPMN_BLOCK_PARAMETERS} from "./parameters";

declare class ObsidianBpmnPlugin extends Plugin {
    settings: ObsidianBpmnPluginSettings;
}

export class ObsidianBpmnPluginSettings {
    opendiagram_by_default: boolean = true;
    showzoom_by_default: boolean = true;
    enablepanzoom_by_default: boolean = true;
    height_by_default: number = 400;
    force_white_background_by_default: boolean = true;
    enable_token_simulator: boolean = true;
    enable_simulation_heatmap: boolean = false;
    enable_minimap: boolean = true;
    enable_grid: boolean = true;
    enable_sketchy: boolean = false;
}

export class BPMNParameterInfoModal extends Modal {
    // Owns the rendered markdown; unloaded when the modal closes.
    private renderedComponent: Component;

    constructor(app: App) {
        super(app);
        this.renderedComponent = new Component();
    }

    onOpen() {
        let {contentEl} = this;
        contentEl.createEl("h1", {text: "BPMN code block parameter"});
        let table = contentEl.createDiv()

        const markdown = [
            "| Parameter | Description | Values |",
            "|---|---|---|",
            ...BPMN_BLOCK_PARAMETERS.map((p) => `| ${p.name} | ${p.description} | ${p.values} |`),
        ].join("\n");
        void MarkdownRenderer.render(this.app, markdown, table, ".", this.renderedComponent);
    }

    onClose() {
        this.renderedComponent.unload();
        let {contentEl} = this;
        contentEl.empty();
    }
}

export class ObsidianBpmnPluginSettingsTab extends PluginSettingTab {
    plugin: ObsidianBpmnPlugin;

    constructor(app: App, plugin: ObsidianBpmnPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    getSettingDefinitions(): SettingDefinitionItem[] {
        return [
            {
                type: "group",
                heading: "Defaults",
                items: [
                    {
                        name: "Default force white background",
                        desc: "Set the default for forcing a white background",
                        control: {type: "toggle", key: "force_white_background_by_default"},
                    },
                    {
                        name: "Use sketchy visualization",
                        desc: "The visualization of the BPMN is like a sketch.",
                        control: {type: "toggle", key: "enable_sketchy"},
                    },
                ],
            },
            {
                type: "group",
                heading: "Code block",
                items: [
                    {
                        name: "Default height",
                        desc: "Set the default height of the rendered BPMN.",
                        control: {
                            type: "slider",
                            key: "height_by_default",
                            min: 200,
                            max: 1000,
                            step: 20,
                            // 1.13.1+; ignored by older builds.
                            displayFormat: (value) => String(value),
                        },
                    },
                    {
                        name: "Default show open diagram",
                        desc: "Set the default for showing the 'Open diagram' link",
                        control: {type: "toggle", key: "opendiagram_by_default"},
                    },
                    {
                        name: "Default show zoom buttons",
                        desc: "Set the default for showing the zoom buttons",
                        control: {type: "toggle", key: "showzoom_by_default"},
                    },
                    {
                        name: "Default enable pan zoom",
                        desc: "Set the default for enable pan & zoom",
                        control: {type: "toggle", key: "enablepanzoom_by_default"},
                    },
                    {
                        name: "BPMN block parameters",
                        action: () => {
                            new BPMNParameterInfoModal(this.app).open();
                        },
                    },
                ],
            },
            {
                type: "group",
                heading: "Modeler",
                items: [
                    {
                        name: "Enable token simulator",
                        desc: "Add a token simulator to the BPMN modeler.",
                        control: {type: "toggle", key: "enable_token_simulator"},
                    },
                    {
                        name: "Enable heatmap",
                        desc: "Add a heatmap to the token simulation (Attention: Beta feature!)",
                        control: {type: "toggle", key: "enable_simulation_heatmap"},
                    },
                    {
                        name: "Enable minimap",
                        desc: "Add a minimap to the BPMN modeler.",
                        control: {type: "toggle", key: "enable_minimap"},
                    },
                    {
                        name: "Enable grid",
                        desc: "Add a grid to the BPMN modeler",
                        control: {type: "toggle", key: "enable_grid"},
                    },
                ],
            },
        ];
    }
}
