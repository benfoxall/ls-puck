const noble = require('noble')
const chalk = require('chalk')

const poweredOn = () => {
  if(noble.state == 'poweredOn')
    return Promise.resolve()

  return new Promise(resolve => {
    noble.once('stateChange', state => {
      if(state == 'poweredOn') resolve()
    })
  })
}

const delay = millis => new Promise(
  resolve => setTimeout(resolve, millis)
)

const ready = () =>
  poweredOn().then(delay(100))



const devices = new Map
// the pucks we're looking for
const puck = [[ 'Name', 'uuid', 'Battery']]

let log = console.log.bind(console)

// look for pucks
function scan(callback, _log) {
  if(_log) log = _log

  ready()
    .then(() => {

      noble.on('discover', (peripheral) => {

        const name = peripheral.advertisement.localName || "Unknown"

        // if it quacks like a puck, it's a puck
        const isPuck = name.indexOf('Puck.js') == 0

        log(
          `found ${peripheral.id} - ${chalk.underline(name)}`
        )


        if(isPuck) {
          devices.set(peripheral.id, peripheral)
          puck.push([name, peripheral.id, 'unknown'])
          callback(puck)
        }

      })

      noble.startScanning([], false)


    })

  log('starting scan')

}


function ping(i) {
  // connect to a device and flash LEDss

  const device = devices.get(puck[i][1])

  log(`connecting to device ${i} - ${device && device.id}`)

  if(device) {

    new BLE(device)

  }




}

module.exports.scan = scan
module.exports.ping = ping







const to_noble = s => s.replace(/[^0-f]/g, '')

const UART = to_noble('6e400001-b5a3-f393-e0a9-e50e24dcca9e')
const TX   = to_noble('6e400002-b5a3-f393-e0a9-e50e24dcca9e')
const RX   = to_noble('6e400003-b5a3-f393-e0a9-e50e24dcca9e')

const messageRE = /<~([a-zA-Z0-9+]+={0,2})~>/


class BLE {
  constructor(device) {
    this.device = device
    this.connect()
  }

  send(message) {
    // todo - sending multiple messages at same time
    // will break things

    if(!this.tx) {
      this.sendQueue.push(message)
      return Promise.resolve()
    }

    if(!message.length) return Promise.resolve()

    return new Promise((resolve, reject) => {

      const buffer = Buffer.from(
        message.slice(0,20), 'ascii'
      )

      this.tx.write(buffer, false, err => {
        if(err) reject(err)
        resolve()
      })
    })
    .then(() =>
      this.send(message.slice(20))
    )
  }

  connect() {

    // request BLE connection
    return new Promise((resolve, reject) => {
      this.device.connect()
      this.device.once('connect', () => {
        this.device.discoverAllServicesAndCharacteristics(
          (err, services, characteristics) => {
            if(err) return reject(err)

            const uart = services.find(item => item.uuid == UART)

            if(!uart) return reject("Couldn't find UART service")

            const tx = uart.characteristics.find(item => item.uuid == TX)
            const rx = uart.characteristics.find(item => item.uuid == RX)

            if(!(tx && rx)) return reject("Couldn't find TX/RX services")

            this.tx = tx
            this.rx = rx

            log("connected to uart service")
            resolve()
        })
      })
    })


    .then(() => {

      log("Sending message to " + this.device.id)
      this.send(';LED1.write(1); setTimeout(()=>{ LED1.reset() }, 1000);\n')
        .then(() =>{
          log("disconnecting from " + this.device.id)
          this.device.disconnect(() =>{
            log("disconnected")
          })
        })
    })
  }

}
