// Vercel Serverless Function
// File ini jalan di SERVER, bukan di browser
// Jadi env variable aman di sini

export default function handler(req, res) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        return res.status(500).json({ error: 'Supabase env belum diisi' });
    }

    res.status(200).json({
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
        midtransIsProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true'
    });
}