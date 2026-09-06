import process from 'node:process';
import { characterIds } from '../../core/character/id.ts';
import { characterProfiles } from '../../core/character/profile.ts';
import {
  createCharacterRuntime,
  transitionCharacterRuntime,
} from '../../core/character/runtime.ts';
import { observeSurface } from '../../core/character/user-style.ts';
import { initialResponseHistory } from '../../core/conversation/model.ts';
import { conversationEngine } from '../../application/intelligence.ts';
try {
  const args = process.argv.slice(2),
    options = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    if (
      !['--character', '--locale', '--text'].includes(args[i]!) ||
      args[i + 1] === undefined
    )
      throw new Error(
        'Use --character aletheia|aura|themis --locale ru|en --text "message"',
      );
    options.set(args[i]!, args[i + 1]!);
  }
  const character = characterIds.find(
    (id) => id === (options.get('--character') ?? 'aletheia'),
  );
  const locale = options.get('--locale') ?? 'ru';
  const message = options.get('--text');
  if (!character || (locale !== 'ru' && locale !== 'en') || !message?.trim())
    throw new Error(
      'Valid character, locale and non-empty --text are required',
    );
  const runtime = transitionCharacterRuntime(
    createCharacterRuntime(character, 0),
    {
      type: 'userMessageReceived',
      at: 1,
      observation: observeSurface(message),
    },
  );
  const result = await conversationEngine.respond(
    message,
    characterProfiles[character],
    runtime.disposition,
    locale,
    initialResponseHistory(),
  );
  console.log(
    JSON.stringify(
      {
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
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
