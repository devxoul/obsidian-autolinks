import {Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, AutoLinksSettings, AutoLinksSettingTab} from "./settings";
import {createPostProcessor} from "./reading-view";
import {createEditorExtension} from "./live-preview";

export default class AutoLinksPlugin extends Plugin {
	settings: AutoLinksSettings;

	async onload() {
		await this.loadSettings();

		// Register reading view post-processor
		this.registerMarkdownPostProcessor(createPostProcessor(this));

		// Register live preview editor extension
		this.registerEditorExtension(createEditorExtension(this));

		// Add settings tab
		this.addSettingTab(new AutoLinksSettingTab(this.app, this));
	}

	onunload() {
		// Cleanup is handled automatically by Obsidian
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<AutoLinksSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Trigger re-render by updating the workspace
		this.app.workspace.updateOptions();
	}
}
