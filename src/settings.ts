import {App, Component, MarkdownRenderer, Modal, Plugin, PluginSettingTab, Setting, TextComponent} from 'obsidian';

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
    enable_minimap: boolean = true;
    enable_zeebe_properties: boolean = false;
    enable_grid: boolean = true;
}

export class BPMNParameterInfoModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    onOpen() {
        let {contentEl} = this;
        contentEl.createEl("h1", {text: "BPMN code block parameter"});
        let table = contentEl.createEl("div")

        MarkdownRenderer.render(this.app,
            "| Parameter            | Description                                    | Values                                                    |\n" +
            "|----------------------|------------------------------------------------|-----------------------------------------------------------|\n" +
            "| url                  | The url of the *.bpmn file (required).         | Relative/Absolute path, or as \"\[\[*.bpmn\]\]\" markdown link. |\n" +
            "| height               | The height of the rendered canvas.             | [200..1000]                                               |\n" +
            "| opendiagram          | Show a link to the *.bpmn file.                | True/False                                                |\n" +
            "| showzoom             | Show the zoom buttons below the canvas.        | True/False                                                |\n" +
            "| enablepanzoom        | Enable pan and zoom.                           | True/False                                                |\n" +
            "| zoom                 | Set the zoom level. Default is 'fit-viewport'. | 0.0 - 10.0                                                |\n" +
            "| x                    | Set the x coordinate, if a zoom value is set.  | 0 - ... (default: 0)                                      |\n" +
            "| y                    | Set the y coordinate, if a zoom value is set.  | 0 - ... (default: 0)                                      |\n" +
            "| forcewhitebackground | Force a white background.                      | True/False                                                |",
            table, ".", new Component());
    }

    onClose() {
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

    display(): void {
        let {containerEl} = this;

        containerEl.empty();
        new Setting(containerEl)
            .setName("General")
            .setHeading();

        new Setting(containerEl)
            .setName("Default force white background")
            .setDesc("Set the default for forcing a white background")
            .setTooltip("forcewhitebackground: True/False", {delay: 200})
            .addToggle(toggle => toggle.setValue(this.plugin.settings.force_white_background_by_default)
                .onChange((value) => {
                    this.plugin.settings.force_white_background_by_default = value;
                    this.plugin.saveData(this.plugin.settings);
                }));

        new Setting(containerEl)
            .setName("BPMN Block")
            .setHeading();


        new Setting(containerEl)
            .setName("Default height")
            .setDesc("Set the default height of the rendered BPMN.")
            .setTooltip("height: x", {delay: 200})
            .addSlider(slider => slider.setValue(this.plugin.settings.height_by_default)
                .onChange((value) => {
                    this.plugin.settings.height_by_default = value;
                    this.plugin.saveData(this.plugin.settings);
                }).setLimits(200, 1000, 20)
                .setDynamicTooltip()
            );

        new Setting(containerEl)
            .setName("Default show open diagram")
            .setTooltip("opendiagram: True/False", {delay: 200})
            .setDesc("Set the default for showing the 'Open diagram' link")
            .addToggle(toggle => toggle.setValue(this.plugin.settings.opendiagram_by_default)
                .onChange((value) => {
                    this.plugin.settings.opendiagram_by_default = value;
                    this.plugin.saveData(this.plugin.settings);
                }));

        new Setting(containerEl)
            .setName("Default show zoom buttons")
            .setDesc("Set the default for showing the zoom buttons")
            .setTooltip("showzoom: True/False", {delay: 200})
            .addToggle(toggle => toggle.setValue(this.plugin.settings.showzoom_by_default)
                .onChange((value) => {
                    this.plugin.settings.showzoom_by_default = value;
                    this.plugin.saveData(this.plugin.settings);
                }));
        new Setting(containerEl)
            .setName("Default enable pan zoom")
            .setDesc("Set the default for enable pan & zoom")
            .setTooltip("enablepanzoom: True/False", {delay: 200})
            .addToggle(toggle => toggle.setValue(this.plugin.settings.enablepanzoom_by_default)
                .onChange((value) => {
                    this.plugin.settings.enablepanzoom_by_default = value;
                    this.plugin.saveData(this.plugin.settings);
                }));

        new Setting(containerEl)
            .setName("BPMN block parameters")
            .addButton(button => {
                button.setButtonText("Show parameter")
                button.onClick(evt => {
                        new BPMNParameterInfoModal(this.app).open();
                    }
                )
            });

        new Setting(containerEl)
            .setName("BPMN Modeler")
            .setHeading();

        new Setting(containerEl)
            .setName("Enable token simulator")
            .setDesc("Add a token simulator to the BPMN modeler.")
            .addToggle(toggle => toggle.setValue(this.plugin.settings.enable_token_simulator)
                .onChange((value) => {
                    this.plugin.settings.enable_token_simulator = value;
                    this.plugin.saveData(this.plugin.settings);
                }));
        new Setting(containerEl)
            .setName("Enable Minimap")
            .setDesc("Add a minimap to the BPMN modeler.")
            .addToggle(toggle => toggle.setValue(this.plugin.settings.enable_minimap)
                .onChange((value) => {
                    this.plugin.settings.enable_minimap = value;
                    this.plugin.saveData(this.plugin.settings);
                }));
        new Setting(containerEl)
            .setName("Enable grid")
            .setDesc("Add a grid to the BPMN modeler")
            .addToggle(toggle => toggle.setValue(this.plugin.settings.enable_grid)
                .onChange((value) => {
                    this.plugin.settings.enable_grid = value;
                    this.plugin.saveData(this.plugin.settings);
                }));
        new Setting(containerEl)
            .setName("Enable Zeebe properties")
            .setDesc("Add the Zeebe properties in the property box. (Warning: Beta)")
            .addToggle(toggle => toggle.setValue(this.plugin.settings.enable_zeebe_properties)
                .onChange((value) => {
                    this.plugin.settings.enable_zeebe_properties = value;
                    this.plugin.saveData(this.plugin.settings);
                }));
    }
}