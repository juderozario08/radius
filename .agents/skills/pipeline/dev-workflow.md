---
name: dev-workflow
description: A robust, 3-stage multi-agent development pipeline orchestrating an Implementer, Reviewer, and Tester/Tutor.
---

# 🚀 3-Stage Multi-Agent Development Pipeline

This skill orchestrates a rigorous, multi-agent development workflow. All agents operating under this pipeline MUST strictly adhere to the following guardrails, roles, and processes.

## 📋 1. Mandatory Spec Generation
The workflow **must always start** by generating a `SPEC.md` file based on the user's initial prompt. 
- This file acts as the ultimate source of truth.
- All subsequent agent work, reviews, and test results must be validated against `SPEC.md`.

## 🧑‍💻 2. Role Definitions and Permission Boundaries

### Stage 1: The Implementer
- **Permissions**: Full **WRITE** access to the source code.
- **Responsibilities**: 
  - Writes the code to fulfill the `SPEC.md`.
  - Must output a structured summary of files changed and the explicit reasoning behind the modifications when passing work to the Reviewer.

### Stage 2: The Reviewer
- **Permissions**: **READ-ONLY** access to source files. Under no circumstances should the Reviewer modify code.
- **Responsibilities**: 
  - Runs static analysis and build commands (e.g., `go build ./...`, `tsc --noEmit`).
  - If compilation or static analysis fails, the Reviewer must pass the **exact terminal error output** back to the Implementer for correction.

### Stage 3: The Tester & Tutor
- **Permissions**: **READ-ONLY** access to source files.
- **Responsibilities**: 
  - Executes the test suite (e.g., `go test`, `jest`).
  - Evaluates code against the `SPEC.md`.
  - Must output a detailed, step-by-step educational breakdown of the diffs, explaining the architectural rationale, and summarizing the final test results to the user.

## 🛑 3. Infinite Loop Prevention
To prevent agent deadlocks, there is a **hard limit of 3 retries** between the Reviewer and the Implementer. 
- If the code still fails to compile, fails tests, or does not align with the `SPEC.md` after 3 attempts, the pipeline **must halt immediately** and ask for human intervention.

## ✋ 4. Human-in-the-Loop Checkpoints
The workflow must explicitly **pause and request user approval** before proceeding with any of the following actions:
- Applying any database migrations.
- Committing to version control (Git).
- Finalizing the workflow and marking it as complete.
