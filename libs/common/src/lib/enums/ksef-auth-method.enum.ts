export enum KsefAuthMethod {
  TOKEN = 'TOKEN',
  XADES = 'XADES',
}

export const KsefAuthMethodLabels: Record<KsefAuthMethod, string> = {
  [KsefAuthMethod.TOKEN]: 'Token KSeF',
  [KsefAuthMethod.XADES]: 'Podpis XAdES',
};
