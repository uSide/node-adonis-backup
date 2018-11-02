'use strict'

const { ServiceProvider } = require('@adonisjs/fold')

class BackupProvider extends ServiceProvider {
  register () {
    this.app.singleton('Backup', () => {
      const Helpers = this.app.use('Adonis/Src/Helpers')
      const Config = this.app.use('Adonis/Src/Config')
      return new (require('../src/Backup'))(Helpers, Config)
    })
  }
}

module.exports = BackupProvider
