import {App, Plugin, PluginSettingTab, Setting} from 'obsidian';

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
    enable_zeebe_properties: boolean = false;
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
            .setName("Default height")
            .setDesc("Set the default height of the rendered BPMN. Adjust this inline with e.g., `\"height\":600`")
            .addSlider(slider => slider.setValue(this.plugin.settings.height_by_default)
                .onChange((value) => {
                    this.plugin.settings.height_by_default = value;
                    this.plugin.saveData(this.plugin.settings);
                }).setLimits(200, 1000, 20)
                .setDynamicTooltip()
            );

        new Setting(containerEl)
            .setName("Default show open diagram")
            .setDesc("Set the default for showing the 'Open diagram' link")
            .addToggle(toggle => toggle.setValue(this.plugin.settings.opendiagram_by_default)
                .onChange((value) => {
                    this.plugin.settings.opendiagram_by_default = value;
                    this.plugin.saveData(this.plugin.settings);
                }));

        new Setting(containerEl)
            .setName("Default show zoom buttons")
            .setDesc("Set the default for showing the zoom buttons")
            .addToggle(toggle => toggle.setValue(this.plugin.settings.showzoom_by_default)
                .onChange((value) => {
                    this.plugin.settings.showzoom_by_default = value;
                    this.plugin.saveData(this.plugin.settings);
                }));
        new Setting(containerEl)
            .setName("Default enable pan zoom")
            .setDesc("Set the default for enable pan & zoom")
            .addToggle(toggle => toggle.setValue(this.plugin.settings.enablepanzoom_by_default)
                .onChange((value) => {
                    this.plugin.settings.enablepanzoom_by_default = value;
                    this.plugin.saveData(this.plugin.settings);
                }));
        new Setting(containerEl)
            .setName("Default force white background")
            .setDesc("Set the default for forcing a white background")
            .addToggle(toggle => toggle.setValue(this.plugin.settings.force_white_background_by_default)
                .onChange((value) => {
                    this.plugin.settings.force_white_background_by_default = value;
                    this.plugin.saveData(this.plugin.settings);
                }));
        new Setting(containerEl)
            .setName("Enable Token Simulator")
            .setDesc("Add a token simulator to the BPMN modeler.")
            .addToggle(toggle => toggle.setValue(this.plugin.settings.enable_token_simulator)
                .onChange((value) => {
                    this.plugin.settings.enable_token_simulator = value;
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