import process from 'node:process';
import { characterIds } from '../../core/character/id.ts';
import { characterProfiles } from '../../core/character/profile.ts';
import {
  createCharacterRuntime,
  transitionCharacterRuntime,
} from '../../core/character/runtime.ts';
import { observeSurface } from '../../core/character/user-style.ts';
import { initialWorkingMemory } from '../../core/memory/working.ts';
import { conversationEngine } from '../../application/intelligence.ts';
try {
  const args = process.argv.slice(2),
    options = new Map<string, string>();
  const turns: string[] = [];
  for (let i = 0; i < args.length; i += 2) {
    if (
      !['--character', '--locale', '--text', '--turn'].includes(args[i]!) ||
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
    throw new Error('Provide --text or repeated --turn messages');
  if (!character || (locale !== 'ru' && locale !== 'en'))
    throw new Error('Valid character and locale are required');
  let runtime = createCharacterRuntime(character, 0);
  let memory = initialWorkingMemory();
  for (const message of turns) {
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
          context: result.context,
          activeThread: result.nextMemory.currentThread,
          perception: result.perception,
          attention: result.attention,
          candidates: result.candidates,
          plan: result.plan,
          response: result.response,
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
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
