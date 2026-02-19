# Skill Injection System Specification

## Overview

Sistema de Injeção Explícita de Skills para arquitetura de orquestração hierárquica de agents.

- **Primary Agent**: Nunca executa código diretamente. Orquestra sub-agents.
- **Sub-agents**: Operam apenas através de skills explicitamente injetadas.
- **Skills**: Definem capabilities, permissões de tools, protocolos de execução e constraints.

---

## Requisitos Arquiteturais

### 1. Skill Definition Model

Cada Skill deve definir:

```typescript
interface Skill {
  name: string;
  description: string;
  version?: string;
  allowed_tools: string[];
  forbidden_tools?: string[];
  execution_protocol: string[];
  preconditions?: string[];
  postconditions?: string[];
  output_contract?: OutputContract;
  compatibility_rules?: CompatibilityRule[];
  composability_rules?: ComposabilityRule[];
}
```

**Regras:**

- Skills NÃO concedem permissões implícitas.
- Todas as permissões devem ser explícitas.

---

### 2. Skill Registry

**Requisitos:**

- Registrar skills
- Recuperar skill por nome
- Validar compatibilidade entre skills
- Prevenir permissões conflitantes de tools
- Suportar composição dinâmica de skills
- Versionamento de skills

**Métodos públicos:**

```typescript
interface SkillRegistry {
  registerSkill(skill: Skill): void;
  getSkill(name: string): Skill | undefined;
  validateSkillSet(skillList: string[]): ValidationResult;
  composeSkills(skillList: string[]): ComposedSkill;
  listAvailableSkills(): Skill[];
  overrideSkillVersion(name: string, version: string): void;
}
```

---

### 3. Context-Aware Skill Selection Engine

**Input:**

- Task description
- Task metadata (opcional)
- Risk level
- Domain type
- Coding flag (boolean)

**Output:**

- Lista de skills requeridas

**Regras:**

- Detectar tarefas de coding automaticamente
- Quando `coding=true`, incluir automaticamente:
  - `specification-engine`
  - `opencode-implementer`
- Permitir múltiplas skills non-coding
- Prevenir pipeline de coding incompleto

---

### 4. Subagent Spawn Protocol

Modificar `sessions_spawn` para suportar:

```typescript
sessions_spawn({
  task: "Refactor API",
  skills: ["specification-engine", "opencode-implementer", "architecture-skill"],
});
```

**Enforcement:**

- Sub-agent recebe SOMENTE tools permitidas pelas skills injetadas
- Qualquer tool fora de `allowed_tools` é bloqueada
- Skill faltando → spawn rejeitado
- Combinação incompatível → spawn rejeitado

---

### 5. Skill Injection Rules

1. **Nenhum sub-agent pode existir sem skills explícitas** (ou usa fluxo sem skill)
2. Skills devem definir ferramentas permitidas
3. Tools não na lista `allowed` são proibidas
4. Skills de coding devem sempre incluir:
   - `specification-engine`
   - `opencode-implementer`
5. Spec deve rodar antes do OpenCode
6. **Sem ferramentas write/edit diretas para coding**

---

### 6. Coding Skill Definitions

#### specification-engine

```typescript
const specificationEngine: Skill = {
  name: "specification-engine",
  description: "Produz especificações estruturadas antes de implementação",
  allowed_tools: ["specKit"],
  execution_protocol: [
    "Produzir especificação estruturada",
    "Incluir critérios de aceite",
    "Incluir constraints",
    "Deve completar antes da implementação",
  ],
  composability_rules: [{ with: "opencode-implementer", required: true }],
};
```

#### opencode-implementer

```typescript
const opencodeImplementer: Skill = {
  name: "opencode-implementer",
  description: "Executa implementação via OpenCode CLI",
  allowed_tools: ["opencode"],
  forbidden_tools: ["write", "edit"],
  execution_protocol: ["Usar: opencode run '<instrução>'", "Sem escrita inline direta de código"],
  composability_rules: [{ with: "specification-engine", required: true }],
};
```

**Regras de Compatibilidade:**

