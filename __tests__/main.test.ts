import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import tmp from 'tmp'
import * as fs from 'fs'

describe('test main action', () => {
  let tempTestFileName: string
  const nodePath = process.execPath
  const actionPath = path.join(__dirname, '..', 'lib', 'main.js')
  const options: cp.ExecFileSyncOptions = {env: process.env}

  beforeAll(() => {
    // Create temp file
    const {name} = tmp.fileSync()
    const expected_git_changes = `
      A\tadded_text.txt
      M\tchanged_text.txt
      D\tdeleted_text.txt
      A\tadded_img.png
      M\tchanged_img.png
    `
    // Write expected changes to temp file for subsequent tests
    fs.writeFileSync(name, expected_git_changes)
    tempTestFileName = name

    // Set up environment variables
    process.env['INPUT_BASE-BRANCH'] = tempTestFileName
    process.env['INPUT_FILTER-PATTERNS'] = `
      ADDED: {"pattern": "A\\t"}
      CHANGED: {"pattern": "M\\t"}
      DELETED: {"pattern": "D\\t"}
    `
    process.env['INPUT_COMMAND'] = 'echo \\"$(cat {branchName} | grep {glob})\\"'
    process.env['INPUT_CHANGE-MAP'] = `
      png: {"glob": ".png", "separateDeleted": true}
      txt: {"glob": ".txt", "separateDeleted": true}
      missing: {"glob": ".jpg"}
    `
  })

  test('test runs does not error', () => {
    const result = cp.execFileSync(nodePath, [actionPath], options).toString()

    const expectedPngOutput = [
      '::set-output name=deleted-png::',
      '::set-output name=png::added_img.png changed_img.png',
      '::set-output name=any-png::true',
    ].join('\n')

    const expectedTxtOutput = [
      '::set-output name=deleted-txt::deleted_text.txt',
      '::set-output name=txt::added_text.txt changed_text.txt',
      '::set-output name=any-txt::true',
    ].join('\n')

    const expectedMissingOutput = [
      '::set-output name=missing::',
      '::set-output name=any-missing::false',
      '::set-output name=any-matches::true',
    ].join('\n')

    expect(result).toContain(expectedPngOutput)
    expect(result).toContain(expectedTxtOutput)
    expect(result).toContain(expectedMissingOutput)
  })
})
