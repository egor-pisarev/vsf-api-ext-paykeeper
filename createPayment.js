module.exports = (client, config) => {

    return async (amount, orderId) => {

        const { token } = await client({
            uri: `/info/settings/token/`,
            method: 'GET',
        })

        const result = await client({
            uri: `/change/invoice/preview/?token=${token}&pay_amount=${amount}`,
            method: 'POST',
        })

        if (result.result === 'fail') {
            throw new Error(result.msg)
        }
        else if (result.invoice_id) {
            return {
                confirmation: {
                    confirmation_url: `/bill/${result.invoice_id}/`
                }
            }
        }

    }
}
