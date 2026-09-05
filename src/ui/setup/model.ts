import { defaultLocale, type Locale } from '../../core/language/locale';

import type { DisplayStandard } from '../display/standards';

export const layouts = ['A', 'B', 'C'] as const;
export type Layout = (typeof layouts)[number];
export type SetupStage =
  'language' | 'standard' | 'layout' | 'audio' | 'complete';
export type SystemConfiguration = {
  language: Locale;
  displayStandard: DisplayStandard;
  layout: Layout;
  audioEnabled: boolean;
};
export type SetupModel = {
  stage: SetupStage;
  configuration: SystemConfiguration;
};
export type SetupAction =
  | { type: 'language'; value: Locale }
  | { type: 'standard'; value: DisplayStandard }
  | { type: 'layout'; value: Layout }
  | { type: 'audio'; value: boolean }
  | { type: 'back' };

export function createSetup(): SetupModel {
  return {
    stage: 'language',
    configuration: {
      language: defaultLocale,
      displayStandard: 'civic',
      layout: 'A',
      audioEnabled: false,
    },
  };
}

export function updateSetup(
  model: SetupModel,
  action: SetupAction,
): SetupModel {
  if (action.type === 'back') {
    const previous: Record<SetupStage, SetupStage> = {
      language: 'language',
      standard: 'language',
      layout: 'standard',
      audio: 'layout',
      complete: 'audio',
    };
    return { ...model, stage: previous[model.stage] };
  }
  if (model.stage !== action.type) return model;
  switch (action.type) {
    case 'language':
      return {
        stage: 'standard',
        configuration: { ...model.configuration, language: action.value },
      };
    case 'standard':
      return {
        stage: 'layout',
        configuration: {
          ...model.configuration,
          displayStandard: action.value,
        },
      };
    case 'layout':
      return {
        stage: 'audio',
        configuration: { ...model.configuration, layout: action.value },
      };
    case 'audio':
      return {
        stage: 'complete',
        configuration: { ...model.configuration, audioEnabled: action.value },
      };
  }
}
