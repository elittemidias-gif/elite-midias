const { MercadoPagoConfig, Payment } = require('mercadopago');

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { type, items, payer, total, token, installments, cpf, payment_method_id } = req.body;

    const payment = new Payment(client);

    if (type === 'pix') {
      const result = await payment.create({
        body: {
          transaction_amount: Number(total),
          description: `Fotos Elite Midias`,
          payment_method_id: 'pix',
          payer: {
            email: payer.email,
            first_name: payer.name.split(' ')[0],
            last_name: payer.name.split(' ').slice(1).join(' ') || 'Cliente'
          },
          metadata: {
            payer_email:  payer.email,
            payer_name:   payer.name,
            event_name:   payer.eventName || 'Evento',
            items_list:   items.map(i => '• ' + i.caption).join('\n'),
            drive_links:  items.map(i => i.driveLink || '').join('\n')
          }
        }
      });

      return res.status(200).json({
        id:             result.id,
        status:         result.status,
        qr_code:        result.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
      });
    }

    if (type === 'card') {
      const result = await payment.create({
        body: {
          transaction_amount: Number(total),
          token,
          description: 'Fotos Elite Midias',
          installments: Number(installments) || 1,
          payment_method_id: payment_method_id || 'visa',
          payer: {
            email: payer.email,
            identification: { type: 'CPF', number: cpf }
          },
          metadata: {
            payer_email:  payer.email,
            payer_name:   payer.name,
            event_name:   payer.eventName || 'Evento',
            items_list:   items.map(i => '• ' + i.caption).join('\n'),
            drive_links:  items.map(i => i.driveLink || '').join('\n')
          }
        }
      });

      return res.status(200).json({
        id:            result.id,
        status:        result.status,
        status_detail: result.status_detail
      });
    }

    return res.status(400).json({ error: 'Invalid type' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
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
      console.log(`Email sent to ${meta.payer_email}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'No ID' });
  try {
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` }
    });
    const p = await r.json();
    return res.status(200).json({ status: p.status });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
