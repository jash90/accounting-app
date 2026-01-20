/**
 * PKD 2025 - Polska Klasyfikacja Działalności
 * Obowiązuje od 1 stycznia 2025 r.
 * Rozporządzenie Rady Ministrów z dnia 18.12.2024 r. (Dz. U. poz. 1936)
 */

/**
 * Standard PKD code validation regex.
 * Format: XX.XX.X (e.g., 62.01.Z)
 * All PKD codes MUST include the suffix letter.
 */
export const PKD_CODE_REGEX = /^\d{2}\.\d{2}\.[A-Z]$/;

/**
 * Standard validation message for PKD code format errors.
 */
export const PKD_CODE_VALIDATION_MESSAGE = 'Kod PKD musi być w formacie XX.XX.X (np. 62.01.Z)';

export interface PkdSection {
  code: string;
  name: string;
  divisions: string[];
}

export interface PkdDivision {
  code: string;
  name: string;
  section: string;
}

export interface PkdClass {
  code: string;      // np. "01.11.Z"
  name: string;      // opis działalności
  division: string;  // np. "01"
  section: string;   // np. "A"
}

// PKD Sections (Sekcje)
export const PKD_SECTIONS: PkdSection[] = [
  { code: 'A', name: 'Rolnictwo, leśnictwo i rybactwo', divisions: ['01', '02', '03'] },
  { code: 'B', name: 'Górnictwo i wydobywanie', divisions: ['05', '06', '07', '08', '09'] },
  { code: 'C', name: 'Przetwórstwo przemysłowe', divisions: ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33'] },
  { code: 'D', name: 'Wytwarzanie i zaopatrywanie w energię elektryczną, gaz, parę wodną i powietrze do układów klimatyzacyjnych', divisions: ['35'] },
  { code: 'E', name: 'Dostawa wody; gospodarowanie ściekami i odpadami oraz działalność związana z rekultywacją', divisions: ['36', '37', '38', '39'] },
  { code: 'F', name: 'Budownictwo', divisions: ['41', '42', '43'] },
  { code: 'G', name: 'Handel hurtowy i detaliczny', divisions: ['46', '47'] },
  { code: 'H', name: 'Transport i gospodarka magazynowa', divisions: ['49', '50', '51', '52', '53'] },
  { code: 'I', name: 'Działalność związana z zakwaterowaniem i usługami gastronomicznymi', divisions: ['55', '56'] },
  { code: 'J', name: 'Działalność wydawnicza i nadawcza oraz związana z produkcją i dystrybucją treści', divisions: ['58', '59', '60'] },
  { code: 'K', name: 'Działalność usługowa w zakresie telekomunikacji, programowania komputerowego, doradztwa, infrastruktury obliczeniowej oraz pozostała działalność usługowa w zakresie informacji', divisions: ['61', '62', '63'] },
  { code: 'L', name: 'Działalność finansowa i ubezpieczeniowa', divisions: ['64', '65', '66'] },
  { code: 'M', name: 'Działalność związana z obsługą rynku nieruchomości', divisions: ['68'] },
  { code: 'N', name: 'Działalność profesjonalna, naukowa i techniczna', divisions: ['69', '70', '71', '72', '73', '74', '75'] },
  { code: 'O', name: 'Działalność w zakresie usług administrowania i działalność wspierająca', divisions: ['77', '78', '79', '80', '81', '82'] },
  { code: 'P', name: 'Administracja publiczna i obrona narodowa; obowiązkowe ubezpieczenia społeczne', divisions: ['84'] },
  { code: 'Q', name: 'Edukacja', divisions: ['85'] },
  { code: 'R', name: 'Opieka zdrowotna i pomoc społeczna', divisions: ['86', '87', '88'] },
  { code: 'S', name: 'Działalność związana z kulturą, sportem i rekreacją', divisions: ['90', '91', '92', '93'] },
  { code: 'T', name: 'Pozostała działalność usługowa', divisions: ['94', '95', '96'] },
  { code: 'U', name: 'Gospodarstwa domowe zatrudniające pracowników oraz gospodarstwa domowe produkujące wyroby i świadczące usługi na własne potrzeby', divisions: ['97', '98'] },
  { code: 'V', name: 'Organizacje i zespoły eksterytorialne', divisions: ['99'] },
];

// PKD Divisions (Działy) - szczegółowa lista
export const PKD_DIVISIONS: PkdDivision[] = [
  // Sekcja A - Rolnictwo, leśnictwo i rybactwo
  { code: '01', name: 'Uprawy rolne, chów i hodowla zwierząt, łowiectwo', section: 'A' },
  { code: '02', name: 'Leśnictwo i pozyskiwanie drewna', section: 'A' },
  { code: '03', name: 'Rybactwo', section: 'A' },

  // Sekcja B - Górnictwo i wydobywanie
  { code: '05', name: 'Wydobywanie węgla kamiennego i brunatnego', section: 'B' },
  { code: '06', name: 'Górnictwo ropy naftowej i gazu ziemnego', section: 'B' },
  { code: '07', name: 'Górnictwo rud metali', section: 'B' },
  { code: '08', name: 'Pozostałe górnictwo i wydobywanie', section: 'B' },
  { code: '09', name: 'Działalność usługowa wspomagająca górnictwo', section: 'B' },

  // Sekcja C - Przetwórstwo przemysłowe
  { code: '10', name: 'Produkcja artykułów spożywczych', section: 'C' },
  { code: '11', name: 'Produkcja napojów', section: 'C' },
  { code: '12', name: 'Produkcja wyrobów tytoniowych', section: 'C' },
  { code: '13', name: 'Produkcja wyrobów tekstylnych', section: 'C' },
  { code: '14', name: 'Produkcja odzieży', section: 'C' },
  { code: '15', name: 'Produkcja skór i wyrobów skórzanych', section: 'C' },
  { code: '16', name: 'Produkcja wyrobów z drewna i korka', section: 'C' },
  { code: '17', name: 'Produkcja papieru i wyrobów z papieru', section: 'C' },
  { code: '18', name: 'Poligrafia i reprodukcja zapisanych nośników', section: 'C' },
  { code: '19', name: 'Produkcja koksu i produktów rafinacji ropy', section: 'C' },
  { code: '20', name: 'Produkcja chemikaliów i wyrobów chemicznych', section: 'C' },
  { code: '21', name: 'Produkcja farmaceutyków', section: 'C' },
  { code: '22', name: 'Produkcja wyrobów z gumy i tworzyw sztucznych', section: 'C' },
  { code: '23', name: 'Produkcja wyrobów z pozostałych surowców niemetalicznych', section: 'C' },
  { code: '24', name: 'Produkcja metali', section: 'C' },
  { code: '25', name: 'Produkcja wyrobów z metali', section: 'C' },
  { code: '26', name: 'Produkcja komputerów, wyrobów elektronicznych i optycznych', section: 'C' },
  { code: '27', name: 'Produkcja urządzeń elektrycznych', section: 'C' },
  { code: '28', name: 'Produkcja maszyn i urządzeń', section: 'C' },
  { code: '29', name: 'Produkcja pojazdów samochodowych', section: 'C' },
  { code: '30', name: 'Produkcja pozostałego sprzętu transportowego', section: 'C' },
  { code: '31', name: 'Produkcja mebli', section: 'C' },
  { code: '32', name: 'Pozostała produkcja wyrobów', section: 'C' },
  { code: '33', name: 'Naprawa, konserwacja i instalowanie maszyn', section: 'C' },

  // Sekcja D - Energia
  { code: '35', name: 'Wytwarzanie i zaopatrywanie w energię elektryczną, gaz, parę wodną', section: 'D' },

  // Sekcja E - Woda i odpady
  { code: '36', name: 'Pobór, uzdatnianie i dostarczanie wody', section: 'E' },
  { code: '37', name: 'Odprowadzanie i oczyszczanie ścieków', section: 'E' },
  { code: '38', name: 'Zbieranie, odzysk i unieszkodliwianie odpadów', section: 'E' },
  { code: '39', name: 'Rekultywacja i pozostała działalność związana z odpadami', section: 'E' },

  // Sekcja F - Budownictwo
  { code: '41', name: 'Roboty budowlane związane ze wznoszeniem budynków', section: 'F' },
  { code: '42', name: 'Roboty związane z budową obiektów inżynierii lądowej i wodnej', section: 'F' },
  { code: '43', name: 'Roboty budowlane specjalistyczne', section: 'F' },

  // Sekcja G - Handel
  { code: '46', name: 'Handel hurtowy', section: 'G' },
  { code: '47', name: 'Handel detaliczny', section: 'G' },

  // Sekcja H - Transport
  { code: '49', name: 'Transport lądowy i rurociągowy', section: 'H' },
  { code: '50', name: 'Transport wodny', section: 'H' },
  { code: '51', name: 'Transport lotniczy', section: 'H' },
  { code: '52', name: 'Magazynowanie i działalność wspomagająca transport', section: 'H' },
  { code: '53', name: 'Działalność pocztowa i kurierska', section: 'H' },

  // Sekcja I - Zakwaterowanie i gastronomia
  { code: '55', name: 'Zakwaterowanie', section: 'I' },
  { code: '56', name: 'Działalność usługowa związana z wyżywieniem', section: 'I' },

  // Sekcja J - Działalność wydawnicza i nadawcza
  { code: '58', name: 'Działalność wydawnicza', section: 'J' },
  { code: '59', name: 'Produkcja filmów, nagrań wideo i muzycznych', section: 'J' },
  { code: '60', name: 'Nadawanie programów, działalność agencji informacyjnych', section: 'J' },

  // Sekcja K - IT i telekomunikacja
  { code: '61', name: 'Telekomunikacja', section: 'K' },
  { code: '62', name: 'Działalność związana z programowaniem i doradztwem informatycznym', section: 'K' },
  { code: '63', name: 'Działalność usługowa w zakresie infrastruktury obliczeniowej, hostingu, przetwarzania danych', section: 'K' },

  // Sekcja L - Finanse i ubezpieczenia
  { code: '64', name: 'Finansowa działalność usługowa', section: 'L' },
  { code: '65', name: 'Ubezpieczenia, reasekuracja, fundusze emerytalne', section: 'L' },
  { code: '66', name: 'Działalność wspomagająca usługi finansowe', section: 'L' },

  // Sekcja M - Nieruchomości
  { code: '68', name: 'Działalność związana z obsługą rynku nieruchomości', section: 'M' },

  // Sekcja N - Działalność profesjonalna
  { code: '69', name: 'Działalność prawnicza, rachunkowo-księgowa, doradztwo podatkowe', section: 'N' },
  { code: '70', name: 'Działalność central (head offices), doradztwo w zarządzaniu', section: 'N' },
  { code: '71', name: 'Działalność w zakresie architektury i inżynierii', section: 'N' },
  { code: '72', name: 'Badania naukowe i prace rozwojowe', section: 'N' },
  { code: '73', name: 'Reklama, badanie rynku, public relations', section: 'N' },
  { code: '74', name: 'Pozostała działalność profesjonalna, naukowa i techniczna', section: 'N' },
  { code: '75', name: 'Działalność weterynaryjna', section: 'N' },

  // Sekcja O - Usługi administrowania
  { code: '77', name: 'Wynajem i dzierżawa', section: 'O' },
  { code: '78', name: 'Działalność związana z zatrudnieniem', section: 'O' },
  { code: '79', name: 'Działalność turystyczna i rezerwacyjna', section: 'O' },
  { code: '80', name: 'Działalność detektywistyczna i ochroniarska', section: 'O' },
  { code: '81', name: 'Utrzymanie porządku w budynkach, zagospodarowanie terenów zieleni', section: 'O' },
  { code: '82', name: 'Działalność związana z obsługą biura', section: 'O' },

  // Sekcja P - Administracja publiczna
  { code: '84', name: 'Administracja publiczna i obrona narodowa', section: 'P' },

  // Sekcja Q - Edukacja
  { code: '85', name: 'Edukacja', section: 'Q' },

  // Sekcja R - Opieka zdrowotna
  { code: '86', name: 'Opieka zdrowotna', section: 'R' },
  { code: '87', name: 'Pomoc społeczna z zakwaterowaniem', section: 'R' },
  { code: '88', name: 'Pomoc społeczna bez zakwaterowania', section: 'R' },

  // Sekcja S - Kultura, sport, rekreacja
  { code: '90', name: 'Działalność twórcza i artystyczna', section: 'S' },
  { code: '91', name: 'Biblioteki, archiwa, muzea', section: 'S' },
  { code: '92', name: 'Działalność związana z grami hazardowymi', section: 'S' },
  { code: '93', name: 'Działalność sportowa, rozrywkowa i rekreacyjna', section: 'S' },

  // Sekcja T - Pozostała działalność usługowa
  { code: '94', name: 'Działalność organizacji członkowskich', section: 'T' },
  { code: '95', name: 'Naprawa komputerów, artykułów użytku osobistego i pojazdów', section: 'T' },
  { code: '96', name: 'Działalność usługowa indywidualna', section: 'T' },

  // Sekcja U - Gospodarstwa domowe
  { code: '97', name: 'Gospodarstwa domowe zatrudniające pracowników', section: 'U' },
  { code: '98', name: 'Gospodarstwa domowe produkujące na własne potrzeby', section: 'U' },

  // Sekcja V - Organizacje eksterytorialne
  { code: '99', name: 'Organizacje i zespoły eksterytorialne', section: 'V' },
];

// Import PKD_CLASSES for internal use and re-export for external consumers
import { PKD_CLASSES } from './pkd-classes';
export { PKD_CLASSES };

// Helper function to get PKD code with full label (supports both division and class codes)
export function getPkdLabel(code: string): string {
  // First try to find as division (2-digit)
  const division = PKD_DIVISIONS.find(d => d.code === code);
  if (division) {
    return `${division.code} - ${division.name}`;
  }

  // Try to find as class (XX.XX.X format)
  const pkdClass = PKD_CLASSES.find((c) => c.code === code);
  if (pkdClass) {
    return `${pkdClass.code} - ${pkdClass.name}`;
  }

  return code;
}

// Helper function to get section name by code
export function getSectionName(sectionCode: string): string {
  const section = PKD_SECTIONS.find(s => s.code === sectionCode);
  return section?.name || sectionCode;
}

// Get divisions grouped by section for UI
export function getPkdDivisionsBySection(): Map<string, PkdDivision[]> {
  const grouped = new Map<string, PkdDivision[]>();

  PKD_SECTIONS.forEach(section => {
    const divisions = PKD_DIVISIONS.filter(d => d.section === section.code);
    grouped.set(section.code, divisions);
  });

  return grouped;
}

// Get classes grouped by section for UI
export function getPkdClassesBySection(): Map<string, PkdClass[]> {
  const grouped = new Map<string, PkdClass[]>();

  PKD_SECTIONS.forEach(section => {
    const classes = PKD_CLASSES.filter((c) => c.section === section.code);
    grouped.set(section.code, classes);
  });

  return grouped;
}

// Get classes by division code
export function getPkdClassesByDivision(divisionCode: string): PkdClass[] {
  return PKD_CLASSES.filter((c) => c.division === divisionCode);
}

// Validate if a PKD code exists
export function isValidPkdCode(code: string): boolean {
  return PKD_CLASSES.some((c) => c.code === code);
}

// Get all valid PKD codes as a Set for fast lookup
export function getValidPkdCodes(): Set<string> {
  return new Set(PKD_CLASSES.map((c) => c.code));
}

// =====================================================
// Frontend-compatible data structures and adapters
// =====================================================

/**
 * Frontend-compatible PKD code format
 * Used by GroupedCombobox and form components
 */
export interface PkdCodeOption {
  code: string;    // e.g., "01.11.Z"
  label: string;   // e.g., "01.11.Z - Uprawa zbóż"
  section: string; // e.g., "A"
  division: string; // e.g., "01"
}

/**
 * Frontend-compatible section format for GroupedCombobox groups
 */
export interface PkdSectionGroup {
  key: string;   // e.g., "A"
  label: string; // e.g., "A - Rolnictwo, leśnictwo i rybactwo"
}

/**
 * Get PKD codes in frontend-compatible format
 * Transforms backend PkdClass[] to PkdCodeOption[]
 */
export function getPkdCodesForFrontend(): PkdCodeOption[] {
  return PKD_CLASSES.map((pkd) => ({
    code: pkd.code,
    label: `${pkd.code} - ${pkd.name}`,
    section: pkd.section,
    division: pkd.division,
  }));
}

/**
 * Get PKD sections in frontend-compatible format
 * Transforms PKD_SECTIONS to simple key-label object
 */
export function getPkdSectionsForFrontend(): Record<string, string> {
  const sections: Record<string, string> = {};
  PKD_SECTIONS.forEach(section => {
    sections[section.code] = `${section.code} - ${section.name}`;
  });
  return sections;
}

/**
 * Get PKD section groups for GroupedCombobox
 */
export function getPkdSectionGroups(): PkdSectionGroup[] {
  return PKD_SECTIONS.map(section => ({
    key: section.code,
    label: `${section.code} - ${section.name}`,
  }));
}

/**
 * Get PKD codes as combobox options format
 * Ready for use with GroupedCombobox component
 */
export function getPkdComboboxOptions(): Array<{ value: string; label: string; group: string }> {
  return PKD_CLASSES.map((pkd) => ({
    value: pkd.code,
    label: `${pkd.code} - ${pkd.name}`,
    group: pkd.section,
  }));
}
