export default async function handler(req, res) {
    // Log untuk debugging
    console.log('=== MIDTRANS API CALLED ===');
    console.log('Method:', req.method);
    console.log('Has SERVER_KEY:', process.env.MIDTRANS_SERVER_KEY ? 'Ya' : 'TIDAK');
    console.log('Body:', JSON.stringify(req.body));

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    var SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
    if (!SERVER_KEY) {
        console.error('SERVER KEY TIDAK ADA');
        return res.status(500).json({ error: 'MIDTRANS_SERVER_KEY belum diisi di Vercel' });
    }

    var IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
    var BASE_URL = IS_PRODUCTION
        ? 'https://app.midtrans.com/snap/v1/transactions'
        : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    console.log('Mode:', IS_PRODUCTION ? 'PRODUCTION' : 'SANDBOX');
    console.log('URL:', BASE_URL);

    var body = req.body;
    var orderId = body.orderId;
    var amount = parseInt(body.amount);
    var items = body.items || [];

    console.log('Order ID:', orderId);
    console.log('Amount:', amount);

    if (!orderId || !amount || amount <= 0) {
        console.error('orderId atau amount tidak valid');
        return res.status(400).json({ error: 'orderId dan amount wajib, amount harus > 0' });
    }

    // Encode server key ke base64
    var authString = Buffer.from(SERVER_KEY + ':').toString('base64');
    console.log('Auth encoded:', authString.substring(0, 10) + '...');

    // Format item details
    var itemDetails = items.map(function (item) {
        return {
            id: String(item.id),
            price: parseInt(item.price),
            quantity: parseInt(item.qty),
            name: (item.name || 'Item').substring(0, 50)
        };
    });

    // Kalau item details kosong, buat dummy
    if (itemDetails.length === 0) {
        itemDetails = [{
            id: '1',
            price: amount,
            quantity: 1,
            name: 'Pesanan KasirPOS'
        }];
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

    console.log('Payload:', JSON.stringify(payload));

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

        var text = await response.text();
        console.log('Midtrans response status:', response.status);
        console.log('Midtrans response body:', text);

        var data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Response bukan JSON:', text);
            return res.status(500).json({ error: 'Response tidak valid dari Midtrans' });
        }

        if (data.error_message) {
            console.error('Midtrans error:', data.error_message);
            return res.status(400).json({ error: data.error_message });
        }

        if (!data.token) {
            console.error('Token tidak ada di response');
            return res.status(500).json({ error: 'Token tidak ditemukan di response Midtrans' });
        }

        console.log('TOKEN BERHASIL:', data.token.substring(0, 20) + '...');
        res.status(200).json({ token: data.token });

    } catch (error) {
        console.error('CATCH ERROR:', error.message);
        res.status(500).json({ error: 'Gagal menghubungi Midtrans: ' + error.message });
    }
}