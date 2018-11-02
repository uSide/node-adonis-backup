'use strict'

const path = require('path')
const { spawn } = require('child_process')
const exec = require('util').promisify(require('child_process').exec)
const moment = require('moment')

class Backup {
  constructor (Helpers, Config) {
    this.Helpers = Helpers
    this.Config = Config
  }

  exec (command, args) {
    return new Promise(resolve => {
      let proc = spawn(command, args)
      proc.stderr.on('data', console.error.bind(console))
      proc.on('close', code => resolve(code))
    })
  }

  async perform () {
    let filename = `${moment().format('YYYY-MM-DD_HH-m')}.backup`
    let filepath = path.join(this.Helpers.appRoot(), 'tmp', filename)

    if (
      (await this.exec('pg_dump', [
        this.Config.get('backup.url'),
        '-Fc',
        '-f',
        filepath
      ])) !== 0
    ) {
      throw new Error('Dump failed!')
    }

    if (
      (await this.exec('openssl', [
        'aes-256-cbc',
        '-e',
        '-a',
        '-salt',
        '-pass',
        `pass:${this.Config.get('backup.key')}`,
        '-in',
        filepath,
        '-out',
        `${filepath}.enc`
      ])) !== 0
    ) {
      throw new Error('Encryption failed!')
    }

    if (
      (await this.exec('b2', [
        'authorize-account',
        this.Config.get('backup.account'),
        this.Config.get('backup.token')
      ])) !== 0
    ) {
      throw new Error('Authorization failed!')
    }

    let { stdout } = await exec(`sha1sum ${filepath}`)
    if (
      (await this.exec('b2', [
        'upload-file',
        '--sha1',
        stdout.split(' ')[0],
        '--noProgress',
        this.Config.get('backup.bucket'),
        `${filepath}.enc`,
        filename
      ])) !== 0
    ) {
      throw new Error('Upload failed!')
    }
  }
}

module.exports = Backup
