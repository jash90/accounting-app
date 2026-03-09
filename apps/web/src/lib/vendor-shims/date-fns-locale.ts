// Shim for date-fns/locale barrel export.
// The full barrel bundles ~100 locales (~600 kB raw).
// Only export the locales actually used in this app.
export { enUS } from 'date-fns/locale/en-US';
export { pl } from 'date-fns/locale/pl';
