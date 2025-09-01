import 'dotenv/config';
import pkg from '@supabase/supabase-js';
const { createClient } = pkg;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testInsert() {
  console.log("Başladı...");

  // tabloya yeni kullanıcı ekleyelim
  const { data, error } = await supabase
    .from('users')
    .insert([{ name: 'Ahmet', email: 'ahmet@mail.com' }])
    .select();

  if (error) {
    console.error("Hata:", error);
  } else {
    console.log("Başarıyla eklendi:", data);
  }

  // tüm kullanıcıları çekelim
  const { data: allUsers, error: fetchError } = await supabase
    .from('users')
    .select('*');

  if (fetchError) {
    console.error("Çekme hatası:", fetchError);
  } else {
    console.log("Mevcut kullanıcılar:", allUsers);
  }
}

testInsert();