- `specification-engine` e `opencode-implementer` devem ser usadas juntas
- Não podem operar sozinhas em tarefas de coding

---

### 7. Skill Conflict Resolution

**Exemplos de conflitos:**

- Skill A permite `write` tool
- Skill B proíbe `write` tool

**Estratégia de resolução:**

- **Mais restritivo wins**: Se qualquer skill proibir uma tool, ela fica proibida
- OU rejeitar combinação incompatível

**Regra deve ser explícita no código.**

---

### 8. Security Layer

- **Modelo de privilégio mínimo**
- Sem herança implícita
- Sem escalação de skill
- Sem auto-grant de tools
- Primary agent não pode injetar direitos de execução em si mesmo

---

### 9. Validation Layer

Antes do spawn, executar `validateSkillSet(skillList)`:

**Verificações:**

- Compatibilidade entre skills
- Conflitos de tools
- Pares de skills obrigatórios faltando
- Violações de pipeline
- Skills redundantes

**Resultado:**

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}
```

---

### 10. Extensibilidade

Sistema deve permitir:

- `registerSkill(newSkill)` — registrar nova skill
- `overrideSkillVersion(name, version)` — sobrescrever versão
- `listAvailableSkills()` — listar skills disponíveis
- `composeAdHocSkillSet(skillList)` — compor conjuntoadhoc

---

## Decisões de Implementação

### Retrocompatibilidade

- Sistema atual de skills (em `~/.openclaw/skills/`) coexiste com novo sistema
- `sessions_spawn` sem parâmetro `skills` continua funcionando
- Se não houver skill para a task, executa sem skill (comportamento atual)

### Localização

- Código no fork OpenClaw: `/root/.openclaw/workspace/openclaw-fork/`
- Skill definitions em arquivo dedicado: `src/agents/skills/`

### Prioridade de Implementação

1. **Skill Interface + Registry** — base de tudo
2. **Context-based skill selector** — detecta coding vs non-coding
3. **Modificar sessions_spawn** — adicionar parâmetro `skills`
4. **SpecKit + OpenCode skills** — as coding skills obrigatórias
5. **Validation layer** — validar combinações
6. **Conflict resolution** — se tiver tempo

---

## Exemplos de Uso

### Tarefa de Coding

```typescript
sessions_spawn({
  task: "Refatorar API e melhorar performance",
  skills: ["specification-engine", "opencode-implementer"],
});
```

**Enforcement:**

```
Spec → OpenCode → Validate
```

### Tarefa Non-Coding

```typescript
sessions_spawn({
  task: "Pesquisar frameworks de IA",
  skills: ["web-search", "research-skill"],
});
```

### Múltiplas Skills

```typescript
sessions_spawn({
  task: "Criar especificação e implementar API",
  skills: ["specification-engine", "opencode-implementer", "typescript-pro"],
});
```

---

## Deliverables

1. ✅ Skill interface definition
2. ✅ Skill registry implementation
3. ✅ Context-based skill selector
4. ✅ Skill validation engine
5. ✅ Modified spawn wrapper
6. ✅ Exemplo skill definitions
7. ✅ Exemplo multi-skill injection
8. ✅ Exemplo coding task injection
9. ✅ Conflict scenario example

---

## Arquivos a Criar/Modificar

### Novos Arquivos

- `src/agents/skills/types.ts` — Skill interface
- `src/agents/skills/registry.ts` — Skill Registry
- `src/agents/skills/selector.ts` — Context-aware selector
- `src/agents/skills/validation.ts` — Validation layer
- `src/agents/skills/definitions/coding.ts` — Coding skills
- `src/agents/skills/definitions/index.ts` — Exports

### Arquivos a Modificar

- `src/agents/tools/sessions-spawn-tool.ts` — adicionar parâmetro `skills`
- `src/agents/subagent-spawn.ts` — passar skills para sub-agent

---

## Notes

- Tests formais ficam para fase posterior
- Skills existentes em `~/.openclaw/skills/` podem ser portadas futuramente
- Sistema de criação de skills sob demanda fica para próxima iteração
