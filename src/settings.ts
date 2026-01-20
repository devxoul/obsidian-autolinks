import { App, Notice, PluginSettingTab, Setting } from 'obsidian'
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

    new Setting(containerEl).setName('Rules').setHeading()

    new Setting(containerEl)
      .setName('Import/Export')
      .setDesc('Backup or restore your rules')
      .addButton((button) =>
        button.setButtonText('Export').onClick(() => {
          this.exportRules()
        }),
      )
      .addButton((button) =>
        button.setButtonText('Import').onClick(() => {
          this.importRules()
        }),
      )

    // Display existing rules
    this.plugin.settings.rules.forEach((rule, index) => {
      const ruleContainer = containerEl.createDiv({ cls: 'auto-link-rule' })

      // Pattern input
      new Setting(ruleContainer)
        .setName('Pattern')
        .setDesc('Regex pattern to match (e.g., ISSUE-(\\d+))')
        .addText((text) =>
          text
            .setPlaceholder('Issue-(\\d+)')
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
                } catch {
                  text.inputEl.addClass('auto-link-error')
                }
              }
            }),
        )

      // URL template input
      new Setting(ruleContainer)
        .setName('URL template')
        .setDesc('Use $1, $2 for capture groups')
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
          .setButtonText('Add rule')
          .setCta()
          .onClick(async () => {
            this.plugin.settings.rules.push({
              pattern: '',
              url: '',
              enabled: true,
            })
            await this.plugin.saveSettings()
            this.display()
          }),
      )
  }

  private exportRules(): void {
    const rules = this.plugin.settings.rules
    const json = JSON.stringify(rules, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'autolinks-rules.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  private importRules(): void {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const imported = JSON.parse(text) as unknown
        const rules = this.parseImportedRules(imported)
        if (rules.length === 0) {
          new Notice('No valid rules found in file')
          return
        }
        this.plugin.settings.rules.push(...rules)
        await this.plugin.saveSettings()
        this.display()
        new Notice(`Imported ${rules.length} rule(s)`)
      } catch {
        new Notice('Failed to import rules: invalid file format')
      }
    }
    input.click()
  }

  private parseImportedRules(data: unknown): AutoLinkRule[] {
    if (!Array.isArray(data)) return []
    return data.filter(
      (item): item is AutoLinkRule =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.pattern === 'string' &&
        typeof item.url === 'string' &&
        typeof item.enabled === 'boolean',
    )
  }
}
