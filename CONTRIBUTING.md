# Contributing to agent-brain

Thank you for your interest in contributing! Here's how you can help.

## Getting Started

```bash
git clone https://github.com/ivanzwb/agent-brain.git
cd agent-brain
npm install
npm run build
npm test
```

## Development Workflow

1. Fork and clone the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes and add tests
4. Run `npm test` to ensure all tests pass
5. Commit with a clear message (e.g. `feat: add custom model client`)
6. Open a Pull Request

## Code Style

- TypeScript strict mode
- No `any` unless absolutely necessary
- Export types from `src/types.ts`

## Reporting Issues

- Use [GitHub Issues](https://github.com/ivanzwb/agent-brain/issues)
- Include Node.js version, OS, and a minimal reproduction

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
