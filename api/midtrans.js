export default async function handler(req, res) {
    console.log('=== MIDTRANS API ===');
    console.log('Method:', req.method);
    console.log('Has Key:', process.env.MIDTRANS_SERVER_KEY ? 'Ya' : 'TIDAK');
    console.log('Key awal:', process.env.MIDTRANS_SERVER_KEY ? process.env.MIDTRANS_SERVER_KEY.substring(0, 15) + '...' : 'kosong');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    var SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
    if (!SERVER_KEY) {
        return res.status(500).json({ error: 'MIDTRANS_SERVER_KEY belum diisi' });
    }

    var IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
    var BASE_URL = IS_PRODUCTION
        ? 'https://app.midtrans.com/snap/v1/transactions'
        : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    console.log('Mode:', IS_PRODUCTION ? 'PRODUCTION' : 'SANDBOX');
    console.log('Base URL:', BASE_URL);

    var body = req.body;
    var orderId = body.orderId;
    var amount = parseInt(body.amount);
    var items = body.items || [];

    if (!orderId || !amount || amount <= 0) {
        return res.status(400).json({ error: 'orderId dan amount wajib' });
    }

    // Encode auth
    var authString = Buffer.from(SERVER_KEY + ':').toString('base64');

    // Item details
    var itemDetails = items.map(function (item) {
        return {
            id: String(item.id),
            price: parseInt(item.price),
            quantity: parseInt(item.qty),
            name: (item.name || 'Item').substring(0, 50)
        };
    });

    if (itemDetails.length === 0) {
        itemDetails = [{ id: '1', price: amount, quantity: 1, name: 'Pesanan' }];
    }

    var payload = {
        transaction_details: {
            order_id: orderId,
            gross_amount: amount
        },
        item_details: itemDetails,
        customer_details: {
            first_name: 'Pelanggan',
            email: 'pelanggan@kasirpos.com',
            phone: '081234567890'
        }
    };

    console.log('Payload:', JSON.stringify(payload, null, 2));

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

        var status = response.status;
        var rawText = await response.text();

        console.log('Midtrans HTTP Status:', status);
        console.log('Midtrans Raw Response:', rawText);

        var data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            console.error('Bukan JSON:', rawText);
            return res.status(500).json({ error: 'Response bukan JSON', raw: rawText.substring(0, 200) });
        }

        // Cek error
        if (data.error_message) {
            return res.status(400).json({ error: data.error_message });
        }
        if (data.validation_messages && data.validation_messages.length > 0) {
            return res.status(400).json({ error: data.validation_messages.join(', ') });
        }
        if (data.status_code && data.status_code !== '200' && data.status_code !== 200) {
            return res.status(400).json({ error: 'Midtrans error: ' + (data.status_message || 'Unknown') });
        }

        // Ambil token - cek beberapa kemungkinan field
        var token = data.token || data.snap_token || data.redirect_url || null;

        if (!token) {
            console.error('Tidak ada token. Full keys:', Object.keys(data));
            return res.status(500).json({
                error: 'Token tidak ada di response',
                keys_found: Object.keys(data),
                raw_preview: rawText.substring(0, 300)
            });
        }

        console.log('SUKSES - Token:', String(token).substring(0, 30) + '...');
        res.status(200).json({ token: token });

    } catch (error) {
        console.error('CATCH:', error.message);
        res.status(500).json({ error: 'Gagal: ' + error.message });
    }
}