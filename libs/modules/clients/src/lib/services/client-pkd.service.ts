import { Injectable } from '@nestjs/common';

import { PKD_CLASSES, PKD_SECTIONS, type PkdCodeOption } from '@accounting/common';

/**
 * Service for PKD (Polska Klasyfikacja Działalności) code lookups.
 * Extracted from ClientsService to follow SRP.
 */
@Injectable()
export class ClientPkdService {
  /**
   * Search PKD codes server-side to avoid loading all ~659 codes at startup.
   * Searches by code prefix and name substring, returns top matches.
   *
   * @param search - Search term (matches code or name)
   * @param section - Optional section filter (e.g., 'A', 'B', 'C')
   * @param limit - Maximum results to return (default 50)
   * @returns Array of matching PKD codes
   */
  searchPkdCodes(search?: string, section?: string, limit = 50): PkdCodeOption[] {
    let results = PKD_CLASSES.map((pkd) => ({
      code: pkd.code,
      label: `${pkd.code} - ${pkd.name}`,
      section: pkd.section,
      division: pkd.division,
    }));

    // Filter by section if provided
    if (section) {
      results = results.filter((pkd) => pkd.section === section.toUpperCase());
    }

    // Filter by search term (code or name)
    if (search) {
      const searchLower = search.toLowerCase();
      results = results.filter(
        (pkd) =>
          pkd.code.toLowerCase().includes(searchLower) ||
          pkd.label.toLowerCase().includes(searchLower)
      );
    }

    // Return limited results
    return results.slice(0, limit);
  }

  /**
   * Get PKD sections for dropdown.
   * @returns Object mapping section codes to labels
   */
  getPkdSections(): Record<string, string> {
    const sections: Record<string, string> = {};
    PKD_SECTIONS.forEach((section) => {
      sections[section.code] = `${section.code} - ${section.name}`;
    });
    return sections;
  }
}
