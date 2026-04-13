import { ToolDefinition } from '../innate-tools/types';

/**
 * Skill tool schemas: **capability boundaries** (I/O, side effects, errors).
 * Priorities, task flow, and phrasing live in prompts (e.g. `fragments/skill-business.md`).
 */
export const SKILL_TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  skill_find: {
    name: 'skill_find',
    description:
      'Queries the **remote** skill registry over the network. Input: search string. Output: JSON array of candidate packages (fields typically include slug, name, description, source, repo). Does **not** read the local install list, **not** install anything, **not** load skill content.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Registry search string.',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  skill_list: {
    name: 'skill_list',
    description:
      'Reads the **local** skill install directory. Output: installed skill names and their descriptions. **No network**. Does **not** modify installs.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  skill_install: {
    name: 'skill_install',
    description:
      'Installs a skill from a source string (registry slug/name, npm id, URL, or local path). **Mutates** local installs. Common failure: already present / directory exists → treat as already installed (see response body). Does **not** return skill tool schemas; use skill_load_main / skill_list_tools afterward.',
    parameters: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'Install source identifier as accepted by the installer backend.',
        },
      },
      required: ['source'],
      additionalProperties: false,
    },
  },
  skill_load_main: {
    name: 'skill_load_main',
    description:
      'Reads and returns the **main.md** (or equivalent) text for a named **installed** skill. Input: skill name. Does **not** install or list all skills.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Installed skill name.',
        },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  skill_load_reference: {
    name: 'skill_load_reference',
    description:
      'Reads a file under the skill\'s **reference/** tree. Input: skill name + path relative to reference/. Fails if skill missing or path invalid.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Skill name',
        },
        referencePath: {
          type: 'string',
          description: 'Path relative to the skill reference directory',
        },
      },
      required: ['name', 'referencePath'],
      additionalProperties: false,
    },
  },
  skill_list_tools: {
    name: 'skill_list_tools',
    description:
      'Returns **tool declarations** (JSON schema style) exposed by a named **installed** skill. Input: skill name. Does **not** invoke those tools.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Installed skill name',
        },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
};
