/**
 * Traduction automatique pour les diffusions admin
 * Utilise l'API Google Translate non officielle (sans clé API)
 */
import axios from 'axios';
import logger from './logger.js';

const LANG_CODES = {
  fr: 'fr',
  en: 'en',
  de: 'de',
  zh: 'zh-CN',
};

/**
 * Traduire un texte vers une langue cible
 * @param {string} text - Texte source
 * @param {string} targetLang - Code langue cible (fr, en, de, zh)
 * @param {string} sourceLang - Code langue source (auto par défaut)
 * @returns {Promise<string>}
 */
export async function translateText(text, targetLang, sourceLang = 'auto') {
  if (!text) return text;
  const tl = LANG_CODES[targetLang] || targetLang;
  const sl = sourceLang === 'auto' ? 'auto' : (LANG_CODES[sourceLang] || sourceLang);

  try {
    const url = 'https://translate.googleapis.com/translate_a/single';
    const params = {
      client: 'gtx',
      sl,
      tl,
      dt: 't',
      q: text,
    };

    const response = await axios.get(url, {
      params,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible)',
      },
    });

    if (response.data && Array.isArray(response.data[0])) {
      const translated = response.data[0]
        .map((chunk) => (chunk[0] ? chunk[0] : ''))
        .join('');
      return translated || text;
    }

    return text;
  } catch (err) {
    logger.warn('translateText error — texte original conservé', {
      targetLang,
      err: err.message,
    });
    return text;
  }
}

/**
 * Traduire un texte vers plusieurs langues
 * @param {string} text - Texte source
 * @param {string} sourceLang - Langue source
 * @param {string[]} targetLangs - Langues cibles
 * @returns {Promise<Object>} - Map { lang: translatedText }
 */
export async function translateToAll(text, sourceLang = 'fr', targetLangs = ['fr', 'en', 'de', 'zh']) {
  const results = {};
  await Promise.all(
    targetLangs.map(async (lang) => {
      if (lang === sourceLang) {
        results[lang] = text;
      } else {
        results[lang] = await translateText(text, lang, sourceLang);
      }
    })
  );
  return results;
}
