import { apiStatus } from '../../../lib/util'
import { Router } from 'express'
import paymentClient from './paymentClient'
import PlatformFactory from '../../../platform/factory';
import asyncRedis from 'async-redis'

const serviceName = 'paykeeper'

const ipList = [
]

const genRedisKey = (id) => `${serviceName}:payment:${id}`

module.exports = ({ config }) => {

  const md5 = require('md5')

  const buildKey = ({ cartId, amount }) => `${cartId}:${amount}`

  const client = paymentClient(config)

  const redis = asyncRedis.createClient(config.redis)

  const api = Router();

  const _getProxy = (req) => {
    const platform = config.platform
    const factory = new PlatformFactory(config, req)
    return factory.getAdapter(platform, 'webhook')
  };

  api.post('/form', (req, res) => {
    const { amount, cartId } = req.body
    if (!amount || !cartId) {
      apiStatus(res, new Error(`Not required params`), 400)
      return
    }

    apiStatus(res, { success: true, result: {
      form: {
        action: `${config.extensions[serviceName].serverUrl}/create/`,
        fields: {
          sum: amount,
        }
      }
    } }, 200)

  })


  api.post('/token', (req, res) => {

    const { amount, cartId } = req.body

    if (!amount || !cartId) {
      apiStatus(res, new Error(`Not required params`), 400)
      return
    }

    let repeatTimes = 0

    const sendCreatePaymentRequest = () => {
      repeatTimes++
      client.createPayment(amount, cartId).then(result => {
        apiStatus(res, { success: true, result: result.confirmation.confirmation_url }, 200)
      }).catch(err => {
        console.log(`Send ${serviceName} Payment request error. Repeat after ${config.extensions[serviceName].repeatOnError.interval} milisec ${repeatTimes} times`, err.message)
        if (repeatTimes > config.extensions[serviceName].repeatOnError.times) {
          apiStatus(res, new Error(`Send ${serviceName} Payment request error more than ${config.extensions[serviceName].repeatOnError.times} times`), 500);
        } else {
          setTimeout(() => sendCreatePaymentRequest(), config.extensions[serviceName].repeatOnError.interval)
        }
      })
    }

    sendCreatePaymentRequest()

  })

  api.get('/orderCheck/:id', (res, req) => {
    console.log('check payment', res.params.id)
    client.getPayment(res.params.id).then(function (result) {
      console.log({ payment: result });
      apiStatus(res, result, 200);
    })
      .catch(function (err) {
        console.error(err);
        apiStatus(res, err, 500);
      })
  })

  api.post('/orderPaid', (req, res) => {

    console.log(req.body)

    const webhookProxy = _getProxy(req)

    const { id, sum, clientid, orderid, key } = req.body

    const calcKey = md5(`${id}${sum}${clientid}${orderid}${config.extensions[serviceName].secretWord}`);

    console.log(key, calcKey)

    if (event === 'payment.succeeded') {

      redis.get(genRedisKey(object.id))
        .then(result => JSON.parse(result))
        .then(({ cartId }) => {
          console.log('Send orderPaid to platform', cartId)
          return webhookProxy.orderPaid({
            cartId
          })
        })
        .then((result) => {
          apiStatus(res, result, 200);
        })
        .catch(err => {
          console.log(err)
          apiStatus(res, err, 500);
        })

    }



  })



  return api;
}