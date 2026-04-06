import type { InnateTool, ToolDefinition } from './types';

const FS_TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  fs_read: {
    name: 'fs_read',
    description: 'Read file content. Supports reading the entire file or a specific line range. Returns the content as string.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute or relative path to the file to read',
        },
        startLine: {
          type: 'number',
          description: 'Start line number (1-indexed). If not specified, reads from beginning.',
        },
        endLine: {
          type: 'number',
          description: 'End line number (inclusive). If not specified, reads to end of file.',
        },
        encoding: {
          type: 'string',
          description: 'File encoding (default: utf-8)',
          enum: ['utf-8', 'ascii', 'base64'],
          default: 'utf-8',
        },
      },
      required: ['path'],
      additionalProperties: false,
    },
  },

  fs_write: {
    name: 'fs_write',
    description: 'Write content to a file. Creates a new file or overwrites existing file. Supports creating parent directories.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute or relative path to the file to write',
        },
        content: {
          type: 'string',
          description: 'Content to write to the file',
        },
        encoding: {
          type: 'string',
          description: 'File encoding (default: utf-8)',
          enum: ['utf-8', 'ascii', 'base64'],
          default: 'utf-8',
        },
        createDirs: {
          type: 'boolean',
          description: 'Create parent directories if they do not exist (default: true)',
          default: true,
        },
      },
      required: ['path', 'content'],
      additionalProperties: false,
    },
  },

  fs_edit: {
    name: 'fs_edit',
    description: 'Edit specific lines in a file. Supports replacing, inserting, or deleting lines.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute or relative path to the file to edit',
        },
        operation: {
          type: 'string',
          description: 'Edit operation type',
          enum: ['replace', 'insert', 'delete'],
        },
        startLine: {
          type: 'number',
          description: 'Start line number (1-indexed, inclusive)',
        },
        endLine: {
          type: 'number',
          description: 'End line number (inclusive). For replace/delete, this is the range. For insert, this is the line to insert after.',
        },
        content: {
          type: 'string',
          description: 'Content to insert or replace with (not used for delete operation)',
        },
      },
      required: ['path', 'operation', 'startLine'],
      additionalProperties: false,
    },
  },

  fs_delete: {
    name: 'fs_delete',
    description: 'Delete a file or empty directory. Does not support recursive deletion of non-empty directories.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute or relative path to the file or directory to delete',
        },
        recursive: {
          type: 'boolean',
          description: 'For directories: if true, deletes non-empty directories recursively (default: false)',
          default: false,
        },
      },
      required: ['path'],
      additionalProperties: false,
    },
  },

  fs_list: {
    name: 'fs_list',
    description: 'List directory contents. Returns files and directories with their metadata.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute or relative path to the directory to list',
        },
        recursive: {
          type: 'boolean',
          description: 'If true, lists subdirectories recursively (default: false)',
          default: false,
        },
        includeHidden: {
          type: 'boolean',
          description: 'If true, includes hidden files (starting with .) (default: false)',
          default: false,
        },
      },
      required: ['path'],
      additionalProperties: false,
    },
  },

  fs_mkdir: {
    name: 'fs_mkdir',
    description: 'Create one or more directories. Creates parent directories as needed.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute or relative path of the directory to create',
        },
      },
      required: ['path'],
      additionalProperties: false,
    },
  },

  fs_exists: {
    name: 'fs_exists',
    description: 'Check if a file or directory exists at the given path.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute or relative path to check',
        },
      },
      required: ['path'],
      additionalProperties: false,
    },
  },

  fs_stat: {
    name: 'fs_stat',
    description: 'Get file or directory metadata (size, created time, modified time, type, etc.).',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute or relative path to the file or directory',
        },
      },
      required: ['path'],
      additionalProperties: false,
    },
  },

  fs_search: {
    name: 'fs_search',
    description: 'Search for files or directories by name pattern in a directory tree.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Root directory to search from',
        },
        pattern: {
          type: 'string',
          description: 'Glob pattern to match file/directory names (e.g., "*.ts", "**/*.js")',
        },
        type: {
          type: 'string',
          description: 'Filter by type',
          enum: ['file', 'dir', 'any'],
          default: 'any',
        },
      },
      required: ['path', 'pattern'],
      additionalProperties: false,
    },
  },

  fs_grep: {
    name: 'fs_grep',
    description: 'Search for text content within files. Returns matching lines with context.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Root directory to search from',
        },
        pattern: {
          type: 'string',
          description: 'Regular expression pattern to search for',
        },
        filePattern: {
          type: 'string',
          description: 'Glob pattern to filter files (e.g., "*.ts", "*.js")',
        },
        caseSensitive: {
          type: 'boolean',
          description: 'Case sensitive search (default: true)',
          default: true,
        },
        contextLines: {
          type: 'number',
          description: 'Number of context lines to include around matches (default: 2)',
          default: 2,
        },
      },
      required: ['path', 'pattern'],
      additionalProperties: false,
    },
  },
};

