const os = require('os')

let interfaces = os.networkInterfaces()
let addresses = []
for (var k in interfaces) {
  for (var k2 in interfaces[k]) {
    var address = interfaces[k][k2]
    if (address.family === 'IPv4' && !address.internal) {
      addresses.push(address.address)
    }
  }
}

const getIpv4 = () => {
  if (addresses.length === 0) {
    return '127.0.0.1'
  } else {
    return addresses[0]
  }
}

module.exports = getIpv4
