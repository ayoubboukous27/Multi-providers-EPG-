// scripts/fetch-epg-api.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const xml2js = require('xml2js');
const dayjs = require('dayjs');

// ملفات البيانات
const DATA_DIR = path.join(__dirname, '../data');
const CHANNELS_FILE = path.join(DATA_DIR, 'programme-tv.net.channels.xml');
const EPG_DIR = path.join(__dirname, '../epg');

// إنشاء مجلد epg إذا لم يكن موجود
if (!fs.existsSync(EPG_DIR)) fs.mkdirSync(EPG_DIR);

// قراءة القنوات من XML
const parseChannels = () => {
  const xml = fs.readFileSync(CHANNELS_FILE, 'utf-8');
  const parser = new xml2js.Parser();
  return parser.parseStringPromise(xml).then(result => {
    return result.channels.channel.map(ch => ({
      name: ch._,
      site_id: ch.$.site_id,
      xmltv_id: ch.$.xmltv_id || ch.$.site_id
    }));
  });
};

// تحويل وقت إلى صيغة XMLTV
const xmltvTime = dt => dayjs(dt).format('YYYYMMDDHHmmss Z');

// تحويل JSON البرنامج إلى XML
const buildXmlTV = (channels, programs) => {
  const tv = {
    tv: {
      channel: channels.map(ch => ({ $: { id: ch.xmltv_id }, 'display-name': ch.name })),
      programme: programs
    }
  };
  const builder = new xml2js.Builder({ headless: true, rootName: 'tv' });
  return builder.buildObject(tv);
};

// جلب EPG لكل قناة عبر API
const fetchChannelEPG = async (channel, dateStr) => {
  try {
    const url = `https://api-tel.programme-tv.net/modern/channels/${channel.site_id}/programs?date=${dateStr}`;
    const res = await axios.get(url, { headers: { 'Accept': 'application/json' } });
    const programs = res.data.programs || [];
    return programs.map(p => {
      const start = dayjs(p.start);
      const stop = dayjs(p.end);
      const prog = {
        $: {
          start: xmltvTime(start),
          stop: xmltvTime(stop),
          channel: channel.xmltv_id
        },
        title: p.title,
      };
      if (p.subtitle) prog['sub-title'] = p.subtitle;
      if (p.category) prog.category = p.category;
      return prog;
    });
  } catch (err) {
    console.error(`خطأ في جلب EPG للقناة ${channel.name}:`, err.message);
    return [];
  }
};

// Main
(async () => {
  const dateStr = dayjs().format('YYYY-MM-DD');
  const channels = await parseChannels();

  let allPrograms = [];
  for (const ch of channels) {
    console.log(`جارٍ جلب EPG للقناة: ${ch.name}`);
    const programs = await fetchChannelEPG(ch, dateStr);
    allPrograms = allPrograms.concat(programs);
  }

  const xmlContent = buildXmlTV(channels, allPrograms);
  const fileName = path.join(EPG_DIR, `epg-${dateStr}.xml`);
  fs.writeFileSync(fileName, xmlContent, 'utf-8');
  console.log(`تم إنشاء ملف EPG: ${fileName}`);
})();
