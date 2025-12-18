# GitHub Copilot Custom Agents

This overview documents the custom GitHub Copilot agents configured in the `.github/agents/` directory for the Stanterprise Playwright Reporter project.

## Available Agents

### 1. TypeScript Specialist (`typescript-specialist.agent.md`)
Expert in TypeScript development with deep knowledge of type systems, modern TypeScript features, and best practices for type-safe code.

**Use for:**
- TypeScript code changes
- Type definition updates
- Generic type implementations
- TypeScript configuration
- Type safety improvements

### 2. Testing Specialist (`testing-specialist.agent.md`)
Expert in testing strategies, Jest configuration, and test-driven development with focus on Playwright reporter testing patterns.

**Use for:**
- Writing unit tests
- Jest configuration
- Test mocking strategies
- Test coverage improvements
- Testing error scenarios

### 3. Documentation Specialist (`documentation-specialist.agent.md`)
Expert in creating clear, comprehensive documentation including README files, API docs, code comments, and usage examples.

**Use for:**
- README updates
- API documentation
- Usage examples
- JSDoc comments
- Configuration guides

### 4. Playwright Specialist (`playwright-specialist.agent.md`)
Expert in Playwright test automation framework, especially the Reporter API, test lifecycle management, and result processing.

**Use for:**
- Reporter interface implementation
- Test lifecycle handling
- Result processing
- Attachment handling
- Playwright-specific features

### 5. gRPC Specialist (`grpc-specialist.agent.md`)
Expert in gRPC protocol, protobuf integration, client configuration, and error handling for distributed systems communication.

**Use for:**
- gRPC client implementation
- Protobuf message handling
- Connection management
- Error handling for gRPC calls
- Performance optimization

### 6. Build Specialist (`build-specialist.agent.md`)
Expert in npm package development, build configuration, CI/CD workflows, and repository maintenance.

**Use for:**
- package.json updates
- Build configuration
- npm publishing
- CI/CD workflows
- Dependency management

## How to Use Custom Agents

### In GitHub Copilot Chat
1. Open Copilot Chat in VS Code, JetBrains IDE, or GitHub.com
2. Use the `@` mention to select a specific agent
3. Ask your question or request assistance

Example:
```
@typescript-specialist help me improve type safety in reporter.ts
```

### In Copilot CLI
```bash
gh copilot suggest --agent typescript-specialist "add proper types for this function"
```

### Auto-inference
Some agents are configured to auto-infer when their expertise is needed. Otherwise, you must explicitly select them.

## Agent Configuration

Each agent is configured with:
- **description**: Brief description of the agent's expertise
- **tools**: Tools the agent can access (`["*"]` means all available tools)
- **prompt**: Detailed instructions and expertise areas (in the Markdown body)

## Guidelines

Custom agents follow these principles:
- **Specialized Expertise**: Each agent focuses on a specific domain
- **Context-Aware**: Agents understand project structure and conventions
- **Best Practices**: Agents follow industry and project-specific best practices
- **Minimal Changes**: Agents make surgical, focused changes
- **Documentation**: Agents maintain clear documentation

## More Information

- [GitHub Copilot Custom Agents Documentation](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
- [Creating Custom Agents Guide](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents)
