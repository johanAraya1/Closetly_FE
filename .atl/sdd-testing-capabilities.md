# Testing Capabilities — Closetly FE

**Strict TDD Mode**: ❌ Disabled
**Detected**: 2026-06-04
**Rationale**: No test runner, test framework, or test files found in the FE project. Must evaluate and set up before TDD can be enabled.

---

## Test Runner

- **Command**: None
- **Framework**: None
- **Status**: ❌ Not configured

## Test Layers

| Layer | Available | Tool | Notes |
|---|---|---|---|
| Unit | ❌ | — | No test framework installed |
| Integration | ❌ | — | No test framework installed |
| E2E | ❌ | — | No E2E tool detected |

## Coverage

- **Available**: ❌
- **Command**: —

## Quality Tools

| Tool | Available | Command | Config File |
|---|---|---|---|
| Linter | ⚠️ Partial | `eslint .` | ❌ No `.eslintrc*` found (relies on defaults) |
| Type checker | ✅ | `tsc --noEmit` | `tsconfig.json` (strict: true) |
| Formatter | ❌ | — | No prettier or other formatter detected |

## Installed Dev Dependencies (relevant)

```
eslint ^8.56.0
@typescript-eslint/eslint-plugin ^6.15.0
@typescript-eslint/parser ^6.15.0
typescript ^5.3.3
```

## No Test Dependencies Found

- No `jest`, `vitest`, `react-native-testing-library`, `@testing-library/react-native`
- No `jest.config.*`, `vitest.config.*`
- No `__tests__/` directories
- No `*.spec.*` or `*.test.*` files

---

## Backend Testing (for reference — separate repo)

| Aspect | Status |
|---|---|
| Test runner | ✅ Jest 29.7 with ts-jest |
| Coverage | ✅ `jest --coverage` configured |
| E2E | ✅ Config at `test/jest-e2e.json` |
| Spec files | 1 found: `get-garments.use-case.spec.ts` |
| Mocking | Manual Jest mocks |

## Recommendations for FE Testing

1. **Immediate**: Install `jest` + `@testing-library/react-native` + `jest-expo`
2. **Recommended framework**: jest-expo (Expo's Jest preset) + @testing-library/react-native
3. **Coverage**: jest-expo supports `--coverage` via Istanbul
4. **Linter**: Create `.eslintrc.js` with proper config
5. **Formatter**: Add `prettier` for consistent formatting
