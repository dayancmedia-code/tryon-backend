// Gerekli kütüphaneleri dahil etme
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
require('dotenv').config();

// Uygulama ve middleware ayarları
const app = express();
const port = process.env.PORT || 3000;

// Gelen JSON verilerini okumak için middleware'i etkinleştirme
app.use(express.json());

// CORS politikası (güvenlik için)
app.use(cors());

// Supabase client oluşturma (Servis anahtarı ile)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        persistSession: false
    }
});

// Anasayfa veya temel URL için GET isteği
app.get('/', (req, res) => {
    res.status(200).send('Backend is running!');
});

// Kullanıcı Kayıt Olma (/api/signup)
app.post('/api/signup', async (req, res) => {
    const { email, password, name } = req.body;

    // Gerekli alanların kontrolü
    if (!email || !password || !name) {
        return res.status(400).json({ error: 'E-posta, şifre ve isim gereklidir.' });
    }

    try {
        // Supabase ile yeni kullanıcı oluşturma
        const { data: userData, error: signUpError } = await supabase.auth.signUp({
            email,
            password
        });

        if (signUpError) {
            return res.status(400).json({ error: signUpError.message });
        }

        // Yeni kullanıcı için 'users' tablosuna başlangıç kredisi ekleme
        const { error: insertError } = await supabase
            .from('users')
            .insert([{ id: userData.user.id, name, credits: 100 }]);

        if (insertError) {
            return res.status(400).json({ error: insertError.message });
        }

        res.status(201).json({ message: 'User created successfully', user: userData.user });

    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Kullanıcı Giriş Yapma (/api/login)
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'E-posta ve şifre gereklidir.' });
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(401).json({ error: error.message });
        }

        res.status(200).json({ message: 'Login successful', session: data.session });

    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Try-on İşlemi ve Kredi Düşürme (/api/tryon)
app.post('/api/tryon', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Token gereklidir.' });
    }

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Geçersiz token.' });
        }

        // Kullanıcının mevcut kredisini al
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('credits')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }

        // Kredi kontrolü
        if (userData.credits <= 0) {
            return res.status(400).json({ error: 'Yetersiz kredi.' });
        }

        // Krediyi düşür
        const { error: updateError } = await supabase
            .from('users')
            .update({ credits: userData.credits - 1 })
            .eq('id', user.id);

        if (updateError) {
            return res.status(400).json({ error: updateError.message });
        }

        res.status(200).json({ message: 'Try-on successful. Credit deducted.' });

    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Manuel Kredi Ekleme (/api/add-credits)
app.post('/api/add-credits', async (req, res) => {
    const { email, creditsToAdd } = req.body;

    // Gerekli alanların kontrolü
    if (!email || !creditsToAdd) {
        return res.status(400).json({ error: 'E-posta ve kredi miktarı girilmesi zorunludur.' });
    }

    try {
        // E-posta ile kullanıcıyı bul
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email);

        if (error || !users || users.length === 0) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }

        const user = users[0];

        // Krediyi güncelle
        const { error: updateError } = await supabase
            .from('users')
            .update({ credits: user.credits + creditsToAdd })
            .eq('id', user.id);

        if (updateError) {
            return res.status(400).json({ error: updateError.message });
        }

        res.status(200).json({ message: `${creditsToAdd} kredi başarıyla eklendi.` });

    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Uygulamayı belirtilen portta başlat
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
