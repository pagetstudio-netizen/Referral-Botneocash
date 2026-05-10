import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

const Settings = mongoose.model('Settings', settingsSchema);

// Defaults à initialiser au démarrage
const DEFAULT_SETTINGS = {
  referral_bonus: { value: 120, description: 'Bonus par parrainage en FCFA' },
  daily_bonus: { value: 100, description: 'Bonus quotidien en FCFA' },
  min_withdraw: { value: 800, description: 'Retrait minimum en FCFA' },
  required_channel: { value: '', description: 'ID ou username du canal obligatoire (ex: @moncanal)' },
  required_group: { value: '', description: 'ID ou username du groupe obligatoire' },
  required_site: { value: '', description: "URL du site obligatoire à rejoindre" },
  support_link: { value: '', description: 'Lien vers le support Telegram' },
  admin_group_id: { value: '', description: 'ID du groupe admin pour les notifications' },
  maintenance_mode: { value: false, description: 'Mode maintenance activé/désactivé' },
  bot_name: { value: 'NeoCash', description: 'Nom du bot' },
};

async function initSettings() {
  for (const [key, data] of Object.entries(DEFAULT_SETTINGS)) {
    await Settings.findOneAndUpdate(
      { key },
      { $setOnInsert: { key, value: data.value, description: data.description } },
      { upsert: true, new: true }
    );
  }
}

async function getSetting(key) {
  const setting = await Settings.findOne({ key });
  return setting ? setting.value : DEFAULT_SETTINGS[key]?.value ?? null;
}

async function setSetting(key, value) {
  return Settings.findOneAndUpdate({ key }, { value }, { upsert: true, new: true });
}

export { Settings as default, initSettings, getSetting, setSetting };
