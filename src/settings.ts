import { App, PluginSettingTab, Setting } from 'obsidian'
import MyPlugin from './main'

export interface AutoLinkRule {
  pattern: string // Regex pattern
  url: string // URL template with $1, $2, etc.
  enabled: boolean // Toggle on/off
}

export interface AutoLinksSettings {
  rules: AutoLinkRule[]
}

export const DEFAULT_SETTINGS: AutoLinksSettings = {
  rules: [],
}

export class AutoLinksSettingTab extends PluginSettingTab {
  plugin: MyPlugin

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    const { containerEl } = this
    containerEl.empty()

    containerEl.createEl('h2', { text: 'Auto Links Settings' })

    // Display existing rules
    this.plugin.settings.rules.forEach((rule, index) => {
      const ruleContainer = containerEl.createDiv({ cls: 'auto-link-rule' })

      // Pattern input
      new Setting(ruleContainer)
        .setName('Pattern')
        .setDesc('Regex pattern to match (e.g., ISSUE-(\\d+))')
        .addText((text) =>
          text
            .setPlaceholder('ISSUE-(\\d+)')
            .setValue(rule.pattern)
            .onChange(async (value) => {
              const currentRule = this.plugin.settings.rules[index]
              if (currentRule) {
                currentRule.pattern = value
                await this.plugin.saveSettings()
                // Validate regex
                try {
                  new RegExp(value)
                  text.inputEl.removeClass('auto-link-error')
                } catch (_e) {
                  text.inputEl.addClass('auto-link-error')
                }
              }
            }),
        )

      // URL template input
      new Setting(ruleContainer)
        .setName('URL Template')
        .setDesc('URL with $1, $2, etc. for capture groups')
        .addText((text) =>
          text
            .setPlaceholder('https://example.com/$1')
            .setValue(rule.url)
            .onChange(async (value) => {
              const currentRule = this.plugin.settings.rules[index]
              if (currentRule) {
                currentRule.url = value
                await this.plugin.saveSettings()
              }
            }),
        )

      // Enable/disable toggle and delete button
      new Setting(ruleContainer)
        .setName('Enabled')
        .addToggle((toggle) =>
          toggle.setValue(rule.enabled).onChange(async (value) => {
            const currentRule = this.plugin.settings.rules[index]
            if (currentRule) {
              currentRule.enabled = value
              await this.plugin.saveSettings()
            }
          }),
        )
        .addButton((button) =>
          button
            .setButtonText('Delete')
            .setWarning()
            .onClick(async () => {
              this.plugin.settings.rules.splice(index, 1)
              await this.plugin.saveSettings()
              this.display() // Refresh display
            }),
        )

      ruleContainer.createEl('hr')
    })

    // Add new rule button
    new Setting(containerEl)
      .setName('Add new rule')
      .setDesc('Create a new auto-link pattern')
      .addButton((button) =>
        button
          .setButtonText('Add Rule')
          .setCta()
          .onClick(async () => {
            this.plugin.settings.rules.push({
              pattern: '',
              url: '',
              enabled: true,
            })
            await this.plugin.saveSettings()
            this.display() // Refresh display
          }),
      )
  }
}
