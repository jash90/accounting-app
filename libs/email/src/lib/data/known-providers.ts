import { KnownProvider } from '../interfaces/autodiscovery.interface';

/**
 * Database of known email providers with pre-configured SMTP/IMAP settings
 * Includes global providers and Polish email services
 */
export const KNOWN_PROVIDERS: KnownProvider[] = [
  // ============================================
  // GLOBAL PROVIDERS
  // ============================================

  // Google (Gmail, Google Workspace)
  {
    domains: ['gmail.com', 'googlemail.com'],
    aliases: ['google.com'],
    smtp: {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      authMethod: 'oauth2',
    },
    imap: {
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
    },
    provider: 'Google',
    displayName: 'Gmail',
    documentationUrl: 'https://support.google.com/mail/answer/7126229',
    requiresAppPassword: true,
    requiresOAuth: true,
    notes: 'Requires App Password or OAuth2. Enable "Less secure apps" or use App Passwords with 2FA.',
  },

  // Microsoft (Outlook, Hotmail, Live)
  {
    domains: ['outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'outlook.pl'],
    smtp: {
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false, // STARTTLS
      authMethod: 'login',
    },
    imap: {
      host: 'outlook.office365.com',
      port: 993,
      tls: true,
    },
    provider: 'Microsoft',
    displayName: 'Outlook.com',
    documentationUrl: 'https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-8361e398-8af4-4e97-b147-6c6c4ac95353',
    requiresAppPassword: true,
    notes: 'May require App Password with 2FA enabled.',
  },

  // Office 365 (Business)
  {
    domains: ['office365.com'],
    smtp: {
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      authMethod: 'oauth2',
    },
    imap: {
      host: 'outlook.office365.com',
      port: 993,
      tls: true,
    },
    provider: 'Microsoft 365',
    displayName: 'Microsoft 365',
    requiresOAuth: true,
  },

  // Yahoo
  {
    domains: ['yahoo.com', 'yahoo.pl', 'yahoo.co.uk', 'ymail.com', 'rocketmail.com'],
    smtp: {
      host: 'smtp.mail.yahoo.com',
      port: 465,
      secure: true,
      authMethod: 'plain',
    },
    imap: {
      host: 'imap.mail.yahoo.com',
      port: 993,
      tls: true,
    },
    provider: 'Yahoo',
    displayName: 'Yahoo Mail',
    documentationUrl: 'https://help.yahoo.com/kb/SLN4724.html',
    requiresAppPassword: true,
    notes: 'Requires App Password generated in Yahoo account settings.',
  },

  // iCloud
  {
    domains: ['icloud.com', 'me.com', 'mac.com'],
    smtp: {
      host: 'smtp.mail.me.com',
      port: 587,
      secure: false,
      authMethod: 'plain',
    },
    imap: {
      host: 'imap.mail.me.com',
      port: 993,
      tls: true,
    },
    provider: 'Apple',
    displayName: 'iCloud Mail',
    documentationUrl: 'https://support.apple.com/en-us/HT202304',
    requiresAppPassword: true,
    notes: 'Requires App-Specific Password generated at appleid.apple.com.',
  },

  // ProtonMail (via Bridge)
  {
    domains: ['protonmail.com', 'proton.me', 'pm.me'],
    smtp: {
      host: '127.0.0.1',
      port: 1025,
      secure: false,
      authMethod: 'plain',
    },
    imap: {
      host: '127.0.0.1',
      port: 1143,
      tls: false,
    },
    provider: 'Proton',
    displayName: 'ProtonMail',
    documentationUrl: 'https://proton.me/support/protonmail-bridge-install',
    notes: 'Requires ProtonMail Bridge application running locally.',
  },

  // Zoho
  {
    domains: ['zoho.com', 'zoho.eu', 'zohomail.eu'],
    smtp: {
      host: 'smtp.zoho.eu',
      port: 465,
      secure: true,
      authMethod: 'plain',
    },
    imap: {
      host: 'imap.zoho.eu',
      port: 993,
      tls: true,
    },
    provider: 'Zoho',
    displayName: 'Zoho Mail',
    documentationUrl: 'https://www.zoho.com/mail/help/imap-access.html',
  },

  // ============================================
  // POLISH PROVIDERS
  // ============================================

  // Onet
  {
    domains: ['onet.pl', 'onet.eu', 'op.pl', 'poczta.onet.pl', 'vip.onet.pl', 'autograf.pl', 'buziaczek.pl', 'spoko.pl'],
    smtp: {
      host: 'smtp.poczta.onet.pl',
      port: 465,
      secure: true,
      authMethod: 'plain',
    },
    imap: {
      host: 'imap.poczta.onet.pl',
      port: 993,
      tls: true,
    },
    provider: 'Onet',
    displayName: 'Poczta Onet',
    documentationUrl: 'https://pomoc.onet.pl/poczta/',
    notes: 'SMTP access must be enabled in Onet web settings. Login must be full email address.',
  },

  // WP (Wirtualna Polska)
  {
    domains: ['wp.pl', 'poczta.wp.pl'],
    smtp: {
      host: 'smtp.wp.pl',
      port: 465,
      secure: true,
      authMethod: 'plain',
    },
    imap: {
      host: 'imap.wp.pl',
      port: 993,
      tls: true,
    },
    provider: 'Wirtualna Polska',
    displayName: 'Poczta WP',
    documentationUrl: 'https://pomoc.wp.pl/',
  },

  // Interia
  {
    domains: ['interia.pl', 'interia.eu', 'poczta.fm', 'irc.pl', 'swiatowid.pl'],
    smtp: {
      host: 'poczta.interia.pl',
      port: 465,
      secure: true,
      authMethod: 'plain',
    },
    imap: {
      host: 'poczta.interia.pl',
      port: 993,
      tls: true,
    },
    provider: 'Interia',
    displayName: 'Poczta Interia',
    documentationUrl: 'https://pomoc.interia.pl/',
  },

  // O2
  {
    domains: ['o2.pl', 'go2.pl', 'tlen.pl'],
    smtp: {
      host: 'poczta.o2.pl',
      port: 465,
      secure: true,
      authMethod: 'plain',
    },
    imap: {
      host: 'poczta.o2.pl',
      port: 993,
      tls: true,
    },
    provider: 'O2',
    displayName: 'Poczta O2',
    documentationUrl: 'https://pomoc.o2.pl/',
  },

  // Gazeta.pl
  {
    domains: ['gazeta.pl', 'poczta.gazeta.pl'],
    smtp: {
      host: 'smtp.gazeta.pl',
      port: 465,
      secure: true,
      authMethod: 'plain',
    },
    imap: {
      host: 'imap.gazeta.pl',
      port: 993,
      tls: true,
    },
    provider: 'Agora',
    displayName: 'Poczta Gazeta.pl',
  },

  // home.pl (hosting provider)
  {
    domains: ['home.pl'],
    smtp: {
      host: 'smtp.home.pl',
      port: 465,
      secure: true,
      authMethod: 'plain',
    },
    imap: {
      host: 'imap.home.pl',
      port: 993,
      tls: true,
    },
    provider: 'home.pl',
    displayName: 'home.pl',
    documentationUrl: 'https://pomoc.home.pl/',
  },

  // nazwa.pl (hosting provider)
  {
    domains: ['nazwa.pl'],
    smtp: {
      host: 'smtp.nazwa.pl',
      port: 465,
      secure: true,
      authMethod: 'plain',
    },
    imap: {
      host: 'imap.nazwa.pl',
      port: 993,
      tls: true,
    },
    provider: 'nazwa.pl',
    displayName: 'nazwa.pl',
    documentationUrl: 'https://www.nazwa.pl/pomoc/',
  },

  // LH.pl (hosting provider)
  {
    domains: ['lh.pl'],
    smtp: {
      host: 'mail-server.lh.pl',
      port: 465,
      secure: true,
      authMethod: 'plain',
    },
    imap: {
      host: 'mail-server.lh.pl',
      port: 993,
      tls: true,
    },
    provider: 'LH.pl',
    displayName: 'LH.pl',
    documentationUrl: 'https://www.lh.pl/pomoc/',
    notes: 'Server number may vary (mail-server1.lh.pl, mail-server2.lh.pl, etc.)',
  },

  // ============================================
  // OTHER EUROPEAN PROVIDERS
  // ============================================

  // GMX
  {
    domains: ['gmx.com', 'gmx.net', 'gmx.de', 'gmx.at', 'gmx.ch'],
    smtp: {
      host: 'mail.gmx.com',
      port: 465,
      secure: true,
      authMethod: 'plain',
    },
    imap: {
      host: 'imap.gmx.com',
      port: 993,
      tls: true,
    },
    provider: 'GMX',
    displayName: 'GMX Mail',
    documentationUrl: 'https://support.gmx.com/',
  },

  // mail.com
  {
    domains: ['mail.com', 'email.com'],
    smtp: {
      host: 'smtp.mail.com',
      port: 465,
      secure: true,
      authMethod: 'plain',
    },
    imap: {
      host: 'imap.mail.com',
      port: 993,
      tls: true,
    },
    provider: 'mail.com',
    displayName: 'mail.com',
  },

  // Fastmail
  {
    domains: ['fastmail.com', 'fastmail.fm'],
    smtp: {
      host: 'smtp.fastmail.com',
      port: 465,
      secure: true,
      authMethod: 'plain',
    },
    imap: {
      host: 'imap.fastmail.com',
      port: 993,
      tls: true,
    },
    provider: 'Fastmail',
    displayName: 'Fastmail',
    documentationUrl: 'https://www.fastmail.help/',
    requiresAppPassword: true,
  },

  // OVH
  {
    domains: ['ovh.net', 'ovh.com', 'ovh.fr', 'ovh.de', 'ovh.es', 'ovh.it', 'ovh.pl'],
    smtp: {
      host: 'ssl0.ovh.net',
      port: 465,
      secure: true,
      authMethod: 'plain',
    },
    imap: {
      host: 'ssl0.ovh.net',
      port: 993,
      tls: true,
    },
    provider: 'OVH',
    displayName: 'OVH Mail',
    documentationUrl: 'https://docs.ovh.com/gb/en/emails/',
    notes: 'For custom domains hosted on OVH, use the same settings.',
  },

  // IONOS (1&1)
  {
    domains: ['ionos.com', 'ionos.de', 'ionos.fr', 'ionos.es', 'ionos.it', '1und1.de', '1and1.com'],
    smtp: {
      host: 'smtp.ionos.com',
      port: 587,
      secure: false, // STARTTLS
      authMethod: 'plain',
    },
    imap: {
      host: 'imap.ionos.com',
      port: 993,
      tls: true,
    },
    provider: 'IONOS',
    displayName: 'IONOS Mail',
    documentationUrl: 'https://www.ionos.com/help/email/',
    notes: 'For custom domains, use imap.ionos.com and smtp.ionos.com with full email as username.',
  },
];

/**
 * Build a lookup map for faster domain-based searches
 */
export function buildProviderLookup(): Map<string, KnownProvider> {
  const lookup = new Map<string, KnownProvider>();

  for (const provider of KNOWN_PROVIDERS) {
    for (const domain of provider.domains) {
      lookup.set(domain.toLowerCase(), provider);
    }
    if (provider.aliases) {
      for (const alias of provider.aliases) {
        lookup.set(alias.toLowerCase(), provider);
      }
    }
  }

  return lookup;
}

/**
 * Pre-built lookup map for O(1) domain lookups
 */
export const PROVIDER_LOOKUP = buildProviderLookup();
