const emailjs = require('@emailjs/nodejs');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { type, data } = req.body;
    if (type !== 'payment') return res.status(200).json({ received: true });

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
      headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` }
    });
    const payment = await mpRes.json();

    if (payment.status === 'approved') {
      const meta = payment.metadata || {};
      await emailjs.send(
        process.env.EMAILJS_SERVICE_ID,
        process.env.EMAILJS_TEMPLATE_ID,
        {
          to_email:    meta.payer_email || payment.payer?.email,
          client_name: meta.payer_name  || 'Cliente',
          event_name:  meta.event_name  || 'Evento',
          items_list:  meta.items_list  || '',
          drive_link:  meta.drive_links || '',
          total:       `R$ ${Number(payment.transaction_amount).toFixed(2)}`
        },
        {
          publicKey:  process.env.EMAILJS_PUBLIC_KEY,
          privateKey: process.env.EMAILJS_PRIVATE_KEY
        }
      );
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: err.message });
  }
};
