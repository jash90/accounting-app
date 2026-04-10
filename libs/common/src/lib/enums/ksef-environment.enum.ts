export enum KsefEnvironment {
  TEST = 'TEST',
  DEMO = 'DEMO',
  PRODUCTION = 'PRODUCTION',
}

export const KsefEnvironmentLabels: Record<KsefEnvironment, string> = {
  [KsefEnvironment.TEST]: 'Testowe',
  [KsefEnvironment.DEMO]: 'Demo',
  [KsefEnvironment.PRODUCTION]: 'Produkcyjne',
};
