// Gerekli kütüphaneleri dahil etme
const express = require('express');
const app = express();
app.use(express.json());
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
require('dotenv').config();

// Uygulama ve port ayarları
const app = express();
const port = 3000;

// Middleware'lar
app.use(express.json());
app.use(cors());

// Supabase client oluşturma (Genel/Kullanıcı işlemleri için anonim anahtar)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
});

// Supabase admin client oluşturma (Yönetici işlemleri için servis anahtarı)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// ### API Uç Noktaları ###

// Kullanıcı Kayıt Endpoint'i: Yeni bir kullanıcı oluşturur ve 0 kredi atar
app.post('/api/signup', async (req, res) => {
    const { email, password, name } = req.body;
    try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        await supabase.from('users').insert([{ id: data.user.id, email: data.user.email, name: name, credits: 0 }]);
        res.status(201).json({ message: 'Kayıt başarılı! Lütfen e-postanızı doğrulayın.', user: data.user });
    } catch (err) {
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// Kullanıcı Giriş Endpoint'i
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            return res.status(401).json({ error: error.message });
        }
        res.status(200).json({ message: 'Giriş başarılı!', session: data.session });
    } catch (err) {
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// Try-on İşlemi İçin Kredi Düşürme Endpoint'i
app.post('/api/tryon', async (req, res) => {
    const { token } = req.body;
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        return res.status(401).json({ error: 'Geçersiz yetkilendirme tokenı.' });
    }
    const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('credits')
        .eq('id', user.id)
        .single();
    if (fetchError || !userData) {
        return res.status(404).json({ error: 'Kullanıcı veya kredi bilgisi bulunamadı.' });
    }
    if (userData.credits <= 0) {
        return res.status(400).json({ error: 'Hakkınız bitmiştir. Lütfen ödeme yapın.' });
    }
    const { error: creditError } = await supabase.rpc('decrease_user_credit', { user_id_uuid: user.id });
    if (creditError) {
        return res.status(400).json({ error: creditError.message });
    }
    res.status(200).json({ message: 'Try-on işlemi başarılı, krediniz düşürüldü.' });
});

// Kredi Ekleme Endpoint'i (Sadece yönetici kullanımı için)
app.post('/api/add-credits', async (req, res) => {
    const { email, amount } = req.body;
    if (!email || !amount) {
        return res.status(400).json({ error: 'E-posta ve kredi miktarı girilmesi zorunludur.' });
    }
    try {
        const { data, error: fetchError } = await supabaseAdmin
            .from('users')
            .select('credits')
            .eq('email', email)
            .single();
        if (fetchError || !data) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }
        const newCredits = data.credits + amount;
        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({ credits: newCredits })
            .eq('email', email);
        if (updateError) {
            return res.status(500).json({ error: 'Kredi güncellenirken hata oluştu.' });
        }
        res.status(200).json({ message: `${email} kullanıcısının kredisi ${amount} artırıldı. Yeni kredi miktarı: ${newCredits}` });
    } catch (err) {
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// Sunucuyu başlatma
app.listen(port, () => {
    console.log(`Sunucu http://localhost:${port} adresinde çalışıyor.`);
});
