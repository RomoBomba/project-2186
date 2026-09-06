import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  knowledgeDomains,
  type ConceptCard,
} from '../../core/knowledge/model.ts';
import { compareIds } from '../../core/knowledge/normalization.ts';
import { validateConceptCards } from '../../core/knowledge/validation.ts';
import { parseConceptYaml } from './yaml.ts';

export const repositoryKnowledgeDirectory = fileURLToPath(
  new URL('../../../content/knowledge/', import.meta.url),
);
export async function loadRepositoryKnowledge(
  directory = repositoryKnowledgeDirectory,
): Promise<ConceptCard[]> {
  const root = resolve(directory);
  const files: string[] = [];
  async function walk(folder: string): Promise<void> {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const filename = resolve(folder, entry.name);
      if (entry.isSymbolicLink())
        throw new Error(
          `${filename}: symbolic links are not supported in authored knowledge`,
        );
      if (entry.isDirectory()) await walk(filename);
      else if (/\.ya?ml$/iu.test(entry.name)) files.push(filename);
    }
  }
  await walk(root);
  const cards: ConceptCard[] = [];
  const origins = new Map<string, string>();
  for (const filename of files.sort(compareIds)) {
    const path = relative(root, filename);
    const domain = path.split(sep)[0];
    const card = parseConceptYaml(await readFile(filename, 'utf8'), path);
    if (
      !knowledgeDomains.some((value) => value === domain) ||
      card.domain !== domain
    )
      throw new Error(
        `${path}: domain must match its containing knowledge directory`,
      );
    if (origins.has(card.id))
      throw new Error(
        `${path}: duplicate id ${card.id}, first defined in ${origins.get(card.id)}`,
      );
    origins.set(card.id, path);
    cards.push(card);
  }
  try {
    return validateConceptCards(cards);
  } catch (error) {
    throw new Error(
      `${root}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}
