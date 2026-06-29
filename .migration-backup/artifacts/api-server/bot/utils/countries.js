/**
 * Pays et opérateurs Mobile Money disponibles
 */

const COUNTRIES = {
  togo: {
    name: 'Togo 🇹🇬',
    code: 'togo',
    currency: 'FCFA',
    flag: '🇹🇬',
    operators: ['TMoney', 'Moov Togo', 'Flooz'],
    phonePrefix: '+228',
  },
  benin: {
    name: 'Bénin 🇧🇯',
    code: 'benin',
    currency: 'FCFA',
    flag: '🇧🇯',
    operators: ['MTN Mobile Money', 'Moov Money', 'Celtiis Cash'],
    phonePrefix: '+229',
  },
  cote_ivoire: {
    name: "Côte d'Ivoire 🇨🇮",
    code: 'cote_ivoire',
    currency: 'FCFA',
    flag: '🇨🇮',
    operators: ['MTN Mobile Money', 'Orange Money', 'Moov Money', 'Wave'],
    phonePrefix: '+225',
  },
  senegal: {
    name: 'Sénégal 🇸🇳',
    code: 'senegal',
    currency: 'FCFA',
    flag: '🇸🇳',
    operators: ['Orange Money', 'Wave', 'Free Money', 'Expresso Cash'],
    phonePrefix: '+221',
  },
  mali: {
    name: 'Mali 🇲🇱',
    code: 'mali',
    currency: 'FCFA',
    flag: '🇲🇱',
    operators: ['Orange Money', 'Moov Money', 'Wave', 'Sama Money'],
    phonePrefix: '+223',
  },
  burkina_faso: {
    name: 'Burkina Faso 🇧🇫',
    code: 'burkina_faso',
    currency: 'FCFA',
    flag: '🇧🇫',
    operators: ['Orange Money', 'Moov Money', 'Coris Money'],
    phonePrefix: '+226',
  },
  niger: {
    name: 'Niger 🇳🇪',
    code: 'niger',
    currency: 'FCFA',
    flag: '🇳🇪',
    operators: ['Airtel Money', 'Moov Money Niger'],
    phonePrefix: '+227',
  },
  guinee: {
    name: 'Guinée 🇬🇳',
    code: 'guinee',
    currency: 'GNF',
    flag: '🇬🇳',
    operators: ['Orange Money', 'MTN Mobile Money', 'Cellcom Money'],
    phonePrefix: '+224',
  },
  cameroun: {
    name: 'Cameroun 🇨🇲',
    code: 'cameroun',
    currency: 'FCFA',
    flag: '🇨🇲',
    operators: ['MTN Mobile Money', 'Orange Money'],
    phonePrefix: '+237',
  },
  congo: {
    name: 'Congo Brazzaville 🇨🇬',
    code: 'congo',
    currency: 'FCFA',
    flag: '🇨🇬',
    operators: ['Airtel Money', 'MTN Mobile Money'],
    phonePrefix: '+242',
  },
};

function getCountryList() {
  return Object.values(COUNTRIES);
}

function getCountry(code) {
  return COUNTRIES[code] || null;
}

function getOperators(countryCode) {
  const country = COUNTRIES[countryCode];
  return country ? country.operators : [];
}

export { COUNTRIES, getCountryList, getCountry, getOperators };
