---
name: expo-rn-workflow
description: >-
  Use this skill when developing or modifying React Native components, screens, 
  styling, or Expo router navigation in radius-frontend.
---

# Expo React Native Frontend Workflow

This skill guides development in the `radius-frontend` codebase adhering to project rules and Expo v54 standards.

## 🚨 Critical Constraints
1. **Expo Version**: Expo v54 (`expo-router`, React Native 0.76+).
2. **State Management**: Use React state / Context (`radius-frontend/src/context/`) and basic `fetch`. Do **not** install external state libraries (Zustand, Redux, React Query) unless explicitly requested.
3. **DRY Theming**: Never hardcode colors or spacing. Use:
   - `radius-frontend/src/constants/colors.ts`
   - `radius-frontend/src/constants/styles.ts`
4. **Component Reuse**: Check `radius-frontend/src/components/` first before building new UI primitives.

## 📂 Frontend Structure
- `radius-frontend/app/`: File-based routing with `expo-router`.
- `radius-frontend/src/components/`: Reusable UI components (buttons, cards, inputs, modals).
- `radius-frontend/src/api/`: API fetch calls and client helpers.
- `radius-frontend/src/types/`: TypeScript type definitions.
- `radius-frontend/src/constants/`: Colors, typography, and layout constants.
- `radius-frontend/src/hooks/`: Custom React hooks.

## 🛠️ Step-by-Step Development Checklist

1. **Check Existing Components & Styles**:
   - Inspect `radius-frontend/src/components/` for buttons, headers, or list items that match your UI need.
   - Import colors from `src/constants/colors.ts` (e.g. `Colors.primary`, `Colors.background`).

2. **Define TypeScript Types**:
   - Add/update domain interfaces in `radius-frontend/src/types/` before implementing screens.

3. **Implement Screen / Route**:
   - Create route files inside `radius-frontend/app/`.
   - Use standard `StyleSheet.create({})`.

4. **Verify TypeScript & Linting**:
   ```bash
   cd radius-frontend && npx tsc --noEmit
   ```
