import { type CreateOfferFormData, type UpdateOfferFormData } from '@/lib/validation/schemas';
import { type CreateOfferDto, type UpdateOfferDto } from '@/types/dtos';


/**
 * Formats a date value to 'YYYY-MM-DD' string using local date components.
 * Handles both Date objects and already-formatted strings safely.
 */
function formatLocalDate(date: Date | string | undefined): string | undefined {
  if (!date) return undefined;
  if (typeof date === 'string') return date;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Converts form data to DTO format for creating an offer.
 */
export function formDataToCreateDto(data: CreateOfferFormData): CreateOfferDto {
  return {
    ...data,
    offerDate: formatLocalDate(data.offerDate),
    validUntil: formatLocalDate(data.validUntil),
  };
}

export function formDataToUpdateDto(data: UpdateOfferFormData): UpdateOfferDto {
  return {
    ...data,
    offerDate: formatLocalDate(data.offerDate),
    validUntil: formatLocalDate(data.validUntil),
  };
}
