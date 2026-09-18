import { runPresenceContinuity } from './presence-continuity.ts';
import { runPresenceBenchmark } from './presence.ts';
import { canonicalKnowledge } from '../../generated/knowledge.ts';
import { loadBenchmark, runBenchmark } from './benchmark.ts';
const continuity = await runPresenceContinuity();
if (process.argv.includes('--continuity')) {
  console.log(JSON.stringify(continuity, null, 2));
} else {
  const report = await runBenchmark(
    canonicalKnowledge,
    await loadBenchmark(canonicalKnowledge),
  );
  const presence = await runPresenceBenchmark();
  console.log(
    JSON.stringify(
      process.argv.includes('--details')
        ? { ...report, presence, continuity }
        : {
            ...report,
            rows: undefined,
            presence: presence.metrics,
            continuity: continuity.metrics,
          },
      null,
      2,
    ),
  );
}
