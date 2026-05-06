/**
 * Sparse correlation matrix for the NewCo AI Capability Baseline.
 *
 * Format: CORRELATION_MATRIX[sourceIndicatorId][targetIndicatorId] = r
 *   - Positive r means co-movement; negative r means inverse relationship.
 *   - Only non-zero, non-self entries are present.
 *   - All r values are rounded to 2 decimal places.
 *   - Wildcard rows from SKILL.md section 12 have been expanded to individual indicators.
 *   - Where a wildcard expansion conflicts with an explicit entry, the higher |r| is kept.
 *   - Correlations may be asymmetric: A -> B does not imply B -> A.
 */
export const CORRELATION_MATRIX: Record<string, Record<string, number>> = {
  "technical.memory_retrieval.embeddings": {
    "technical.memory_retrieval.rag": 0.8,
  },
  "technical.memory_retrieval.rag": {
    "technical.memory_retrieval.embeddings": 0.8,
  },
  "operational.mcp_integrations.mcp_server_use": {
    "technical.tool_use.mcp": 0.8,
    "technical.tool_use.function_calling": 0.8,
    "technical.tool_use.agentic_patterns": 0.85,
    "operational.mcp_integrations.connector_configuration": 0.85,
    "operational.mcp_integrations.custom_integration": 0.85,
    "operational.apis.direct_api_use": 0.85,
  },
  "behavioral.description.iterates_and_refines": {
    "behavioral.description.provides_context": 0.75,
    "behavioral.description.specifies_format": 0.75,
    "behavioral.discernment.questions_reasoning": 0.4,
    "behavioral.discernment.identifies_missing_context": 0.4,
    "behavioral.discernment.checks_facts": 0.4,
    // Wildcard: behavioral.delegation.* at +0.5
    "behavioral.delegation.sets_explicit_goals": 0.5,
    "behavioral.delegation.decides_task_fit": 0.5,
    "behavioral.delegation.sets_collaboration_terms": 0.5,
    // Wildcard: behavioral.diligence.* at +0.5
    "behavioral.diligence.verifies_before_sharing": 0.5,
    "behavioral.diligence.attributes_honestly": 0.5,
    "behavioral.diligence.considers_downstream": 0.5,
    // Wildcard: behavioral.governance.* at +0.5
    "behavioral.governance.routes_data_correctly": 0.5,
    "behavioral.governance.recognises_confidentiality_posture": 0.5,
    "behavioral.governance.documents_ai_use": 0.5,
    // Wildcard: behavioral.composition.* at +0.5
    "behavioral.composition.configures_own_variant": 0.5,
    "behavioral.composition.wires_multi_step_workflows": 0.5,
    "behavioral.composition.orchestrates_across_tools": 0.5,
    // Wildcard: behavioral.multiplier.* at +0.5
    "behavioral.multiplier.teaches_colleagues": 0.5,
    "behavioral.multiplier.shares_prompts_tools": 0.5,
    "behavioral.multiplier.surfaces_edge_cases": 0.5,
  },
  "behavioral.composition.configures_own_variant": {
    "technical.prompting.system_vs_user_roles": 0.7,
    "behavioral.composition.wires_multi_step_workflows": 0.7,
    "behavioral.composition.orchestrates_across_tools": 0.7,
  },
  "operational.ai_code.production_shipped": {
    "operational.cli_tooling.terminal": 0.75,
    "operational.cli_tooling.version_control": 0.75,
    "operational.cli_tooling.ai_native_dev_tools": 0.75,
    "operational.apis.direct_api_use": 0.75,
    "operational.apis.cost_and_rate_awareness": 0.75,
    "operational.apis.error_handling": 0.75,
    "operational.ai_code.code_generation": 0.75,
    "operational.ai_code.code_review": 0.75,
  },
  "operational.deployment.eval_pipelines": {
    "technical.evals.eval_frameworks": 0.8,
    "technical.evals.production_measurement": 0.8,
  },
  "behavioral.discernment.questions_reasoning": {
    "behavioral.diligence.verifies_before_sharing": 0.5,
    "behavioral.diligence.attributes_honestly": 0.5,
    "behavioral.diligence.considers_downstream": 0.5,
  },
  "behavioral.discernment.identifies_missing_context": {
    "behavioral.diligence.verifies_before_sharing": 0.5,
    "behavioral.diligence.attributes_honestly": 0.5,
    "behavioral.diligence.considers_downstream": 0.5,
  },
  "behavioral.discernment.checks_facts": {
    "behavioral.diligence.verifies_before_sharing": 0.5,
    "behavioral.diligence.attributes_honestly": 0.5,
    "behavioral.diligence.considers_downstream": 0.5,
  },
  "behavioral.composition.wires_multi_step_workflows": {
    "behavioral.composition.configures_own_variant": 0.5,
    "behavioral.composition.orchestrates_across_tools": 0.5,
  },
  "behavioral.composition.orchestrates_across_tools": {
    "behavioral.composition.configures_own_variant": 0.5,
    "behavioral.composition.wires_multi_step_workflows": 0.5,
  },
  "behavioral.multiplier.teaches_colleagues": {
    "behavioral.composition.configures_own_variant": 0.5,
    "behavioral.composition.wires_multi_step_workflows": 0.5,
    "behavioral.composition.orchestrates_across_tools": 0.5,
    // Wildcard: behavioral.delegation.* at +0.4
    "behavioral.delegation.sets_explicit_goals": 0.4,
    "behavioral.delegation.decides_task_fit": 0.4,
    "behavioral.delegation.sets_collaboration_terms": 0.4,
    // Wildcard: behavioral.description.* at +0.4
    "behavioral.description.provides_context": 0.4,
    "behavioral.description.iterates_and_refines": 0.4,
    "behavioral.description.specifies_format": 0.4,
    // Wildcard: behavioral.discernment.* at +0.4
    "behavioral.discernment.questions_reasoning": 0.4,
    "behavioral.discernment.identifies_missing_context": 0.4,
    "behavioral.discernment.checks_facts": 0.4,
  },
  "behavioral.multiplier.shares_prompts_tools": {
    "behavioral.composition.configures_own_variant": 0.5,
    "behavioral.composition.wires_multi_step_workflows": 0.5,
    "behavioral.composition.orchestrates_across_tools": 0.5,
  },
  "behavioral.multiplier.surfaces_edge_cases": {
    "behavioral.composition.configures_own_variant": 0.5,
    "behavioral.composition.wires_multi_step_workflows": 0.5,
    "behavioral.composition.orchestrates_across_tools": 0.5,
  },
  "operational.apis.direct_api_use": {
    "operational.apis.cost_and_rate_awareness": 0.5,
    "operational.apis.error_handling": 0.5,
    "operational.cli_tooling.terminal": 0.5,
  },
  "operational.mcp_integrations.custom_integration": {
    "technical.tool_use.function_calling": 0.8,
    "operational.apis.direct_api_use": 0.8,
  },
  "technical.model_fundamentals.tokenisation_and_context": {
    "technical.memory_retrieval.kv_cache": 0.9,
    "technical.model_fundamentals.training_vs_inference": 0.4,
    "technical.model_fundamentals.probabilistic_generation": 0.4,
    // Wildcard: technical.prompting.* at +0.4
    "technical.prompting.system_vs_user_roles": 0.4,
    "technical.prompting.few_shot_and_cot": 0.4,
    "technical.prompting.structured_outputs": 0.4,
    // Wildcard: technical.memory_retrieval.* at +0.4
    // kv_cache already has explicit +0.9 which is higher than +0.4, so kept at 0.9
    "technical.memory_retrieval.embeddings": 0.4,
    "technical.memory_retrieval.rag": 0.4,
  },
  "operational.cli_tooling.terminal": {
    "operational.cli_tooling.version_control": 0.6,
    // Wildcard: operational.apis.* at +0.6
    "operational.apis.direct_api_use": 0.6,
    "operational.apis.cost_and_rate_awareness": 0.6,
    "operational.apis.error_handling": 0.6,
  },
};
