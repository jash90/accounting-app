export enum TimeRoundingMethod {
  NONE = 'none',
  UP = 'up',
  DOWN = 'down',
  NEAREST = 'nearest',
}

export const TimeRoundingMethodLabels: Record<TimeRoundingMethod, string> = {
  [TimeRoundingMethod.NONE]: 'Brak zaokrąglenia',
  [TimeRoundingMethod.UP]: 'W górę',
  [TimeRoundingMethod.DOWN]: 'W dół',
  [TimeRoundingMethod.NEAREST]: 'Do najbliższego',
};

export const TimeRoundingMethodDescriptions: Record<TimeRoundingMethod, string> = {
  [TimeRoundingMethod.NONE]: 'Czas nie jest zaokrąglany',
  [TimeRoundingMethod.UP]: 'Zaokrągla do góry do najbliższego interwału',
  [TimeRoundingMethod.DOWN]: 'Zaokrągla w dół do najbliższego interwału',
  [TimeRoundingMethod.NEAREST]: 'Zaokrągla do najbliższego interwału',
};

export const DefaultRoundingInterval = 15; // minutes
