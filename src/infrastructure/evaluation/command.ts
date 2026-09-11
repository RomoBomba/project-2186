import { canonicalKnowledge } from '../../generated/knowledge.ts';
import { loadBenchmark, runBenchmark } from './benchmark.ts';
const report = await runBenchmark(
  canonicalKnowledge,
  await loadBenchmark(canonicalKnowledge),
);
console.log(
  JSON.stringify(
    process.argv.includes('--details')
      ? report
      : { ...report, rows: undefined },
    null,
    2,
  ),
);
