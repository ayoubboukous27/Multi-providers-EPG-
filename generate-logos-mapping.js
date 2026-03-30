const fs = require('fs');
const path = require('path');

// مجلد الشعارات المحلي أو cloned repo
const logoDir = path.join(__dirname, 'tv-logos/countries/france');

// اقرأ كل الملفات في المجلد
const files = fs.readdirSync(logoDir);

// توليد mapping: xmltv_id أو اسم القناة → رابط شعار
const mapping = {};

files.forEach(file => {
  const name = path.basename(file, path.extname(file)).toLowerCase(); // اسم القناة صغير
  mapping[name] = `https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/france/${file}`;
});

// حفظ mapping
fs.writeFileSync('logos-fr.json', JSON.stringify(mapping, null, 2));
console.log('✅ Mapping of logos generated: logos-fr.json');
