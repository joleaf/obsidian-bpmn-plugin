import {App, Plugin, PluginSettingTab, Setting} from 'obsidian';

declare class ObsidianBpmnPlugin extends Plugin {
    settings: ObsidianBpmnPluginSettings;
}

export class ObsidianBpmnPluginSettings {
    readonly_by_default: boolean = true;
    opendiagram_by_default: boolean = true;
    height_by_default: number = 400;
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

        // Maybe for future work
        if (false) {
            new Setting(containerEl)
                .setName("Readonly BPMN")
                .setDesc("Makes the BPMN readonly by default")
                .addToggle(toggle => toggle.setValue(this.plugin.settings.readonly_by_default)
                    .onChange((value) => {
                        this.plugin.settings.readonly_by_default = value;
                        this.plugin.saveData(this.plugin.settings);
                    }));
        }


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

    }
}