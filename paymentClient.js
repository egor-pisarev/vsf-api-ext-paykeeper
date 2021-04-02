const createPayment = require('./createPayment')

const rp = require('request-promise');

module.exports = (config) => {

  const client = ({ uri, method, payload }) => {

    return rp({
      method: method,
      json: true,
      uri: `${config.extensions.paykeeper.serverUrl}${uri}`,
      body: payload,
      timeout: 10000,
      auth: {
        user: config.extensions.paykeeper.user,
        pass: config.extensions.paykeeper.pass
      },
      resolveWithFullResponse: true,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }).then(r => {
      console.log('Ricieved response from Paykeeper: ', r.body)
      return r.body
    })
  }


  return {
    createPayment: createPayment(client, config),
    getPayment: () => { }
  }
}