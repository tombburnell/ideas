# Review Implementation Plan — Agent Guide

This guide helps review implementation plans for completeness and implementation readiness. Use this before starting development on a plan.

## Purpose

Implementation plan reviews should:

- **Verify tech approach decisions** are reflected in the plan
- **Ensure sufficient implementation detail** for developers to proceed without guessing
- **Catch missing inherited obligations** (abstract methods, interface contracts)
- **Validate ticket breakdown** is logical and complete
- **Identify ambiguous instructions** that will cause implementation bugs

---

## Review Process

### Phase 1: Tech Approach Alignment (5 minutes)

Compare plan against the approved tech approach:

| Tech Approach Decision | Plan Reflects It?  | Gap?  |
| ---------------------- | ------------------ | ----- |
| Decision 1             | Which ticket/step? | ✅/❌ |
| Decision 2             | Which ticket/step? | ✅/❌ |
| ...                    | ...                | ...   |

**Common Gaps**:

- Tech approach says "use X pattern" but plan doesn't include steps to implement X
- Tech approach has open questions that are still open in the plan
- Plan introduces new decisions not in tech approach (should be documented)

---

### Phase 2: Implementation Detail Review (CRITICAL)

For each ticket, verify sufficient detail exists:

#### 2a. Repository/Service Implementation

When plan says "implement XRepo following YPattern":

| Check                      | Question                                              | Red Flag                                               |
| -------------------------- | ----------------------------------------------------- | ------------------------------------------------------ |
| **All Methods Listed**     | Are ALL methods to implement explicitly listed?       | "Implement repo following pattern" without method list |
| **Abstract Methods**       | Are inherited abstract methods explicitly called out? | No mention of base class obligations                   |
| **Implementation Pattern** | Is HOW to implement each method specified?            | "Implement getById" without specifying joins/tables    |
| **Reference Files**        | Are example files provided for each method?           | No file references                                     |
| **Non-Obvious Semantics**  | Are parameter meanings explained?                     | `attachment` without clarifying it's text not file IDs |

#### 2b. Database/Schema Work

| Check             | Question                         | Red Flag                                                       |
| ----------------- | -------------------------------- | -------------------------------------------------------------- |
| **All Tables**    | Are all required tables listed?  | Missing attachments table when extending AbstractRepository |
| **Relationships** | Are FKs and relationships clear? | Ambiguous references                                           |
| **Indexes**       | Are required indexes specified?  | Performance-critical queries without indexes                   |
| **Migrations**    | Is migration approach specified? | Schema without migration plan                                  |

#### 2c. Queue/Job Work

| Check                | Question                                     | Red Flag                               |
| -------------------- | -------------------------------------------- | -------------------------------------- |
| **Job Types**        | Are all job types listed?                    | "Add queue" without job specifications |
| **Flow Structure**   | Is parent/child relationship clear?          | Ambiguous dependencies                 |
| **Failure Handling** | Is `failParentOnFailure` behavior specified? | No failure semantics                   |
| **Status Updates**   | Are status transitions documented?           | Unclear when PROCESSING vs COMPLETED   |

---

### Phase 3: Base Class Contract Verification (CRITICAL)

**This catches the most common implementation bugs.**

For each "implement X extending Y" instruction:

#### 3a. Identify Base Class

```
Plan says: "Implement FeatureRepo following AbstractRepository pattern"
Base class: AbstractRepository
```

#### 3b. List ALL Abstract Methods

```bash
# Verify what methods the base class requires
grep -n "abstract" src/repositories/abstract-repo.ts
```

#### 3c. Check Plan Coverage

| Abstract Method  | In Plan? | Implementation Detail? | Reference? |
| ---------------- | -------- | ---------------------- | ---------- |
| `getById`        | ✅/❌    | ✅/❌                  | ✅/❌      |
| `updateStatus`   | ✅/❌    | ✅/❌                  | ✅/❌      |
| `upsertAnalysis` | ✅/❌    | ✅/❌                  | ✅/❌      |

#### 3d. Required Plan Detail

For EACH abstract method, plan should specify:

```markdown
Implement `upsertAnalysis(id, output)`:

- Purpose: Store analysis results
- Pattern: Varies by report type
- Reference: See specific repo implementation
```

**Red Flags**:

- ❌ "Implement repositories following existing pattern" (which methods? which pattern?)
- ❌ Only new domain methods listed (inherited methods forgotten)
- ❌ No reference files for inherited method implementations
- ❌ No explanation of non-obvious parameter semantics

---

### Phase 4: Gap Analysis

#### 4a. Spec → Plan Traceability

| Acceptance Criteria | Plan Ticket/Step | Gap?  |
| ------------------- | ---------------- | ----- |
| AC1                 | MF-01, step 2    | ✅/❌ |
| AC2                 | MF-03, step 1    | ✅/❌ |
| ...                 | ...              | ...   |

#### 4b. Tech Approach → Plan Traceability