export { FS_TOOL_DEFINITIONS };

export class FSReadTool implements InnateTool {
  readonly definition: ToolDefinition = FS_TOOL_DEFINITIONS.fs_read;

  async execute(args: Record<string, unknown>): Promise<string> {
    const path = args['path'] as string;
    const startLine = args['startLine'] as number | undefined;
    const endLine = args['endLine'] as number | undefined;
    const encoding = (args['encoding'] as string) || 'utf-8';

    const fs = await import('fs/promises');
    let content = await fs.readFile(path, { encoding: encoding as BufferEncoding });

    if (encoding === 'base64') {
      return JSON.stringify({ status: 'ok', content, encoding: 'base64' });
    }

    const lines = content.split('\n');

    if (startLine !== undefined || endLine !== undefined) {
      const start = startLine !== undefined ? startLine - 1 : 0;
      const end = endLine !== undefined ? endLine : lines.length;
      const selectedLines = lines.slice(start, end);
      return JSON.stringify({
        status: 'ok',
        path,
        startLine: startLine ?? 1,
        endLine: endLine ?? lines.length,
        totalLines: lines.length,
        content: selectedLines.join('\n'),
      });
    }

    return JSON.stringify({
      status: 'ok',
      path,
      totalLines: lines.length,
      content,
    });
  }
}

export class FSWriteTool implements InnateTool {
  readonly definition: ToolDefinition = FS_TOOL_DEFINITIONS.fs_write;

  async execute(args: Record<string, unknown>): Promise<string> {
    const path = args['path'] as string;
    const content = args['content'] as string;
    const encoding = (args['encoding'] as string) || 'utf-8';
    const createDirs = args['createDirs'] !== false;

    const fs = await import('fs/promises');

    if (createDirs) {
      const dir = path.replace(/[/\\][^/\\]*$/, '');
      if (dir) {
        await fs.mkdir(dir, { recursive: true }).catch(() => {});
      }
    }

    await fs.writeFile(path, content, { encoding: encoding as BufferEncoding });

    return JSON.stringify({
      status: 'ok',
      path,
      bytesWritten: Buffer.byteLength(content, encoding as BufferEncoding),
    });
  }
}

export class FSEditTool implements InnateTool {
  readonly definition: ToolDefinition = FS_TOOL_DEFINITIONS.fs_edit;

