// Separate read-only development page. Not part of the artwork or production entry.
if (import.meta.env.DEV) {
  const [
    { Persistence },
    { IndexedDBStorage },
    { conversationEngine },
    { characterProfiles },
    { initialWorkingMemory },
  ] = await Promise.all([
    import('../../application/persistence'),
    import('../storage/indexed-db'),
    import('../../application/intelligence'),
    import('../../core/character/profile'),
    import('../../core/memory/working'),
  ]);
  const service = new Persistence(new IndexedDBStorage());
  document.body.innerHTML =
    '<h1>Development memory inspection — read only</h1><p>Stored snapshot; queries use empty WorkingMemory and do not save.</p><form><label>Query <input name="query"></label><button>Inspect</button></form><pre></pre>';
  const output = document.querySelector('pre')!;
  const inspect = async (text: string) => {
    await service.initialize();
    const snapshot = await service.inspectStored();
    const config = service.configuration;
    const result =
      config && text
        ? await conversationEngine.respond(
            text,
            characterProfiles[config.character],
            service.restore(config.character).runtime.disposition,
            config.language,
            initialWorkingMemory(),
            {
              semantic: service.restore(config.character).memory.semantic,
              referencedIds: [],
              lastReferenceTurn: -4,
            },
          )
        : undefined;
    output.textContent = JSON.stringify(
      {
        snapshot,
        ...(result
          ? {
              query: {
                ...result.memoryInspection,
                strategy: result.plan.strategy,
                response: result.response.text,
              },
            }
          : {}),
      },
      null,
      2,
    );
  };
  document.querySelector('form')!.onsubmit = (event) => {
    event.preventDefault();
    void inspect(document.querySelector('input')!.value);
  };
  await inspect('');
}
export {};
