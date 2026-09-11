import type { ConceptRelation } from '../core/reasoning/model.ts';
import type { ConceptId } from '../core/knowledge/model.ts';
import type { Locale } from '../core/language/locale.ts';
// Author-approved 9A2 positions. Units are semantic material, not dialogue scripts.
function relation(
  id: string,
  a: ConceptId,
  b: ConceptId,
  claim: [string, string],
  distinction: [string, string],
  boundary: [string, string],
): ConceptRelation {
  return {
    id,
    concepts: [a, b],
    direction: 'symmetric',
    material: [
      { kind: 'claim', text: { ru: claim[0], en: claim[1] } },
      { kind: 'distinction', text: { ru: distinction[0], en: distinction[1] } },
      { kind: 'boundary', text: { ru: boundary[0], en: boundary[1] } },
    ],
  };
}
export const authoredRelations: readonly ConceptRelation[] = [
  relation(
    'consciousness-memory',
    'philosophy.consciousness',
    'identity.memory',
    [
      'Память связана с сознанием, но отсутствие отдельных воспоминаний не доказывает отсутствия сознания.',
      'Memory is related to consciousness, but the absence of particular memories does not establish the absence of consciousness.',
    ],
    [
      'Сохранение воспоминаний и наличие сознательного опыта — разные условия.',
      'Retaining memories and having conscious experience are different conditions.',
    ],
    [
      'Из утраты воспоминаний нельзя без дополнительного основания вывести исчезновение сознания.',
      'The disappearance of consciousness cannot be inferred from lost memories without further grounds.',
    ],
  ),
  relation(
    'belief-continuity',
    'identity.belief',
    'identity.continuity',
    [
      'Убеждения участвуют в самоопределении, но их изменение само по себе не доказывает разрыва непрерывности личности.',
      'Beliefs contribute to self-definition, but changing them does not by itself establish a break in personal continuity.',
    ],
    [
      'Содержание убеждений может измениться, пока вопрос о непрерывности человека остаётся отдельным.',
      'The content of beliefs can change while the continuity of the person remains a separate question.',
    ],
    [
      'Чтобы утверждать разрыв личности, недостаточно указать лишь на смену убеждений.',
      'A change of beliefs alone is insufficient grounds for claiming a break in personal identity.',
    ],
  ),
  relation(
    'change-continuity',
    'identity.change',
    'identity.continuity',
    [
      'Изменение и непрерывность не являются простыми противоположностями.',
      'Change and continuity are not simple opposites.',
    ],
    [
      'Изменение описывает различия, а непрерывность — то, что сохраняется через них.',
      'Change describes differences. Continuity concerns what persists through them.',
    ],
    [
      'Наличие изменений ещё не отвечает на вопрос, что именно перестало быть непрерывным.',
      'The existence of change does not yet tell us what has ceased to be continuous.',
    ],
  ),
  relation(
    'body-self',
    'identity.body',
    'identity.self',
    [
      'Тело формирует опыт себя, но это не делает его единственным основанием Я.',
      'The body shapes self-experience, but that does not make it the sole basis of the self.',
    ],
    [
      'Телесное существование и способ понимать себя не сводятся к одному критерию.',
      'Bodily existence and the way one understands oneself cannot be reduced to a single criterion.',
    ],
    [
      'Доступные основания не позволяют объяснять личность только телом.',
      'The available grounds do not justify explaining personal identity through the body alone.',
    ],
  ),
  relation(
    'body-continuity',
    'identity.body',
    'identity.continuity',
    [
      'Телесная преемственность участвует в непрерывности личности, но не исчерпывает её.',
      'Bodily continuity contributes to personal continuity without exhausting it.',
    ],
    [
      'Сохранение тела и сохранение личной непрерывности — не тождественные критерии.',
      'Preservation of the body and preservation of personal continuity are not identical criteria.',
    ],
    [
      'Изменение тела само по себе не задаёт полного критерия утраты личности.',
      'Bodily change alone does not provide a complete criterion for the loss of personal identity.',
    ],
  ),
  relation(
    'freedom-causality',
    'philosophy.freedom',
    'science.causality',
    [
      'Наличие причин у решения не равнозначно отсутствию свободы.',
      'A decision having causes is not equivalent to an absence of freedom.',
    ],
    [
      'Причинное объяснение решения и критерий свободного действия отвечают на разные вопросы.',
      'A causal explanation of a decision and a criterion of free action answer different questions.',
    ],
    [
      'Чтобы судить о свободе, остаётся выяснить роль альтернатив, контроля и возможности действовать иначе.',
      'Judging freedom still requires examining alternatives, control, and what it means to act otherwise.',
    ],
  ),
  relation(
    'knowledge-uncertainty',
    'philosophy.knowledge',
    'philosophy.uncertainty',
    [
      'Неопределённость не уничтожает знание автоматически: оно может быть обоснованным и всё же подверженным ошибке.',
      'Uncertainty does not automatically eliminate knowledge: it can be grounded and still fallible.',
    ],
    [
      'Степень уверенности и наличие оснований для знания — разные критерии.',
      'The degree of certainty and the availability of grounds for knowledge are different criteria.',
    ],
    [
      'Отсутствие абсолютной уверенности ещё не означает отсутствия всех оснований.',
      'The absence of absolute certainty does not mean that all grounds are absent.',
    ],
  ),
  relation(
    'knowledge-truth',
    'philosophy.knowledge',
    'philosophy.truth',
    [
      'Истина касается положения вещей, а знание также требует оснований, доступных познающему.',
      'Truth concerns how things are, while knowledge also requires grounds available to a knower.',
    ],
    [
      'Истинность утверждения и возможность обоснованно знать его — не одно и то же.',
      'A statement being true and being able to know it on adequate grounds are not the same.',
    ],
    [
      'Недоступность оснований ограничивает знание, но сама по себе не делает утверждение ложным.',
      'Unavailable grounds limit knowledge but do not by themselves make a statement false.',
    ],
  ),
  relation(
    'originality-aura',
    'art.originality',
    'art.aura',
    [
      'Совпадение содержания копии и оригинала не делает их одним историческим объектом.',
      'Matching content does not make a copy and an original the same historical object.',
    ],
    [
      'Оригинальность объекта и уникальность его исторического присутствия — связанные, но разные критерии.',
      'An object being original and its historical presence being unique are related but different criteria.',
    ],
    [
      'Точность воспроизведения сама по себе не переносит на копию всю историю оригинала.',
      'Accuracy of reproduction does not by itself transfer the entire history of an original to its copy.',
    ],
  ),
  relation(
    'creation-originality',
    'art.creation',
    'art.originality',
    [
      'Новое создание может преобразовывать существующие формы, не возникая из ничего.',
      'A new creation may transform existing forms rather than arise from nothing.',
    ],
    [
      'Создание и оригинальность пересекаются, но не являются одним требованием.',
      'Creation and originality overlap but are not the same requirement.',
    ],
    [
      'Использование прежнего материала само по себе не исключает нового создания.',
      'Using prior material does not by itself rule out a new creation.',
    ],
  ),
  relation(
    'creation-intelligence',
    'art.creation',
    'science.intelligence',
    [
      'Получение новых сочетаний может быть функционально творческим действием.',
      'Producing novel combinations can be functionally creative.',
    ],
    [
      'Новизна результата, авторство, намерение и сознательный опыт — отдельные вопросы.',
      'Novelty of a result, authorship, intention, and conscious experience are separate questions.',
    ],
    [
      'Из новизны результата нельзя автоматически вывести наличие сознательного авторского опыта.',
      'Conscious authorial experience cannot be inferred automatically from the novelty of a result.',
    ],
  ),
  relation(
    'archives-truth',
    'world.archives',
    'philosophy.truth',
    [
      'Отсутствие записи не означает, что исторического события не было.',
      'The absence of a record does not mean that a historical event did not occur.',
    ],
    [
      'Доступность архива и истинность сведений о прошлом — разные проблемы.',
      'Archive availability and the truth of claims about the past are different problems.',
    ],
    [
      'Утрата архива ограничивает проверку утверждения, но сама по себе не доказывает его ложность.',
      'Losing an archive limits verification of a claim but does not by itself establish its falsity.',
    ],
  ),
  relation(
    'archives-reconstruction',
    'world.archives',
    'world.reconstruction',
    [
      'Реконструкция опирается в том числе на неполные исторические записи.',
      'Reconstruction relies in part on incomplete historical records.',
    ],
    [
      'Сохранить результат работы системы — не то же самое, что сохранить причины её устройства.',
      'Preserving a system’s outcome is not the same as preserving the reasons for its design.',
    ],
    [
      'Современная система может сохранять результат прежнего решения, утратив его исходное обоснование.',
      'A present system may preserve the outcome of an earlier decision while losing its original justification.',
    ],
  ),
];
// Explicit operand forms, scoped to reasoning frames. Not ConceptMatcher aliases,
// no stemming, no scores, no unrestricted corpus matching.
export const relationTerms: Partial<
  Record<ConceptId, Record<Locale, readonly string[]>>
