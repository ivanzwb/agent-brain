import { ToolDefinition } from "../innate-tools/types";

export const SKILL_TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  skill_find: {
    name: 'skill_find',
    description: 'Search for available skills from the online skill registry. Use this to discover skills by keyword before installing. Returns a list of matching skills with name, description, and install source.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search keyword or phrase to find relevant skills (e.g. "security audit", "data analysis", "web scraping")',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  skill_list: {
    name: 'skill_list',
    description: 'List all locally installed skills. Returns a list of available skills with their names and descriptions.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  skill_install: {
    name: 'skill_install',
    description: 'Install a new skill from the online registry or a direct source. Accepts a skill name returned by skill_find, an npm package name, a URL, or a local file path. The skill becomes available for use after installation. Before calling this, check existing skills with skill_list; if the skill is already installed, do NOT call skill_install again.',
    parameters: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'Skill name from skill_find results, npm package name, URL, or local file path',
        },
      },
      required: ['source'],
      additionalProperties: false,
    },
  },
  skill_load_main: {
    name: 'skill_load_main',
    description: 'Load the main context file (main.md) of a skill. Returns the skill\'s main context content for the LLM to understand the skill\'s purpose and capabilities.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the skill to load main context from',
        },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  skill_load_reference: {
    name: 'skill_load_reference',
    description: 'Load a reference file from a skill\'s reference directory. Useful for loading supplementary documentation or data files.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the skill',
        },
        referencePath: {
          type: 'string',
          description: 'Relative path to the reference file within the skill\'s reference directory',
        },
      },
      required: ['name', 'referencePath'],
      additionalProperties: false,
    },
  },
  skill_list_tools: {
    name: 'skill_list_tools',
    description: 'List all tools provided by a specific skill. Returns the tool declarations including name, description, and parameters.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the skill',
        },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
};