| Tech Approach Section | Plan Coverage | Gap?  |
| --------------------- | ------------- | ----- |
| Database Schema       | MF-01         | ✅/❌ |
| Queue Structure       | MF-03         | ✅/❌ |
| ...                   | ...           | ...   |

#### 4c. Pattern Consistency

Compare against existing implementations:

| Existing Repo       | Pattern              | Plan Matches? | Gap? |
| ------------------- | -------------------- | ------------- | ---- |
| feature-repo-a.ts   | attachment table     | ✅/❌         | ...  |
| feature-repo-b.ts   | attachment table     | ✅/❌         | ...  |
| feature-repo-c.ts   | attachment table     | ✅/❌         | ...  |

---

### Phase 5: Ambiguity Detection

Scan for phrases that leave room for incorrect interpretation:

| Ambiguous Phrase          | Problem                      | Required Clarification        |
| ------------------------- | ---------------------------- | ----------------------------- |
| "follow existing pattern" | Which pattern? Which file?   | Specify exact file and method |
| "implement repository"    | Which methods?               | List all methods explicitly   |
| "store attachments"       | Which table? What format?    | Specify table and data format |
| "extend AbstractX"        | What does AbstractX require? | List all abstract methods     |
| "similar to Y feature"    | What aspects of Y?           | Specify exactly what to copy  |

---

## Review Checklist

### Tech Approach Alignment

- [ ] All tech approach decisions reflected in plan
- [ ] No unexplained deviations from tech approach
- [ ] Open questions from tech approach are resolved or explicitly deferred

### Implementation Detail

- [ ] Each ticket has step-by-step instructions
- [ ] No ambiguous "follow pattern" phrases without specifics
- [ ] Reference files provided for non-obvious implementations
- [ ] SQL/schema provided for database work
- [ ] Job structure specified for queue work

### Base Class Contracts (CRITICAL)

- [ ] All base classes being extended are identified
- [ ] ALL abstract methods are listed explicitly
- [ ] Implementation pattern specified for each inherited method
- [ ] Reference file provided for each inherited method
- [ ] Non-obvious parameter semantics explained

### Traceability

- [ ] All acceptance criteria traceable to plan steps
- [ ] All tech approach sections covered by plan
- [ ] Pattern consistency verified against existing code

### Test Coverage

- [ ] Test requirements specified per ticket
- [ ] Edge cases identified
- [ ] Integration test approach specified

---

## Review Output Template

```markdown
## Plan Review: [Document Name]

**Reviewer**: [Name]
**Date**: [Date]
**Verdict**: ✅ Approved / ⚠️ Revisions Needed / ❌ Major Gaps

### Summary

[1-2 sentence summary]

### Critical Gaps (Block Implementation)

1. **[Ticket] - [Issue]**
   - Problem: [What's missing/wrong]
   - Impact: [What will go wrong during implementation]
   - Fix: [Specific addition/change needed]

### Important Gaps (Should Fix)

1. **[Ticket] - [Issue]**
   - Problem: ...
   - Fix: ...

### Base Class Contract Gaps

| Class Extended       | Methods Missing from Plan |
| -------------------- | ------------------------- |
| `AbstractRepository` | `upsertAnalysis`          |

### Ambiguous Instructions

| Ticket | Phrase                                 | Clarification Needed                                    |
| ------ | -------------------------------------- | ------------------------------------------------------- |
| MF-01  | "following AbstractRepository pattern" | List all abstract methods with implementation details |

### Recommendations

1. Add section to MF-01 listing all AbstractRepository methods with implementation patterns
2. Include reference to a similar repo for attachment handling
3. Add note clarifying `attachment` parameter contains text, not file IDs
```

---

## Common Review Findings

### 1. Missing Inherited Method Documentation

**Problem**: Plan says "implement FeatureRepo extending AbstractRepository" but only lists new domain methods, forgetting inherited abstract methods.

**Impact**: Implementer guesses at implementation, uses wrong table/pattern.

**Fix**: Add explicit section listing ALL abstract methods with implementation patterns.

### 2. "Follow Pattern" Without Specifics

**Problem**: "Implement repository following existing pattern"

**Impact**: Which pattern? Which file? Implementer may pick wrong example.

**Fix**: "Implement repository following `feature-repo-a.ts`. Required methods: [list]. See lines 45-80 for getById."

### 3. Missing Table References

**Problem**: Plan mentions storing data but doesn't specify which table.

**Impact**: Implementer creates new table or uses wrong existing table.

**Fix**: Explicitly name table for each storage operation.

---

## Integration with Other Reviews

- **Prerequisite**: Tech approach must be reviewed and approved first
- **Feeds Into**: Code review (implementation should match plan)
- **Cross-Reference**: `agents/review-tech-approach.md` for tech approach review

---

## Maintenance

- **Update when**: New patterns established, common issues discovered
- **Ownership**: Tech leads
- **Feedback loop**: When implementation bugs trace back to plan gaps, add to "Common Review Findings"
