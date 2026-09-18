import { BasicIntelligenceProvider } from '../core/intelligence/basic.ts';
import { canonicalKnowledge } from '../generated/knowledge.ts';
import { ConversationEngine } from '../core/conversation/engine.ts';
// Stateless authored intelligence; each terminal owns its session and character state.
export const conversationEngine = new ConversationEngine(
  canonicalKnowledge,
  new BasicIntelligenceProvider(),
);