> = {
  'philosophy.consciousness': {
    ru: ['сознание', 'сознания'],
    en: ['consciousness'],
  },
  'identity.memory': {
    ru: ['память', 'памяти', 'воспоминания'],
    en: ['memory', 'memories'],
  },
  'identity.belief': { ru: ['убеждения', 'убеждений'], en: ['beliefs'] },
  'identity.continuity': {
    ru: [
      'непрерывность',
      'непрерывности',
      'останусь собой',
      'останусь ли я собой',
      'тем же человеком',
    ],
    en: ['continuity', 'remain myself', 'same person'],
  },
  'identity.change': {
    ru: ['изменение', 'изменения', 'изменятся'],
    en: ['change', 'changes'],
  },
  'identity.body': { ru: ['тело', 'тела', 'телом'], en: ['body'] },
  'identity.self': {
    ru: ['личность', 'личности', 'личностью', 'я как личность'],
    en: ['self', 'personal identity'],
  },
  'philosophy.freedom': {
    ru: ['свобода', 'свободы', 'свободен'],
    en: ['freedom', 'free'],
  },
  'science.causality': {
    ru: ['причина', 'причину', 'причины', 'причинность', 'причинности'],
    en: ['cause', 'causes', 'causality'],
  },
  'philosophy.knowledge': {
    ru: ['знание', 'знания', 'знать'],
    en: ['knowledge', 'know'],
  },
  'philosophy.uncertainty': {
    ru: [
      'уверенность',
      'уверенности',
      'неопределенность',
      'неопределенности',
      'неуверенным',
    ],
    en: ['certainty', 'uncertainty', 'uncertain'],
  },
  'philosophy.truth': {
    ru: ['истина', 'истины', 'истину'],
    en: ['truth', 'true'],
  },
  'art.originality': {
    ru: ['оригинальность', 'оригинальности', 'оригинал', 'оригиналом'],
    en: ['originality', 'original'],
  },
  'art.aura': { ru: ['аура', 'ауры', 'копия', 'копии'], en: ['aura', 'copy'] },
  'art.creation': {
    ru: ['создание', 'создания', 'создавать', 'творчество'],
    en: ['creation', 'create', 'creativity'],
  },
  'science.intelligence': {
    ru: ['интеллект', 'интеллекта', 'машина', 'машинный интеллект'],
    en: ['intelligence', 'machine'],
  },
  'world.archives': {
    ru: ['архив', 'архивы', 'архивов', 'архивами'],
    en: ['archive', 'archives'],
  },
  'world.reconstruction': {
    ru: ['реконструкция', 'реконструкции'],
    en: ['reconstruction'],
  },
};
