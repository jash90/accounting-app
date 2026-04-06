/**
 * Client form sections - modular card components for client forms
 */

// Pre-existing card components (used by client-create page)
export { BasicInfoCard } from './basic-info-card';
export { TaxEmploymentCard } from './tax-employment-card';
export { AdditionalInfoCard } from './additional-info-card';
export { DatesCard } from './dates-card';
export { ReliefPeriodsCard } from './relief-periods-card';
export { CustomFieldsCard } from './custom-fields-card';
export type { FormSectionProps, CustomFieldsCardProps, ClientFormInstance } from './types';
export type { ReliefPeriodsCardProps } from './relief-periods-card';

// New section components for client-form-dialog
export { BasicInfoSection } from './basic-info-section';
export { DatesSection } from './dates-section';
