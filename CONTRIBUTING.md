# Contributing to Memoria

Thank you for your interest in contributing to Memoria! This document provides guidelines and instructions for contributing.

## Getting Started

1. **Fork the repository** and clone your fork
2. **Install dependencies**: `pnpm install`
3. **Set up Supabase** following the README instructions
4. **Create a feature branch**: `git checkout -b feature/your-feature-name`

## Development Workflow

### Making Changes

1. **Keep changes focused**: One feature or fix per PR
2. **Follow existing patterns**: Match the code style and structure
3. **Test thoroughly**: Test on both web and mobile if applicable
4. **Update documentation**: Update README or add comments for complex code

### Code Style

- **TypeScript**: Use strict typing, avoid `any`
- **Components**: Keep them small and focused (< 200 lines ideally)
- **Naming**: Use descriptive names (e.g., `handleSubmitComment` not `submit`)
- **Formatting**: Run `pnpm format` before committing

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add video thumbnail generation
fix: resolve upload queue retry logic
docs: update setup instructions
refactor: simplify media grid component
```

### Testing Changes

Before submitting:

```bash
# Type check
pnpm type-check

# Lint
pnpm lint

# Format
pnpm format

# Build
pnpm build
```

## Project Structure

- **`apps/web/`**: Next.js web app
- **`apps/mobile/`**: Expo mobile app
- **`packages/ui/`**: Shared types, schemas, utilities
- **`packages/config/`**: Shared configurations
- **`infra/supabase/`**: Database schema and policies

## Pull Request Process

1. **Update documentation** if needed
2. **Test on both platforms** if feature affects both
3. **Create PR** with clear description:
   - What does this change?
   - Why is it needed?
   - How was it tested?
4. **Wait for review** - we'll try to respond within a few days
5. **Address feedback** if requested

## What to Contribute

### High Priority

- Bug fixes
- Performance improvements
- Documentation improvements
- Test coverage
- Accessibility enhancements

### Feature Ideas

- Apple Sign-In
- Push notifications
- Video player improvements
- Search functionality
- Content moderation tools
- Analytics integration

### Before Starting Large Features

Please **open an issue first** to discuss:
- Is this aligned with the project goals?
- How should it be implemented?
- Are there any concerns?

## Code Review Guidelines

When reviewing:
- Be kind and constructive
- Explain your suggestions
- Approve if changes are good enough (don't bike-shed)

## Questions?

- Open a GitHub issue
- Tag with `question` label
- We'll respond as soon as possible

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Memoria! 🎉

