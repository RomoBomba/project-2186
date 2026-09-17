import process from 'node:process';
import { characterIds } from '../../core/character/id.ts';
import { characterProfiles } from '../../core/character/profile.ts';
import {
  createCharacterRuntime,
  transitionCharacterRuntime,
} from '../../core/character/runtime.ts';
import { observeSurface } from '../../core/character/user-style.ts';
import { initialWorkingMemory } from '../../core/memory/working.ts';
import { ConversationEngine } from '../../core/conversation/engine.ts';
import { canonicalKnowledge } from '../../generated/knowledge.ts';
import {
  createIntelligenceProvider,
  providerSelection,
} from '../../application/provider-selection.ts';
import type { LocalInspection } from '../ollama/local-provider.ts';
import {
  ComparingProvider,
  localStatistics,
  type RealizationComparison,
} from './compare.ts';
try {
  const args = process.argv.slice(2),
    options = new Map<string, string>();
  const turns: string[] = [];
  for (let i = 0; i < args.length; i += 2) {
    if (
      ![
        '--character',
        '--locale',
        '--text',
        '--turn',
        '--provider',
        '--compare',
      ].includes(args[i]!) ||
      args[i + 1] === undefined
    )
      throw new Error(
        'Use --character aletheia|aura|themis --locale ru|en --text "message" or repeated --turn "message"',
      );
    if (args[i] === '--turn') turns.push(args[i + 1]!);
    else options.set(args[i]!, args[i + 1]!);
  }
  const character = characterIds.find(
    (id) => id === (options.get('--character') ?? 'aletheia'),
  );
  const locale = options.get('--locale') ?? 'ru';
  if (options.has('--text')) turns.unshift(options.get('--text')!);
  if (!turns.length || turns.some((turn) => !turn.trim()))
    throw new Error(
      'Provide --text or repeated --turn messages; optional --provider basic|local or --compare true',
    );
  if (!character || (locale !== 'ru' && locale !== 'en'))
    throw new Error('Valid character and locale are required');
  const comparisons: RealizationComparison[] = [];
  let trace: LocalInspection | undefined;
  const compare = options.get('--compare') === 'true';
  const selected = providerSelection(
    options.get('--provider') ?? process.env.VITE_INTELLIGENCE_PROVIDER,
  );
  const provider = compare
    ? new ComparingProvider((row) => comparisons.push(row), {
        endpoint: process.env.VITE_OLLAMA_ENDPOINT,
      })
    : createIntelligenceProvider(selected, {
        endpoint: process.env.VITE_OLLAMA_ENDPOINT,
        inspect: (value) => {
          trace = value;
        },
      });
  const conversationEngine = new ConversationEngine(
    canonicalKnowledge,
    provider,
  );
  let runtime = createCharacterRuntime(character, 0);
  let memory = initialWorkingMemory();
  for (const message of turns) {
    trace = undefined;
    const started = performance.now();
    runtime = transitionCharacterRuntime(runtime, {
      type: 'userMessageReceived',
      at: memory.history.turn * 3 + 1,
      observation: observeSurface(message),
    });
    const result = await conversationEngine.respond(
      message,
      characterProfiles[character],
      runtime.disposition,
      locale,
      memory,
    );
    console.log(
      JSON.stringify(
        {
          ...(compare
            ? { comparison: comparisons.at(-1) }
            : {
                providerSelected: selected,
                finalProvider:
                  result.response.providerInspection?.provider === 'injected'
                    ? 'local'
                    : 'basic',
                totalLatencyMs: performance.now() - started,
                localInspection: trace,
              }),
          context: result.context,
          propositionResolution: result.propositionResolution,
          propositionFocus: result.nextMemory.propositionFocus,
          activeThread: result.nextMemory.currentThread,
          perception: result.perception,
          attention: result.attention,
          candidates: result.candidates,
          plan: result.plan,
          providerBoundary: result.response.providerInspection,
          response: { ...result.response, providerInspection: undefined },
        },
        null,
        2,
      ),
    );
    memory = result.nextMemory;
    runtime = transitionCharacterRuntime(runtime, {
      type: 'responseStarted',
      at: memory.history.turn * 3 - 1,
    });
    runtime = transitionCharacterRuntime(runtime, {
      type: 'responseCompleted',
      at: memory.history.turn * 3,
    });
  }
  if (compare)
    console.log(
      JSON.stringify({ statistics: localStatistics(comparisons) }, null, 2),
    );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
