export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    var SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
    if (!SERVER_KEY) {
        return res.status(500).json({ error: 'MIDTRANS_SERVER_KEY belum diisi di Vercel' });
    }

    var IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
    var BASE_URL = IS_PRODUCTION
        ? 'https://app.midtrans.com/snap/v1/transactions'
        : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    var body = req.body;
    var orderId = body.orderId;
    var amount = body.amount;
    var items = body.items || [];

    if (!orderId || !amount) {
        return res.status(400).json({ error: 'orderId dan amount wajib' });
    }

    // Encode server key ke base64
    var authString = Buffer.from(SERVER_KEY + ':').toString('base64');

    // Format item details untuk Midtrans
    var itemDetails = items.map(function (item) {
        return {
            id: String(item.id),
            price: item.price,
            quantity: item.qty,
            name: item.name.substring(0, 50)
        };
    });

    var payload = {
        transaction_details: {
            order_id: orderId,
            gross_amount: amount
        },
        item_details: itemDetails.length > 0 ? itemDetails : [{
            id: '1',
            price: amount,
            quantity: 1,
            name: 'Pesanan KasirPOS'
        }],
        customer_details: {
            first_name: 'Pelanggan',
            email: 'pelanggan@kasirpos.com',
            phone: '08123456789'
        },
        callbacks: {
            finish: req.headers.origin || 'https://localhost',
            error: req.headers.origin || 'https://localhost',
            pending: req.headers.origin || 'https://localhost'
        }
    };

    try {
        var response = await fetch(BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': 'Basic ' + authString
            },
            body: JSON.stringify(payload)
        });

        var data = await response.json();

        if (data.error_message) {
            return res.status(400).json({ error: data.error_message });
        }

        res.status(200).json({ snap_token: data.token, redirect_url: data.redirect_url });
    } catch (error) {
        res.status(500).json({ error: 'Gagal menghubungi Midtrans: ' + error.message });
    }
}