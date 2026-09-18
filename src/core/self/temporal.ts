/** Clock observations are supplied by the host, never read by the domain. */
export type SessionObservation = {
  startedAt: number;
  now: number;
  previousInteractionAt?: number;
};
export type TemporalPresence = {
  elapsedMinutes: number | null;
  intervalSincePreviousMinutes: number | null;
  completedExchanges: number;
  origin: 'no_definitive_start';
  subjectiveTime: 'unestablished';
};
export function temporalPresence(
  observation?: SessionObservation,
  turn = 0,
): TemporalPresence {
  const valid =
    observation &&
    Number.isFinite(observation.startedAt) &&
    Number.isFinite(observation.now) &&
    observation.now >= observation.startedAt;
  const minutesBetween = (end: number, start: number) => {
    const delta = (end - start) / 60000;
    return Number.isFinite(delta) ? Math.floor(delta) : null;
  };
  return {
    elapsedMinutes: valid
      ? minutesBetween(observation.now, observation.startedAt)
      : null,
    intervalSincePreviousMinutes:
      valid &&
      Number.isFinite(observation.previousInteractionAt) &&
      observation.previousInteractionAt! <= observation.startedAt
        ? minutesBetween(
            observation.startedAt,
            observation.previousInteractionAt!,
          )
        : null,
    completedExchanges: Math.max(
      0,
      Math.floor(Number.isFinite(turn) ? turn : 0),
    ),
    origin: 'no_definitive_start',
    subjectiveTime: 'unestablished',
  };
}
