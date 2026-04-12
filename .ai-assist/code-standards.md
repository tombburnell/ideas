# Code Standards & Best Practices

This document defines the coding standards and best practices for this codebase. It should be referenced by:

- **Coding agents** during implementation to ensure code adheres to standards
- **Code review agents** (`agents/code-review.md`) to validate compliance
- **Developers** as a reference for consistent patterns

> **Note**: This document complements but does not replace project-specific rules in `.cursor/rules`, `AGENTS.md`, and subproject-specific rules files.

## Table of Contents

1. [Architecture & Separation of Concerns](#architecture--separation-of-concerns)
2. [Type Safety & TypeScript](#type-safety--typescript)
3. [Testing Requirements](#testing-requirements)
4. [Security Standards](#security-standards)
5. [Performance Guidelines](#performance-guidelines)
6. [Code Quality & Maintainability](#code-quality--maintainability)
7. [Naming Conventions](#naming-conventions)
8. [Error Handling & Logging](#error-handling--logging)
9. [Database & Migrations](#database--migrations)
10. [Frontend-Specific Standards](#frontend-specific-standards)
11. [Backend-Specific Standards](#backend-specific-standards)
12. [Code Cleanliness](#code-cleanliness)
13. [AI Code Quality & Complexity](#ai-code-quality--complexity)

---

## Architecture & Separation of Concerns

### Layer Separation

- **Routers/Controllers**: Must be thin - only handle HTTP request/response, validation, and delegation to services
- **Services**: Contain all business logic and orchestration
- **Repositories**: Only handle database operations (queries, transactions) - NO business logic, NO queue operations
- **Orchestration**: Job flows and queue operations belong in orchestration layers, not repositories

### ✅ Good Examples

```typescript
// Router - thin, delegates to service
router.get("/reports", async (req, res) => {
  const reports = await service.getAll();
  res.json({ data: reports });
});

// Service - contains business logic
class ReportService {
  async getAll() {
    const reports = await repo.getAll();
    const jobStates = await this.loadJobStates(reports.map((r) => r.id));
    return this.enrichWithJobStates(reports, jobStates);
  }
}

// Repository - only DB operations
class ReportRepository {
  async getAll() {
    return db.select().from(reports);
  }
}
```

### ❌ Anti-Patterns

- Business logic in routers
- Queue operations in repositories
- Database queries in services when they should be in repositories
- Circular dependencies (use dependency injection or service layer to break cycles)

---

## Type Safety & TypeScript

### Type Requirements

- **No `any` types** - Use explicit types or `unknown` with type guards
- **Prefer shared types** - Use shared types for cross-project consistency
- **Named exports** - Complex inline types should be extracted as named interfaces/types
- **Type guards** - Use proper type guards for runtime validation (zod schemas, type predicates)

### ✅ Good Examples

```typescript
// Use shared types
import { AnalysisResult, Status } from "./shared-types";

// Named interface for complex types
interface DisplayData {
  label: string;
  status: Status;
  findings: string | null;
}

// Type guard
function isCompleted(status: string): status is Status {
  return status === "COMPLETED";
}
```

### ❌ Anti-Patterns

```typescript
// ❌ Using any
const data: any = await fetchData();

// ❌ Complex inline types
const process = (data: { id: string; metadata: { version: number; label: string } }) => {};

// ❌ Missing type guards
if (typeof data.status === 'string') { // Should use proper type guard
```

---

## Testing Requirements

### Test Coverage Expectations

- **New features**: Must include tests for happy path, error cases, and edge cases
- **Critical paths**: RBAC checks, tenant isolation, data validation
- **API routes**: Test request/response, error handling, authentication
- **Services**: Unit tests for business logic
- **Repositories**: Integration tests with database
- **Components**: Unit tests with your standard UI test runner, accessibility tests

### Test Organization

- **Location**: Tests live near code in `__tests__` directories
- **Naming**: `*.test.ts` or `*.spec.ts`
- **Structure**: Use `describe`/`it` blocks with descriptive names that explain behavior

### ⚠️ CRITICAL: No Test-Specific Code in Production

- **Production code must not contain test-specific logic** - Never add conditionals, checks, or workarounds specifically to make tests pass
- **Test helpers belong in test files** - Use `setup-integration-common.ts` or similar test utilities
- **Tests must set up proper data** - Integration tests create all required data (users, organizations, etc.)
- **Production code enforces constraints** - Fail loudly when preconditions aren't met, don't silently skip

**Why**: Test-specific checks mask production bugs, make tests unrealistic, and create maintenance burden.

### ✅ Good Examples

```typescript
describe("ReportService.getAll()", () => {
  it("should return reports with job states", async () => {
    // Test implementation
  });

  it("should handle missing job states gracefully", async () => {
    // Error case
  });

  it("should enforce tenant isolation", async () => {
    // Security check
  });
});
```

### Missing Test Indicators

- New API endpoint without route test
- New service method without unit test
- New component without component test
- RBAC logic without authorization test
- Database query without integration test

---

## Security Standards

### Authentication & Authorization

- **All endpoints** must have appropriate auth middleware
- **RBAC checks** must be applied before data access, not after
- **Tenant isolation** must be enforced on all queries (WHERE clauses include tenant/org ID)
- **IDOR prevention** - IDs in URLs/params must be validated against user's permissions

### Input Validation

- **All user input** must be validated at the boundary using zod schemas or express-validator
- **Never trust client data** - validate and sanitize all inputs
- **Type coercion** - Use proper type conversion, not implicit coercion

### Data Exposure Prevention

- **No sensitive data** in SSR page props or initial state
- **Error messages** must not expose stack traces, SQL queries, or file paths
- **PII** must not be logged or must be properly redacted
- **API responses** must not leak internal IDs or other users' data

### ✅ Good Examples

```typescript
// Input validation with zod
const schema = z.object({
  reportId: z.string().uuid(),
  userId: z.string().uuid(),
});

// Tenant isolation in query
const reports = await db
  .select()
  .from(reports)
  .where(eq(reports.organisationId, user.organisationId)); // ✅ Tenant check

// RBAC check before access
if (!(await canAccessReport(user, reportId))) {
  throw new ForbiddenError();
}
```

### ❌ Anti-Patterns

```typescript
// ❌ No tenant isolation
const reports = await db.select().from(reports); // Missing WHERE clause

// ❌ RBAC check after data fetch
const report = await repo.getById(id);
if (report.userId !== user.id) throw Error(); // Too late!

// ❌ Trusting client input
const reportId = req.params.id; // Should validate!
await repo.delete(reportId);
```

---

## Performance Guidelines

### Database Queries

- **Avoid N+1 queries** - Use batch loading with `IN` clauses or joins
- **Index usage** - Ensure queries use appropriate indexes
- **Query optimization** - Review slow queries, use EXPLAIN ANALYZE

### Caching

- **Query caching** - Use consistent staleTime or cache duration constants
- **Cache invalidation** - Properly invalidate caches on mutations
- **Cache usage** - Use caches for derived state, not business logic storage

### Frontend Performance

- **Code splitting** - Use dynamic imports for large components
- **Image optimization** - Use the framework’s image optimization where available
- **Bundle size** - Avoid unnecessary dependencies

### ✅ Good Examples

```typescript
// Batch loading instead of N+1
const reportIds = reports.map((r) => r.id);
const promptResults = await repo.loadPromptResultsBatch(reportIds); // ✅ Single query

// Proper cache invalidation
queryClient.invalidateQueries({ queryKey: [reportQueryKey] });
```

### ❌ Anti-Patterns

```typescript
// ❌ N+1 query pattern
for (const report of reports) {
  const results = await repo.loadPromptResults(report.id); // Bad!
}

// ❌ Missing cache invalidation
await deleteReport(id);
// Should invalidate queries here!
```

---

## Code Quality & Maintainability

### DRY (Don't Repeat Yourself)

- **Reuse existing utilities** - Check for existing functions/components before creating new ones
- **Extract common logic** - Create shared utilities for repeated patterns
- **Consolidate similar code** - Merge duplicate implementations

### Single Responsibility

- **One purpose per function/class** - Functions should do one thing well
- **Focused components** - Components should have a single responsibility
- **Clear boundaries** - Each layer should have clear responsibilities

### Code Organization

- **Feature-based structure** - Group related files together
- **Consistent patterns** - Follow existing patterns in the codebase
- **Clear imports** - Use consistent absolute imports if configured

### ✅ Good Examples

```typescript
// Reusable utility function
export const formatTime = (ms: number): string => {
  // Implementation
};

// Extracted component
export const StatusCell = ({ status, report }: StatusCellProps) => {
  // Single responsibility
};
```

### ❌ Anti-Patterns

```typescript
// ❌ Duplicate logic
const formatTime1 = (ms: number) => {
  /* ... */
};
const formatTime2 = (ms: number) => {
  /* ... */
}; // Should reuse!

// ❌ God component
const MegaComponent = () => {
  // Handles everything - should be split
};
```

---

## Naming Conventions

### Functions & Variables

- **camelCase** for functions, variables, and file names
- **Descriptive names** - Names should clearly indicate purpose
- **Avoid abbreviations** - Use full words unless abbreviation is standard

### Components & Types

- **PascalCase** for React components and TypeScript interfaces
- **Component names** should match file names
- **Interface names** should be descriptive (avoid `Props`, prefer `ComponentNameProps`)

### Files & Directories

- **kebab-case** for file paths and CSS classes
- **Feature-based** organization in directories
- **Consistent naming** across similar files

### ✅ Good Examples

```typescript
// Functions
const loadJobStates = async () => {};
const formatEntityName = (entity: Entity) => {};

// Components
export const ProgressBar = () => {};
interface ProgressBarProps {}

// Files
progress-bar.tsx;
load-job-states.ts;
```

---

## Error Handling & Logging

### Error Handling

- **Proper error types** - Use appropriate error classes (NotFoundError, ValidationError, etc.)
- **Error boundaries** - Frontend components should have error boundaries
- **Graceful degradation** - Handle errors without crashing the application
- **User-friendly messages** - Errors shown to users should be clear and actionable

### Logging

- **Structured logging** - Use logger with appropriate levels (info, warn, error)
- **Context in logs** - Include relevant context (IDs, user info, operation)
- **No sensitive data** - Never log passwords, tokens, or PII
- **Consistent patterns** - Follow existing logging patterns

### ✅ Good Examples

```typescript
// Proper error handling
try {
  const report = await service.getById(id);
} catch (error) {
  if (error instanceof NotFoundError) {
    return res.status(404).json({ error: "Report not found" });
  }
  logger.error("Failed to fetch report", { reportId: id, error });
  throw error;
}

// Structured logging
logger.info("Job flow created", {
  entityId,
  jobId,
  correlationId,
  selectedTasks,
  taskCount,
});
```

---

## Database & Migrations

### Migration Safety

- **Idempotent migrations** - Migrations should be safe to run multiple times
- **Backward compatibility** - Consider rollback strategies
- **Default values** - Provide safe defaults for new columns
- **Data backfill** - Back-fill data where necessary

### Query Safety

- **Parameterized queries** - Always use parameterized queries (ORMs handle this)
- **Transaction usage** - Use transactions for multi-step operations
- **Referential integrity** - Maintain foreign key constraints

### ✅ Good Examples

```typescript
// Safe migration with defaults
export const addStatusColumn = sql`
  ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING'
`;

// Transaction usage
await db.transaction(async (tx) => {
  await tx.insert(reports).values(data);
  await tx.insert(promptResults).values(results);
});
```

---

## Frontend-Specific Standards

### UI Components

- **Functional components** - Use functional components with hooks
- **TypeScript interfaces** - Define prop interfaces explicitly
- **Client/Server boundaries** - Follow framework conventions

### State Management

- **Server state** - Use the standard data fetching/caching library
- **Forms** - Use the standard form library if adopted
- **Local state** - Use `useState` for component-local state
- **Avoid global state** - Prefer local state or standard server-state tools for shared state

### Styling

- **Tailwind CSS** - Use utility classes, not custom CSS
- **Consistent spacing** - Use Tailwind spacing scale
- **Responsive design** - Use Tailwind responsive prefixes
- **Design system** - Follow existing color palette and component patterns

### Data Fetching

- **Consistent staleTime** - Use a shared cache duration constant if defined
- **Loading states** - Always handle loading and error states
- **Cache invalidation** - Invalidate queries on mutations

### ✅ Good Examples

```typescript
// Proper hook usage
export const useAnalysisById = (id: string) => {
  return useQuery({
    queryKey: [analysisQueryKey, id],
    queryFn: () => api.fetchById(id),
    staleTime: STALE_TIME, // ✅ Consistent constant
    refetchInterval: getPollingInterval,
  });
};

// Component with proper types
interface ProgressBarProps {
  promptJobStates?: Record<string, PromptJobStatus>;
  reportStatus: ReportStatus;
}

export const ProgressBar: FC<ProgressBarProps> = ({
  promptJobStates,
  reportStatus,
}) => {
  // Implementation
};
```

---

## Backend-Specific Standards

### Routers

- **Thin routers** - Routers should only handle HTTP concerns
- **Delegation** - Delegate business logic to services
- **Error handling** - Use error middleware for consistent error responses
- **Validation** - Validate requests before processing

### Jobs & Queues

- **Correlation IDs** - Include correlation IDs in job data
- **Retry safety** - Ensure jobs are safe to retry (idempotent)
- **Error handling** - Proper error handling in job processors
- **Flow patterns** - Use flows for complex multi-step operations

### Services & Orchestration

- **Business logic** - All business logic belongs in services
- **Queue operations** - Queue operations belong in orchestration layer
- **Separation** - Keep services separate from repositories and orchestration

### ✅ Good Examples

```typescript
// Thin router
router.get("/entities/:id", async (req, res, next) => {
  try {
    const entity = await entityService.getById(req.params.id);
    res.json({ data: entity });
  } catch (error) {
    next(error);
  }
});

// Service with business logic
class EntityService {
  async getById(id: string) {
    const entity = await repo.getById(id);
    const jobStates = await this.loadJobStates(id);
    return this.enrichWithJobStates(entity, jobStates);
  }
}
```

---

## Code Cleanliness

### Debug Artifacts

- **No console.log** - Remove all `console.log`, `console.debug` statements
- **No commented code** - Remove commented-out code blocks
- **No placeholders** - Remove placeholder text, test data, hardcoded IDs
- **No TODOs** - Remove `TODO`, `FIXME`, `HACK` comments (or track in tickets)

---

## AI Code Quality & Complexity

### Detecting AI Slop

AI-generated code often exhibits patterns that indicate lack of understanding or over-engineering. Reviewers should flag:

- **Overly verbose code** - Code that's unnecessarily wordy or explains obvious things
- **Unnecessary abstractions** - Wrapper functions, factories, or patterns that add no value
- **Over-engineered solutions** - Complex solutions when simple ones would suffice
- **Excessive comments** - Comments that restate what the code does rather than explain why
- **Overly generic code** - Generic implementations when specific, domain-appropriate code is better
- **Unnecessary type complexity** - Overly complex type definitions that don't add clarity
- **Overly defensive patterns** - Excessive null checks, type guards, or error handling where not needed
- **Lack of context awareness** - Code that doesn't fit existing patterns or conventions
- **Copy-paste patterns** - Code that looks templated without understanding the specific use case

### ✅ Good Examples

```typescript
// Simple, direct implementation
const getUserById = async (id: string) => {
  return db.select().from(users).where(eq(users.id, id)).limit(1);
};

// Appropriate abstraction with clear purpose
const validateAndSave = async (data: UserData) => {
  const validated = schema.parse(data);
  return repo.save(validated);
};
```

### ❌ Anti-Patterns (AI Slop Indicators)

```typescript
// ❌ Overly verbose with unnecessary abstraction
class UserDataProcessorFactory {
  createProcessor(): UserDataProcessor {
    return new UserDataProcessor();
  }
}

class UserDataProcessor {
  async processUserData(userData: UserData): Promise<ProcessedUserData> {
    // This function processes user data
    const processedData = this.transformUserData(userData);
    return processedData;
  }
  
  private transformUserData(data: UserData): ProcessedUserData {
    // Transform the user data
    return { ...data, processed: true };
  }
}

// ✅ Should be:
const processUserData = async (data: UserData): Promise<ProcessedUserData> => {
  return { ...data, processed: true };
};

// ❌ Excessive comments explaining obvious code
// This function takes an id parameter and returns a user
// It queries the database for a user with the given id
// If found, it returns the user object
const getUserById = async (id: string) => {
  // Query the database
  const user = await db.select().from(users).where(eq(users.id, id));
  // Return the user
  return user[0];
};

// ❌ Overly generic when specific is better
const processEntity = async <T extends BaseEntity>(
  entity: T,
  processor: EntityProcessor<T>
): Promise<T> => {
  // Generic processing logic that doesn't add value
  return processor.process(entity);
};

// ✅ Should be specific:
const updateUserStatus = async (userId: string, status: UserStatus) => {
  return db.update(users).set({ status }).where(eq(users.id, userId));
};
```

### Cyclomatic Complexity

**Cyclomatic complexity** measures the number of linearly independent paths through code. High complexity indicates hard-to-test, hard-to-maintain code.

- **Target threshold**: Functions should have complexity ≤ 10
- **Warning threshold**: Complexity 10-15 should be flagged for review
- **Critical threshold**: Complexity > 15 should be refactored before merge

### Calculating Complexity

Complexity increases by 1 for each:
- `if`, `else if`, `else` statement
- `switch` case (each case adds 1)
- `for`, `while`, `do-while` loop
- `catch` block
- `&&`, `||` in conditions (each operator adds 1)
- Ternary operator (`? :`)

### ✅ Good Examples

```typescript
// Complexity: 1 (simple function)
const getUserById = async (id: string) => {
  return db.select().from(users).where(eq(users.id, id)).limit(1);
};

// Complexity: 3 (acceptable)
const validateUser = (user: User) => {
  if (!user.email) return false;
  if (!user.name) return false;
  return user.email.includes('@');
};
```

### ❌ Anti-Patterns (High Complexity)

```typescript
// ❌ Complexity: 18 (too high!)
const processOrder = async (order: Order) => {
  if (order.status === 'pending') {
    if (order.items.length > 0) {
      for (const item of order.items) {
        if (item.quantity > 0) {
          if (item.inStock) {
            if (item.price > 0) {
              if (order.userId) {
                if (order.shippingAddress) {
                  if (order.paymentMethod) {
                    // ... nested logic continues
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

// ✅ Should be refactored:
const validateOrderItems = (items: OrderItem[]) => {
  return items.every(item => item.quantity > 0 && item.inStock && item.price > 0);
};

const validateOrder = (order: Order) => {
  return order.status === 'pending' &&
    order.items.length > 0 &&
    validateOrderItems(order.items) &&
    order.userId &&
    order.shippingAddress &&
    order.paymentMethod;
};

const processOrder = async (order: Order) => {
  if (!validateOrder(order)) {
    throw new ValidationError('Invalid order');
  }
  // Process order...
};
```

### Refactoring High Complexity

When complexity is high, consider:

1. **Extract functions** - Break complex functions into smaller, focused ones
2. **Early returns** - Use guard clauses to reduce nesting
3. **Lookup tables** - Replace long if/else chains with maps or objects
4. **Strategy pattern** - Replace conditionals with polymorphic behavior
5. **Remove unnecessary conditions** - Simplify logic by removing redundant checks

### Review Checklist

When reviewing code, check for:

- [ ] Functions with > 10 decision points (if/else, loops, ternaries)
- [ ] Deeply nested conditionals (> 3 levels)
- [ ] Long switch statements (> 5 cases)
- [ ] Complex boolean expressions (> 3 conditions)
- [ ] Overly verbose implementations that could be simplified
- [ ] Unnecessary abstractions or wrapper functions
- [ ] Comments that restate code rather than explain why
- [ ] Generic code when domain-specific would be clearer

### Dead Code

- **Remove unused code** - Delete functions, classes, or exports that are never used
- **Remove unused files** - Delete files that aren't imported anywhere
- **Remove unused imports** - Clean up unused imports
- **Remove duplicate code** - Consolidate duplicate implementations

### Code Comments

- **Explain why, not what** - Comments should explain reasoning, not restate code
- **Keep comments updated** - Remove outdated comments
- **Documentation comments** - Use JSDoc for public APIs

### ✅ Good Examples

```typescript
// Good comment - explains why
// Set staleTime to 0 to ensure fresh data on every mount
// Without this, the global staleTime of 5 minutes would prevent refetching
staleTime: 0,

// Bad comment - restates what code does
// Set staleTime to 0
staleTime: 0,
```

### ❌ Anti-Patterns

```typescript
// ❌ Debug code
console.log("Debug:", data); // Remove before commit!

// ❌ Commented code
// const oldFunction = () => { ... }; // Should be deleted

// ❌ Placeholder
const testId = "test-123"; // Should use real data or env var

// ❌ TODO without ticket
// TODO: Fix this later // Should be in ticket tracker
```

---

## Quick Reference Checklist

When writing code, ensure:

- [ ] No business logic in routers - delegate to services
- [ ] No queue operations in repositories - use orchestration layer
- [ ] All inputs validated with zod schemas
- [ ] Tenant isolation enforced on all queries
- [ ] RBAC checks before data access
- [ ] No `any` types - use explicit types
- [ ] Tests for happy path, error cases, and edge cases
- [ ] **⚠️ CRITICAL: No test-specific code in production files** - use test helpers instead
- [ ] Integration tests set up all required data (users, orgs, etc.)
- [ ] Proper error handling and logging
- [ ] No N+1 queries - use batch loading
- [ ] Consistent use of shared constants
- [ ] No debug artifacts (console.log, commented code, TODOs)
- [ ] Reuse existing utilities/components before creating new ones
- [ ] Proper TypeScript types and interfaces
- [ ] Loading and error states handled in UI
- [ ] Cache invalidation on mutations
- [ ] Functions have cyclomatic complexity ≤ 10
- [ ] No AI slop patterns (over-engineering, unnecessary abstractions, excessive verbosity)

---

## References

- **Project Guidelines**: `AGENTS.md`
- **Code Review Process**: `agents/code-review.md`
- **Architecture Documentation**: `docs/`
- **Root Rules**: `.cursor/rules`

---

**Last Updated**: Based on PR #689 review findings and established patterns
