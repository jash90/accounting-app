import { Transform } from 'class-transformer';
import sanitizeHtml = require('sanitize-html');

/**
 * Decorator to sanitize HTML content from user inputs.
 * Removes potentially dangerous HTML tags and attributes to prevent XSS attacks.
 *
 * Usage:
 * ```typescript
 * @Sanitize()
 * @IsString()
 * description?: string;
 * ```
 */
export function Sanitize() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return sanitizeHtml(value, {
        allowedTags: [], // Remove all HTML tags
        allowedAttributes: {}, // Remove all HTML attributes
        disallowedTagsMode: 'discard', // Completely remove disallowed tags
        textFilter: (text: string) => text.trim(), // Trim whitespace
      });
    }
    return value;
  });
}

/**
 * Decorator to sanitize HTML content while allowing basic formatting tags.
 * Useful for fields like descriptions or notes where some formatting is desired.
 *
 * Allows: p, br, strong, em, u, ul, ol, li
 *
 * Usage:
 * ```typescript
 * @SanitizeWithFormatting()
 * @IsString()
 * notes?: string;
 * ```
 */
export function SanitizeWithFormatting() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return sanitizeHtml(value, {
        allowedTags: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li'],
        allowedAttributes: {},
        disallowedTagsMode: 'discard',
        textFilter: (text: string) => text.trim(),
      });
    }
    return value;
  });
}
