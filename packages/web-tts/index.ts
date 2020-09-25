#!/usr/bin/env node
import execa = require('execa')
import { promises as fs } from 'fs'
import { safeLoad } from 'js-yaml'
import minimist = require('minimist')
import puppeteer = require('puppeteer')
import * as tempy from 'tempy'

const { copyFile, readFile, writeFile } = fs

interface Command {
  [key: string]: any
  command: 'click' | 'each' | 'getAll' | 'getOne' | 'go' | 'if' | 'input' | 'scrape' | 'waitForPage'
}

interface CommandClick extends Command {
  selector: string
}

interface CommandEach extends Command {
  actions: Command[]
  from: string
}

interface CommandGet extends Command { // getAll or getOne
  property: string
  saveAs: string
  selector: string
}

interface CommandGo extends Command {
  url: string
}

interface CommandIf extends Command {
  actions: Command[]
  negate?: boolean
  selector: string
  test: 'contains'
  value: string
}

interface CommandInput extends Command {
  selector: string
  value: string
}

interface CommandScrape extends Command {
  selector: string
}

let page: puppeteer.Page
let sourceText = ''
let vars: {[name: string]: string | string[]} = {}

const doAction = async (action: Command) => {
  if (action.command === 'click') {
    let opts = action as CommandClick
    console.log(`Clicking on element ${opts.selector}...`)
    await page.click(opts.selector)
  } else if (action.command === 'each') {
    let opts = action as CommandEach
    const iterable = typeof vars[opts.from] === 'string'
      ? [vars[opts.from] as string]
      : Array.from(vars[opts.from])
    for (const item of iterable) {
      const replaceThis = (str: string): string  => {
        return str.replace(/{{this}}/g, item)
      }
      for (const subaction of opts.actions) {
        const clonedAction = { ...subaction }
        for (const key in clonedAction) {
          if (typeof clonedAction[key] === 'string') {
            clonedAction[key] = replaceThis(clonedAction[key])
          }
        }
        await doAction(clonedAction)
      }
    }
  } else if (action.command === 'getAll') {
    let opts = action as CommandGet
    console.log(`Getting selectors matching "${opts.selector}...`)
    const results = await page.evaluate((selector, prop) => {
      const matches = Array.from(document.querySelectorAll(selector))
      return matches.map((el) => String(el[prop]))
    }, opts.selector, opts.property)
    console.log(`  ${results.length} matches found. Storing into "${opts.saveAs}".`)
    vars[opts.saveAs] = results
  } else if (action.command === 'getOne') {
    let opts = action as CommandGet
    console.log(`Getting selector matching "${opts.selector}...`)
    const result = await page.evaluate((selector, prop) => {
      const el = document.querySelector(selector)
      return el && String(el[prop])
    }, opts.selector, opts.property)
    console.log(`  ${result ? '1' : 'No'} match found. Storing into "${opts.saveAs}".`)
    vars[opts.saveAs] = result
  } else if (action.command === 'go') {
    let opts = action as CommandGo
    console.log(`Loading URL ${opts.url}...`)
    await page.goto(opts.url)
  } else if (action.command === 'if') {
    let opts = action as CommandIf
    console.log(`Checking if ${opts.negate ? 'not ' : ''}${opts.test} "${opts.value}"...`)
    let isTrue = false
    if (opts.test === 'contains') {
      isTrue = await page.evaluate((selector, text) => {
        const el = document.querySelector(selector)
        return el && el.textContent && el.textContent.includes(text)
      }, opts.selector, opts.value)
    }
    if (opts.negate) { isTrue = !isTrue }
    if (isTrue) {
      console.log(`  is true; running actions.`)
      for (const subaction of opts.actions) {
        await doAction(subaction)
      }
    } else {
      console.log('  is false; skipping actions.')
    }
  } else if (action.command === 'input') {
    let opts = action as CommandInput
    console.log(`Typing into field "${opts.selector}...`)
    await page.type(opts.selector, opts.value)
  } else if (action.command === 'scrape') {
    let opts = action as CommandScrape
    console.log(`Scraping text from "${opts.selector}"...`)
    sourceText += await page.evaluate(selector => {
      const blockElements = [
        'address',
        'article',
        'aside',
        'blockquote',
        'details',
        'dialog',
        'dd',
        'div',
        'dl',
        'dt',
        'fieldset',
        'figcaption',
        'figure',
        'footer',
        'form',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'header',
        'hgroup',
        'hr',
        'li',
        'main',
        'nav',
        'ol',
        'p',
        'pre',
        'section',
        'table',
        'ul',
      ].map(name => name.toUpperCase())
      const codeElements = [
        'noscript',
        'script',
        'style'
      ].map(name => name.toUpperCase())
      const inlineBreaks = [
        'br'
      ].map(name => name.toUpperCase())
      const domToString = (node: Node) => {
        let str = ''
        for (let child of Array.from(node.childNodes)) {
          if (child.nodeType === 3) { // text node
            str += child.textContent
          } else if (child.nodeType === 1 && !codeElements.includes(child.nodeName)) { // element node
            if (blockElements.includes(child.nodeName)) {
              str += `\n${domToString(child)}.\n`
            } else {
              str += domToString(child)
              if (inlineBreaks.includes(child.nodeName)) {
                str += '. '
              }
            }
          }
        }
        return str
      }
      const body = document.querySelector<HTMLElement>(selector)
      return body ? domToString(body) : ''
    }, opts.selector)
  } else if (action.command === 'waitForPage') {
    console.log('Waiting for page to load...')
    await page.waitForNavigation()
  }
}

;(async () => {
  const cliOpts = {
    boolean: ['debug', 'headless'],
    default: {
      debug: false,
      delay: 0,
      headless: true,
      height: 1000,
      width: 2000
    }
  }
  const args = minimist(process.argv.slice(2), cliOpts)

  const commandsFile = args._[0]
  if (!commandsFile) {
    throw new Error('Missing commands filename')
  }

  const outputFile = args._[1]
  if (!outputFile) {
    throw new Error('Missing output filename')
  }

  const input = await readFile(commandsFile, 'utf8')
  const actions = safeLoad(input) as Command[]

  const browser = await puppeteer.launch({
    headless: args.headless,
    devtools: args.debug,
    slowMo: args.delay
  })
  page = await browser.newPage()
  if (args.debug) {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()))
  }
  await page.setViewport({
    width: args.width,
    height: args.height
  })

  for (const action of actions) {
    await doAction(action)
  }

  await browser.close()

  const textFilename = tempy.file()
  await writeFile(textFilename, sourceText, 'utf8')

  console.log('Converting text to audio...')
  const audioFilename = tempy.file()
  let ttsArgs = [
    'node_modules/.bin/tts',
    textFilename,
    audioFilename
  ]
  for (const name in args) {
    if (name === '_' || Object.keys(cliOpts.default).includes(name)) { continue }
    ttsArgs.push(`--${name}`, args[name])
  }
  console.log(`  Running 'node ${ttsArgs.join(' ')}'`)
  await execa('node', ttsArgs, {
    stdout: 'inherit',
    stderr: 'inherit'
  })

  await copyFile(audioFilename, outputFile)

  console.log(`Done. Wrote file to ${outputFile}`)
})()
