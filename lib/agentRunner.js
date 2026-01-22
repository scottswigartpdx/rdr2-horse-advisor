const fs = require('fs/promises');
const path = require('path');

const { z } = require('zod');
const { Agent, Runner, tool, user, assistant, webSearchTool, OpenAIProvider } = require('@openai/agents');

const DATAFILE_WHITELIST = {
  horses: 'horses.json',
  gear: 'gear.json',
  weapons: 'weapons.json',
  crafting: 'crafting.json',
  animals: 'animals.json',
};

function createLoadDatafilesTool() {
  return tool({
    name: 'load_datafiles',
    description:
      'Load one or more local JSON datafiles by key. Use this to answer questions from the app data rather than guessing. ' +
      `Allowed keys: ${Object.keys(DATAFILE_WHITELIST).join(', ')}.`,
    parameters: z.object({
      keys: z.array(z.string()).min(1).max(10),
    }),
    execute: async ({ keys }) => {
      const loaded = {};
      const errors = {};

      // Deduplicate + keep order stable
      const uniqueKeys = Array.from(new Set(keys.map(k => String(k).trim()).filter(Boolean)));

      for (const key of uniqueKeys) {
        const fileName = DATAFILE_WHITELIST[key];
        if (!fileName) {
          errors[key] = `Unknown/unsupported key. Allowed keys: ${Object.keys(DATAFILE_WHITELIST).join(', ')}`;
          continue;
        }

        try {
          const filePath = path.join(process.cwd(), fileName);
          const raw = await fs.readFile(filePath, 'utf8');
          loaded[key] = JSON.parse(raw);
        } catch (e) {
          errors[key] = e?.message ? String(e.message) : 'Failed to load/parse file';
        }
      }

      return { loaded, errors };
    },
  });
}

// Reuse a single Runner instance (keeps configuration centralized)
function getRunner() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  // Prefer Responses API to keep parity with existing implementation (web_search, etc.)
  const modelProvider = new OpenAIProvider({ apiKey, useResponses: true });

  return new Runner({
    modelProvider,
    tracingDisabled: true,
    traceIncludeSensitiveData: false,
  });
}

function buildAgentInputItems(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(m => m && typeof m.role === 'string')
    .map(m => {
      if (m.role === 'user') return user(String(m.content ?? ''));
      if (m.role === 'assistant') return assistant(String(m.content ?? ''));
      // Ignore any unexpected roles
      return null;
    })
    .filter(Boolean);
}

async function runChatAgent({ system, messages, model = 'gpt-5.2' }) {
  const loadTool = createLoadDatafilesTool();

  const agent = new Agent({
    name: 'RDR2 Ultimate Assistant',
    handoffDescription: 'Research assistant for RDR2 Ultimate app data and web-backed answers.',
    instructions: typeof system === 'string' ? system : '',
    model,
    modelSettings: {
      toolChoice: 'auto',
      parallelToolCalls: true,
    },
    tools: [
      webSearchTool(),
      loadTool,
    ],
  });

  const runner = getRunner();
  const inputItems = buildAgentInputItems(messages);

  const result = await runner.run(agent, inputItems, { maxTurns: 12 });
  return String(result.finalOutput ?? '');
}

module.exports = {
  runChatAgent,
  DATAFILE_WHITELIST,
};

