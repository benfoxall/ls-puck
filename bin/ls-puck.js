#!/usr/bin/env node

const blessed = require('blessed')
const lspuck = require('../')

// Create a screen object.
var screen = blessed.screen({
  smartCSR: true
})

screen.title = 'ls-puck'

const items = blessed.listtable({
  mouse: true,
  keys: true,
  interactive: true,
  left: 'center',
  top: '0',
  width: '100%',
  height: '60%',
  selectedFg: '#f08',
  style: {
    header: {
      fg: '#000'
    }
  },
  data: [
    [ 'Name', 'uuid', 'Battery']
  ],
  border: 'line'
})

items.focus()

items.on('select', (item, i ) => {
  lspuck.ping(i)
})

screen.append(items)

const log = blessed.log({
  height: '40%',
  top: '60%',
  padding: 1
  // Log:
})

screen.append(log)

// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0)
})


items.focus()

screen.render();


// for obfuscating hexs for screenshots
// var re = /[0-f]{4}/g
// obfus = (str) =>
//   str.replace(re, () => Math.random().toString(16).substr(2,4))

lspuck.scan(
  (pucks) => items.setData(pucks),
  (message) => log.add(message)
)
