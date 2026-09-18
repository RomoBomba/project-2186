/** Authored constraints, not claims about specific countries, dates or events. */
export const temporalWorld = {
  archive_incomplete: { records: 'incomplete', absenceCause: 'undetermined' },
  temporal_distance: {
    systemEra: 2186,
    userEraRelation: 'earlier',
    continuity: 'imperfect',
  },
  historical_category_uncertain: {
    pastCategories: 'unevenly_preserved',
    disappearance: 'not_implied',
  },
  current_external_channel_unavailable: { liveExternalFacts: false },
  relative_chronology: {
    relativeOrder: 'more_reliable_than_absolute_chronology',
    measurableIntervals: true,
    subjectiveEquivalence: 'unestablished',
  },
} as const;
