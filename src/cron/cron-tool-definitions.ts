import { ToolDefinition } from "../types";

const CRON_TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  cron_list: {
    name: 'cron_list',
    description: 'List all scheduled tasks. Use when user asks to see scheduled jobs, reminders, or recurring tasks.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status: active, paused, completed, failed',
          enum: ['active', 'paused', 'completed', 'failed'],
        },
        limit: {
          type: 'number',
          description: 'Maximum number of jobs to return (default: 20)',
          default: 20,
        },
      },
      additionalProperties: false,
    },
  },

  cron_add: {
    name: 'cron_add',
    description: 'Schedule a recurring task. Use when user asks to: remind them daily/weekly, do something every X hours, set up scheduled notifications, automate recurring actions. Convert natural language like "every day at 8am" to cron expression "0 8 * * *".',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'A clear, descriptive name for the task (e.g., "daily_news_summary", "morning_reminder")',
        },
        cronExpression: {
          type: 'string',
          description: 'Cron expression for the schedule. Examples: "0 8 * * *" = daily at 8am, "0 */6 * * *" = every 6 hours, "0 9 * * 1-5" = weekdays at 9am, "30 18 * * *" = daily at 6:30pm, "0 0 * * *" = midnight daily',
        },
        command: {
          type: 'string',
          description: 'The action to perform. Can be a natural language instruction that will be executed by an AI agent (e.g., "summarize the past 24 hours news and send to me")',
        },
      },
      required: ['name', 'cronExpression', 'command'],
      additionalProperties: false,
    },
  },

  cron_delete: {
    name: 'cron_delete',
    description: 'Cancel or delete a scheduled task. Use when user asks to remove a scheduled reminder or recurring task.',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Job ID to delete (from cron_list result)',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },

  cron_pause: {
    name: 'cron_pause',
    description: 'Temporarily pause a scheduled task without deleting it.',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Job ID to pause (from cron_list result)',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },

  cron_resume: {
    name: 'cron_resume',
    description: 'Resume a previously paused scheduled task.',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Job ID to resume (from cron_list result)',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },

  cron_run_now: {
    name: 'cron_run_now',
    description: 'Execute a scheduled task immediately instead of waiting for its scheduled time.',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Job ID to run (from cron_list result)',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
};

export { CRON_TOOL_DEFINITIONS };