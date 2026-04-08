import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.apptax.pl',
  integrations: [
    sitemap({ i18n: { defaultLocale: 'pl', locales: { pl: 'pl-PL' } } }),
  ],
  output: 'static',
  build: { assets: 'assets' },
});