  async execute(args: Record<string, unknown>): Promise<string> {
    const path = args['path'] as string;
    const operation = args['operation'] as 'replace' | 'insert' | 'delete';
    const startLine = args['startLine'] as number;
    const endLine = args['endLine'] as number | undefined;
    const content = args['content'] as string | undefined;

    const fs = await import('fs/promises');
    const original = await fs.readFile(path, 'utf-8');
    const lines = original.split('\n');

    const start = startLine - 1;
    const end = endLine !== undefined ? endLine : start;

    if (operation === 'replace') {
      const before = lines.slice(0, start);
      const after = lines.slice(end + 1);
      const newLines = [...before, content || '', ...after];
      await fs.writeFile(path, newLines.join('\n'), 'utf-8');
      return JSON.stringify({
        status: 'ok',
        path,
        operation: 'replace',
        replacedLines: end - start + 1,
        newLines: content ? content.split('\n').length : 0,
      });
    }

    if (operation === 'insert') {
      const before = lines.slice(0, end);
      const after = lines.slice(end);
      const newLines = [...before, content || '', ...after];
      await fs.writeFile(path, newLines.join('\n'), 'utf-8');
      return JSON.stringify({
        status: 'ok',
        path,
        operation: 'insert',
        insertedAfterLine: endLine,
        newLines: content ? content.split('\n').length : 0,
      });
    }

    if (operation === 'delete') {
      const before = lines.slice(0, start);
      const after = lines.slice(end + 1);
      await fs.writeFile(path, [...before, ...after].join('\n'), 'utf-8');
      return JSON.stringify({
        status: 'ok',
        path,
        operation: 'delete',
        deletedLines: end - start + 1,
      });
    }

    return JSON.stringify({ status: 'error', message: 'Invalid operation' });
  }
}

export class FSDeleteTool implements InnateTool {
  readonly definition: ToolDefinition = FS_TOOL_DEFINITIONS.fs_delete;

  async execute(args: Record<string, unknown>): Promise<string> {
    const path = args['path'] as string;
    const recursive = args['recursive'] as boolean || false;

    const fs = await import('fs/promises');
    const stat = await fs.stat(path);

    if (stat.isDirectory()) {
      await fs.rm(path, { recursive });
    } else {
      await fs.unlink(path);
    }

    return JSON.stringify({
      status: 'ok',
      path,
      type: stat.isDirectory() ? 'directory' : 'file',
    });
  }
}

export class FSListTool implements InnateTool {
  readonly definition: ToolDefinition = FS_TOOL_DEFINITIONS.fs_list;

  async execute(args: Record<string, unknown>): Promise<string> {
    const path = args['path'] as string;
    const recursive = args['recursive'] as boolean || false;
    const includeHidden = args['includeHidden'] as boolean || false;

    const fs = await import('fs/promises');
    const path_1 = await import('path');

    async function listDir(dir: string, relPath: string = ''): Promise<any[]> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const result: any[] = [];

      for (const entry of entries) {
        if (!includeHidden && entry.name.startsWith('.')) continue;

        const fullPath = path_1.join(dir, entry.name);
        const entryRelPath = path_1.join(relPath, entry.name);
        const stat = await fs.stat(fullPath);

        result.push({
          name: entry.name,
          path: entryRelPath,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: stat.size,
          modified: stat.mtime.toISOString(),
        });

        if (recursive && entry.isDirectory()) {
          const subResults = await listDir(fullPath, entryRelPath);
          result.push(...subResults);
        }
      }

      return result;
    }

    const items = await listDir(path);

    return JSON.stringify({
      status: 'ok',
      path,
      count: items.length,
      items,
    });
  }
}

export class FSMkdirTool implements InnateTool {
  readonly definition: ToolDefinition = FS_TOOL_DEFINITIONS.fs_mkdir;

  async execute(args: Record<string, unknown>): Promise<string> {
    const path = args['path'] as string;

    const fs = await import('fs/promises');
    await fs.mkdir(path, { recursive: true });

    return JSON.stringify({ status: 'ok', path });
  }
}

export class FSExistsTool implements InnateTool {
  readonly definition: ToolDefinition = FS_TOOL_DEFINITIONS.fs_exists;

  async execute(args: Record<string, unknown>): Promise<string> {
    const path = args['path'] as string;

    const fs = await import('fs/promises');
    try {
      const stat = await fs.stat(path);
      return JSON.stringify({
        exists: true,
        path,
        type: stat.isDirectory() ? 'directory' : 'file',
      });
    } catch {
      return JSON.stringify({ exists: false, path });
    }
  }
}

