import { characterIds, type CharacterId } from '../../core/character/id';

export type SelectionModel =
  | { stage: 'selection'; focused: CharacterId }
  | { stage: 'confirmation' | 'shell'; selected: CharacterId };
export type SelectionAction =
  | { type: 'move'; direction: -1 | 1 }
  | { type: 'focus'; character: CharacterId }
  | { type: 'confirm'; character: CharacterId }
  | { type: 'settle' };
export function createSelection(): SelectionModel {
  return { stage: 'selection', focused: 'aletheia' };
}
export function updateSelection(
  model: SelectionModel,
  action: SelectionAction,
): SelectionModel {
  if (model.stage === 'confirmation' && action.type === 'settle')
    return { stage: 'shell', selected: model.selected };
  if (model.stage !== 'selection') return model;
  switch (action.type) {
    case 'move': {
      const index =
        (characterIds.indexOf(model.focused) +
          action.direction +
          characterIds.length) %
        characterIds.length;
      return { ...model, focused: characterIds[index]! };
    }
    case 'focus':
      return { ...model, focused: action.character };
    case 'confirm':
      return { stage: 'confirmation', selected: action.character };
    default:
      return model;
  }
}