export class FSStatTool implements InnateTool {
  readonly definition: ToolDefinition = FS_TOOL_DEFINITIONS.fs_stat;

  async execute(args: Record<string, unknown>): Promise<string> {
    const path = args['path'] as string;

    const fs = await import('fs/promises');
    const stat = await fs.stat(path);

    return JSON.stringify({
      status: 'ok',
      path,
      type: stat.isDirectory() ? 'directory' : 'file',
      size: stat.size,
      created: stat.birthtime.toISOString(),
      modified: stat.mtime.toISOString(),
      accessed: stat.atime.toISOString(),
      isDirectory: stat.isDirectory(),
      isFile: stat.isFile(),
    });
  }
}

export class FSSearchTool implements InnateTool {
  readonly definition: ToolDefinition = FS_TOOL_DEFINITIONS.fs_search;

  async execute(args: Record<string, unknown>): Promise<string> {
    const path = args['path'] as string;
    const pattern = args['pattern'] as string;
    const type = args['type'] as 'file' | 'dir' | 'any' || 'any';

    const fs = await import('fs/promises');
    const path_1 = await import('path');

    const results: any[] = [];

    async function searchDir(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path_1.join(dir, entry.name);
        const matches = matchPattern(entry.name, pattern);

        if (matches) {
          if (type === 'any' || (type === 'file' && entry.isFile()) || (type === 'dir' && entry.isDirectory())) {
            results.push({
              name: entry.name,
              path: path_1.relative(path, fullPath),
              type: entry.isDirectory() ? 'directory' : 'file',
            });
          }
        }

        if (entry.isDirectory()) {
          await searchDir(fullPath);
        }
      }
    }

    await searchDir(path);

    return JSON.stringify({
      status: 'ok',
      path,
      pattern,
      count: results.length,
      results,
    });
  }
}

function matchPattern(name: string, pattern: string): boolean {
  if (pattern.startsWith('**/')) {
    const ext = pattern.slice(3);
    return name.endsWith(ext);
  }
  if (pattern.startsWith('*.')) {
    const ext = pattern.slice(2);
    return name.endsWith('.' + ext);
  }
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(name);
  }
  return name === pattern;
}

export class FSGrepTool implements InnateTool {
  readonly definition: ToolDefinition = FS_TOOL_DEFINITIONS.fs_grep;

  async execute(args: Record<string, unknown>): Promise<string> {
    const path = args['path'] as string;
    const pattern = args['pattern'] as string;
    const filePattern = args['filePattern'] as string | undefined;
    const caseSensitive = args['caseSensitive'] !== false;
    const contextLines = (args['contextLines'] as number) || 2;

    const fs = await import('fs/promises');
    const path_1 = await import('path');

    const results: any[] = [];
    const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');

    async function searchDir(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path_1.join(dir, entry.name);

        if (entry.isDirectory()) {
          await searchDir(fullPath);
          continue;
        }

        if (filePattern && !matchPattern(entry.name, filePattern)) {
          continue;
        }

        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const lines = content.split('\n');
          const matches: any[] = [];

          for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i])) {
              const start = Math.max(0, i - contextLines);
              const end = Math.min(lines.length - 1, i + contextLines);
              matches.push({
                lineNumber: i + 1,
                line: lines[i].trim(),
                context: lines.slice(start, end + 1).map((l, idx) => ({
                  lineNumber: start + idx + 1,
                  content: l,
                })),
              });
              regex.lastIndex = 0;
            }
          }

          if (matches.length > 0) {
            results.push({
              file: path_1.relative(path, fullPath),
              matches,
            });
          }
        } catch {
          // Skip files that can't be read
        }
      }
    }

    await searchDir(path);

    return JSON.stringify({
      status: 'ok',
      path,
      pattern,
      filesMatched: results.length,
      results,
    });
  }
}
