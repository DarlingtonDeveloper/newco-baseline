import type { ProbeDefinition } from "./types.js";

// ---------------------------------------------------------------------------
// Probe library — one probe per indicator (51 total)
// Extracted from SKILL.md section 11.
// ---------------------------------------------------------------------------

export const PROBE_LIBRARY: ProbeDefinition[] = [
  // ── Behavioral Fluency ────────────────────────────────────────────────

  // Delegation
  {
    probe_id: "behavioral.delegation.sets_explicit_goals_primary",
    indicator_id: "behavioral.delegation.sets_explicit_goals",
    text: "What's something you've deliberately decided NOT to use AI for in the last month? Why?",
    backup_text: "Walk me through the last AI-assisted task you started — what did you want to achieve before you started typing?",
    target_indicators: {
      "behavioral.delegation.sets_explicit_goals": 1.0,
      "behavioral.delegation.decides_task_fit": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "behavioral.delegation.decides_task_fit_primary",
    indicator_id: "behavioral.delegation.decides_task_fit",
    text: "Where does AI help most in your work, and where does it actively get in the way?",
    backup_text: "What's the worst AI output you've gotten in the last week? What was the task?",
    target_indicators: {
      "behavioral.delegation.decides_task_fit": 1.0,
      "behavioral.delegation.sets_explicit_goals": 0.5,
      "behavioral.discernment.questions_reasoning": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "behavioral.delegation.sets_collaboration_terms_primary",
    indicator_id: "behavioral.delegation.sets_collaboration_terms",
    text: "When you start a new AI conversation, what do you tell it before asking your actual question?",
    backup_text: "Has setting a role for AI ever changed the output meaningfully? What was the case?",
    target_indicators: {
      "behavioral.delegation.sets_collaboration_terms": 1.0,
      "behavioral.description.provides_context": 0.5,
      "technical.prompting.system_vs_user_roles": 0.5,
    },
    expected_minutes: 1.0,
  },

  // Description
  {
    probe_id: "behavioral.description.provides_context_primary",
    indicator_id: "behavioral.description.provides_context",
    text: "Walk me through the last AI prompt you wrote that got you what you needed first try. What did you put in it?",
    backup_text: "When you've gotten a useless response, what did you have to add?",
    target_indicators: {
      "behavioral.description.provides_context": 1.0,
      "behavioral.delegation.sets_collaboration_terms": 0.5,
      "behavioral.description.specifies_format": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "behavioral.description.iterates_and_refines_primary",
    indicator_id: "behavioral.description.iterates_and_refines",
    text: "Last time AI didn't give you what you wanted, what did you do?",
    backup_text: "What's your typical response when a first answer is close but not right?",
    target_indicators: {
      "behavioral.description.iterates_and_refines": 1.0,
      "behavioral.description.provides_context": 0.5,
      "behavioral.description.specifies_format": 0.5,
      "behavioral.discernment.questions_reasoning": 0.5,
      "behavioral.discernment.identifies_missing_context": 0.5,
      "behavioral.discernment.checks_facts": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "behavioral.description.specifies_format_primary",
    indicator_id: "behavioral.description.specifies_format",
    text: "Have you ever given AI an example of what you wanted before asking?",
    backup_text: "Do you ever ask for specific output formats? When?",
    target_indicators: {
      "behavioral.description.specifies_format": 1.0,
      "technical.prompting.few_shot_and_cot": 0.5,
      "technical.prompting.structured_outputs": 0.5,
    },
    expected_minutes: 1.0,
  },

  // Discernment
  {
    probe_id: "behavioral.discernment.questions_reasoning_primary",
    indicator_id: "behavioral.discernment.questions_reasoning",
    text: "Have you ever told AI it was wrong about something? What happened?",
    backup_text: "Do you ever push back on AI's reasoning, or do you tend to take what it gives?",
    target_indicators: {
      "behavioral.discernment.questions_reasoning": 1.0,
      "behavioral.discernment.identifies_missing_context": 0.5,
      "behavioral.discernment.checks_facts": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "behavioral.discernment.identifies_missing_context_primary",
    indicator_id: "behavioral.discernment.identifies_missing_context",
    text: "Tell me about a time AI gave you an answer that was technically correct but missed something important.",
    backup_text: "Have you ever realised an AI answer was missing context only after using it?",
    target_indicators: {
      "behavioral.discernment.identifies_missing_context": 1.0,
      "behavioral.discernment.questions_reasoning": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "behavioral.discernment.checks_facts_primary",
    indicator_id: "behavioral.discernment.checks_facts",
    text: "For your most recent AI-assisted piece of real work, what did you check before sending or relying on it?",
    backup_text: "How do you decide whether to verify AI output?",
    target_indicators: {
      "behavioral.discernment.checks_facts": 1.0,
      "behavioral.diligence.verifies_before_sharing": 0.5,
    },
    expected_minutes: 1.0,
  },

  // Diligence
  {
    probe_id: "behavioral.diligence.verifies_before_sharing_primary",
    indicator_id: "behavioral.diligence.verifies_before_sharing",
    text: "Has there been a recent piece of work you used AI on that went to a client or external party? What did your final review look like?",
    backup_text: "What's your last step before sending AI-touched work somewhere?",
    target_indicators: {
      "behavioral.diligence.verifies_before_sharing": 1.0,
      "behavioral.discernment.checks_facts": 0.5,
      "behavioral.diligence.considers_downstream": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "behavioral.diligence.attributes_honestly_primary",
    indicator_id: "behavioral.diligence.attributes_honestly",
    text: "When you ship work at your firm where AI helped, do you flag that to your team or to the person who reads the output? Specific recent case?",
    backup_text: "Do you mention AI involvement in your work deliverables? When and to whom?",
    target_indicators: {
      "behavioral.diligence.attributes_honestly": 1.0,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "behavioral.diligence.considers_downstream_primary",
    indicator_id: "behavioral.diligence.considers_downstream",
    text: "Who reads what you produce after you're done with it? Does AI involvement change anything for them?",
    backup_text: "Have you ever decided not to ship something because of AI involvement?",
    target_indicators: {
      "behavioral.diligence.considers_downstream": 1.0,
      "behavioral.governance.routes_data_correctly": 0.5,
    },
    expected_minutes: 1.0,
  },

  // Governance
  {
    probe_id: "behavioral.governance.routes_data_correctly_primary",
    indicator_id: "behavioral.governance.routes_data_correctly",
    text: "Have you ever paused before pasting something into AI on confidentiality grounds? What did you do?",
    backup_text: "Are there things at your firm you wouldn't paste into a public AI tool?",
    target_indicators: {
      "behavioral.governance.routes_data_correctly": 1.0,
      "behavioral.governance.recognises_confidentiality_posture": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "behavioral.governance.recognises_confidentiality_posture_primary",
    indicator_id: "behavioral.governance.recognises_confidentiality_posture",
    text: "Do you know which AI tools are sanctioned for confidential client work at your firm? Which ones are not?",
    backup_text: "What's the difference between consumer ChatGPT and enterprise tools, in your view?",
    target_indicators: {
      "behavioral.governance.recognises_confidentiality_posture": 1.0,
      "behavioral.governance.routes_data_correctly": 0.5,
      "technical.model_fundamentals.training_vs_inference": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "behavioral.governance.documents_ai_use_primary",
    indicator_id: "behavioral.governance.documents_ai_use",
    text: "Are there any types of work at your firm where AI use needs to be documented or flagged?",
    backup_text: "Have you ever documented AI use in a piece of work? When?",
    target_indicators: {
      "behavioral.governance.documents_ai_use": 1.0,
    },
    expected_minutes: 1.0,
  },

  // Composition
  {
    probe_id: "behavioral.composition.configures_own_variant_primary",
    indicator_id: "behavioral.composition.configures_own_variant",
    text: "Have you ever set up saved instructions, a custom GPT, a Project, or any kind of persistent context for AI?",
    backup_text: "Do you have any AI configurations you reuse?",
    target_indicators: {
      "behavioral.composition.configures_own_variant": 1.0,
      "technical.prompting.system_vs_user_roles": 0.5,
      "behavioral.composition.wires_multi_step_workflows": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "behavioral.composition.wires_multi_step_workflows_primary",
    indicator_id: "behavioral.composition.wires_multi_step_workflows",
    text: "Have you ever used AI in multiple steps on one piece of work? Like one output feeding the next?",
    backup_text: "Walk me through a time you used AI for something complicated.",
    target_indicators: {
      "behavioral.composition.wires_multi_step_workflows": 1.0,
      "behavioral.composition.configures_own_variant": 0.5,
      "behavioral.composition.orchestrates_across_tools": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "behavioral.composition.orchestrates_across_tools_primary",
    indicator_id: "behavioral.composition.orchestrates_across_tools",
    text: "Walk me through your AI stack. What tools do you use, in what order, for what?",
    backup_text: "Do you use more than one AI tool? How do they fit together?",
    target_indicators: {
      "behavioral.composition.orchestrates_across_tools": 1.0,
      "behavioral.composition.configures_own_variant": 0.5,
      "behavioral.composition.wires_multi_step_workflows": 0.5,
      "technical.evals.model_selection": 0.5,
    },
    expected_minutes: 1.0,
  },

  // Multiplier
  {
    probe_id: "behavioral.multiplier.teaches_colleagues_primary",
    indicator_id: "behavioral.multiplier.teaches_colleagues",
    text: "Have you ever shown a colleague how to use AI for something specific to their work?",
    backup_text: "Has anyone learned AI from you?",
    target_indicators: {
      "behavioral.multiplier.teaches_colleagues": 1.0,
      "behavioral.multiplier.shares_prompts_tools": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "behavioral.multiplier.shares_prompts_tools_primary",
    indicator_id: "behavioral.multiplier.shares_prompts_tools",
    text: "Are there prompts or patterns you've shared with your team?",
    backup_text: "Do you share AI configurations with anyone?",
    target_indicators: {
      "behavioral.multiplier.shares_prompts_tools": 1.0,
      "behavioral.multiplier.teaches_colleagues": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "behavioral.multiplier.surfaces_edge_cases_primary",
    indicator_id: "behavioral.multiplier.surfaces_edge_cases",
    text: "Last time AI failed in a way that mattered, what did you do beyond fixing it for yourself?",
    backup_text: "Have you ever raised an AI failure mode to anyone — manager, vendor, platform team?",
    target_indicators: {
      "behavioral.multiplier.surfaces_edge_cases": 1.0,
      "behavioral.discernment.questions_reasoning": 0.5,
    },
    expected_minutes: 1.0,
  },

  // ── Technical Understanding ───────────────────────────────────────────

  // Model fundamentals
  {
    probe_id: "technical.model_fundamentals.tokenisation_and_context_primary",
    indicator_id: "technical.model_fundamentals.tokenisation_and_context",
    text: "In your own words — what's a context window, and why does it matter?",
    backup_text: "What happens when you paste a really long document into AI?",
    target_indicators: {
      "technical.model_fundamentals.tokenisation_and_context": 1.0,
      "technical.memory_retrieval.rag": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "technical.model_fundamentals.training_vs_inference_primary",
    indicator_id: "technical.model_fundamentals.training_vs_inference",
    text: "How does an AI model 'know' things? What's the difference between what it was trained on and what it does in conversation?",
    backup_text: "Why do AI tools have knowledge cutoffs?",
    target_indicators: {
      "technical.model_fundamentals.training_vs_inference": 1.0,
      "technical.model_fundamentals.probabilistic_generation": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "technical.model_fundamentals.probabilistic_generation_primary",
    indicator_id: "technical.model_fundamentals.probabilistic_generation",
    text: "Why do AI tools sometimes confidently make things up?",
    backup_text: "What does temperature do, in your understanding?",
    target_indicators: {
      "technical.model_fundamentals.probabilistic_generation": 1.0,
      "behavioral.discernment.checks_facts": 0.5,
    },
    expected_minutes: 1.0,
  },

  // Prompting and conditioning
  {
    probe_id: "technical.prompting.system_vs_user_roles_primary",
    indicator_id: "technical.prompting.system_vs_user_roles",
    text: "What's the difference between a system prompt and a user message?",
    backup_text: "Have you ever set up persistent instructions that apply across multiple conversations?",
    target_indicators: {
      "technical.prompting.system_vs_user_roles": 1.0,
      "behavioral.composition.configures_own_variant": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "technical.prompting.few_shot_and_cot_primary",
    indicator_id: "technical.prompting.few_shot_and_cot",
    text: "Have you used few-shot prompting deliberately? What is it and when does it help?",
    backup_text: "Does showing examples in a prompt change the output? Why might it?",
    target_indicators: {
      "technical.prompting.few_shot_and_cot": 1.0,
      "behavioral.description.specifies_format": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "technical.prompting.structured_outputs_primary",
    indicator_id: "technical.prompting.structured_outputs",
    text: "Have you ever had AI output JSON or a specific structured format? How did you make it reliable?",
    backup_text: "When you need AI output to feed into another system, what do you do?",
    target_indicators: {
      "technical.prompting.structured_outputs": 1.0,
      "behavioral.composition.wires_multi_step_workflows": 0.5,
    },
    expected_minutes: 1.0,
  },

  // Memory and retrieval
  {
    probe_id: "technical.memory_retrieval.embeddings_primary",
    indicator_id: "technical.memory_retrieval.embeddings",
    text: "What's an embedding? How does semantic search work?",
    backup_text: "Have you heard of vector search?",
    target_indicators: {
      "technical.memory_retrieval.embeddings": 1.0,
      "technical.memory_retrieval.rag": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "technical.memory_retrieval.rag_primary",
    indicator_id: "technical.memory_retrieval.rag",
    text: "What's RAG and when would you use it?",
    backup_text: "If you wanted AI to answer questions about your firm's documents, how would you set that up?",
    target_indicators: {
      "technical.memory_retrieval.rag": 1.0,
      "technical.memory_retrieval.embeddings": 0.5,
      "technical.model_fundamentals.tokenisation_and_context": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "technical.memory_retrieval.kv_cache_primary",
    indicator_id: "technical.memory_retrieval.kv_cache",
    text: "Have you heard of KV cache or prefix caching? What problem does it solve?",
    backup_text: "Why do some AI APIs have cheaper rates for repeated context?",
    target_indicators: {
      "technical.memory_retrieval.kv_cache": 1.0,
    },
    expected_minutes: 1.0,
  },

  // Tool use and agents
  {
    probe_id: "technical.tool_use.function_calling_primary",
    indicator_id: "technical.tool_use.function_calling",
    text: "Have you used function calling or tool use with an LLM?",
    backup_text: "Can AI take actions, or only output text?",
    target_indicators: {
      "technical.tool_use.function_calling": 1.0,
      "technical.tool_use.mcp": 0.5,
      "technical.tool_use.agentic_patterns": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "technical.tool_use.mcp_primary",
    indicator_id: "technical.tool_use.mcp",
    text: "Have you heard of MCP? What problem does it solve?",
    backup_text: "How do AI tools connect to other systems like calendars, email, or databases?",
    target_indicators: {
      "technical.tool_use.mcp": 1.0,
      "operational.mcp_integrations.mcp_server_use": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "technical.tool_use.agentic_patterns_primary",
    indicator_id: "technical.tool_use.agentic_patterns",
    text: "What's an AI agent, in your understanding? How does it differ from a regular AI conversation?",
    backup_text: "Have you used or built anything that loops AI through multiple decisions automatically?",
    target_indicators: {
      "technical.tool_use.agentic_patterns": 1.0,
      "technical.tool_use.function_calling": 0.5,
    },
    expected_minutes: 1.0,
  },

  // Evals and measurement
  {
    probe_id: "technical.evals.eval_frameworks_primary",
    indicator_id: "technical.evals.eval_frameworks",
    text: "How would you measure whether an AI output is good?",
    backup_text: "Have you heard of AI benchmarks?",
    target_indicators: {
      "technical.evals.eval_frameworks": 1.0,
      "technical.evals.model_selection": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "technical.evals.model_selection_primary",
    indicator_id: "technical.evals.model_selection",
    text: "How would you decide whether to use Sonnet or Opus for a particular task?",
    backup_text: "Do you ever think about which AI model to use? What goes into that?",
    target_indicators: {
      "technical.evals.model_selection": 1.0,
      "operational.apis.cost_and_rate_awareness": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "technical.evals.production_measurement_primary",
    indicator_id: "technical.evals.production_measurement",
    text: "How would you know an AI feature in production was working correctly?",
    backup_text: "What's different about running AI in production vs. testing it?",
    target_indicators: {
      "technical.evals.production_measurement": 1.0,
      "operational.deployment.eval_pipelines": 0.5,
    },
    expected_minutes: 1.0,
  },

  // ── Operational Deployment ────────────────────────────────────────────

  // CLI and developer tooling
  {
    probe_id: "operational.cli_tooling.terminal_primary",
    indicator_id: "operational.cli_tooling.terminal",
    text: "Do you use the terminal in your work? What for?",
    backup_text: "What's your relationship with command-line tools?",
    target_indicators: {
      "operational.cli_tooling.terminal": 1.0,
      "operational.cli_tooling.version_control": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "operational.cli_tooling.version_control_primary",
    indicator_id: "operational.cli_tooling.version_control",
    text: "Do you use git? In CLI or through a GUI?",
    backup_text: "How do you manage code or document versions?",
    target_indicators: {
      "operational.cli_tooling.version_control": 1.0,
      "operational.cli_tooling.terminal": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "operational.cli_tooling.ai_native_dev_tools_primary",
    indicator_id: "operational.cli_tooling.ai_native_dev_tools",
    text: "Have you used Claude Code, Cursor, Copilot, or similar AI coding tools at meaningful depth?",
    backup_text: "Do you write code with AI assistance?",
    target_indicators: {
      "operational.cli_tooling.ai_native_dev_tools": 1.0,
      "operational.ai_code.code_generation": 0.5,
    },
    expected_minutes: 1.0,
  },

  // APIs and SDKs
  {
    probe_id: "operational.apis.direct_api_use_primary",
    indicator_id: "operational.apis.direct_api_use",
    text: "Have you ever called the Claude or OpenAI API directly from code? What did you build?",
    backup_text: "Have you used AI through an API rather than a UI?",
    target_indicators: {
      "operational.apis.direct_api_use": 1.0,
      "operational.apis.cost_and_rate_awareness": 0.5,
      "operational.apis.error_handling": 0.5,
      "technical.tool_use.function_calling": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "operational.apis.cost_and_rate_awareness_primary",
    indicator_id: "operational.apis.cost_and_rate_awareness",
    text: "How does AI pricing work, in your understanding?",
    backup_text: "Have you ever hit rate limits or had AI cost more than expected?",
    target_indicators: {
      "operational.apis.cost_and_rate_awareness": 1.0,
      "technical.evals.model_selection": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "operational.apis.error_handling_primary",
    indicator_id: "operational.apis.error_handling",
    text: "When you've built something using an AI API, how do you handle failures?",
    backup_text: "What happens if the AI API goes down for your code?",
    target_indicators: {
      "operational.apis.error_handling": 1.0,
      "operational.deployment.deployment": 0.5,
    },
    expected_minutes: 1.0,
  },

  // MCP and integrations
  {
    probe_id: "operational.mcp_integrations.mcp_server_use_primary",
    indicator_id: "operational.mcp_integrations.mcp_server_use",
    text: "Have you connected an MCP server to your AI tool?",
    backup_text: "Have you set up any custom AI tool integrations?",
    target_indicators: {
      "operational.mcp_integrations.mcp_server_use": 1.0,
      "technical.tool_use.mcp": 0.5,
      "operational.mcp_integrations.connector_configuration": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "operational.mcp_integrations.connector_configuration_primary",
    indicator_id: "operational.mcp_integrations.connector_configuration",
    text: "Have you configured AI connectors for your work tools — email, files, calendar?",
    backup_text: "Have you connected AI to anything beyond chat?",
    target_indicators: {
      "operational.mcp_integrations.connector_configuration": 1.0,
      "operational.mcp_integrations.mcp_server_use": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "operational.mcp_integrations.custom_integration_primary",
    indicator_id: "operational.mcp_integrations.custom_integration",
    text: "Have you ever built a custom integration between AI and another system?",
    backup_text: "Have you wired AI into a workflow that wasn't pre-built?",
    target_indicators: {
      "operational.mcp_integrations.custom_integration": 1.0,
      "operational.mcp_integrations.mcp_server_use": 0.5,
      "technical.tool_use.function_calling": 0.5,
      "operational.apis.direct_api_use": 0.5,
    },
    expected_minutes: 1.0,
  },

  // AI-assisted code
  {
    probe_id: "operational.ai_code.code_generation_primary",
    indicator_id: "operational.ai_code.code_generation",
    text: "Have you written code using AI assistance that's actually shipped or running somewhere?",
    backup_text: "Do you generate code with AI for real work?",
    target_indicators: {
      "operational.ai_code.code_generation": 1.0,
      "operational.ai_code.code_review": 0.5,
      "operational.ai_code.production_shipped": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "operational.ai_code.code_review_primary",
    indicator_id: "operational.ai_code.code_review",
    text: "Have you used AI to review code? What did it catch?",
    backup_text: "Do you use AI as a second pair of eyes on code?",
    target_indicators: {
      "operational.ai_code.code_review": 1.0,
      "behavioral.discernment.questions_reasoning": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "operational.ai_code.production_shipped_primary",
    indicator_id: "operational.ai_code.production_shipped",
    text: "Have you shipped AI-generated code to production or operational use?",
    backup_text: "Is there code you wrote with AI that's currently running for real users?",
    target_indicators: {
      "operational.ai_code.production_shipped": 1.0,
      "operational.ai_code.code_generation": 0.5,
      "operational.deployment.deployment": 0.5,
    },
    expected_minutes: 1.0,
  },

  // Deployment and observability
  {
    probe_id: "operational.deployment.deployment_primary",
    indicator_id: "operational.deployment.deployment",
    text: "Have you deployed an AI-powered thing that other people use?",
    backup_text: "Have you put AI behind a service, API, or app?",
    target_indicators: {
      "operational.deployment.deployment": 1.0,
      "operational.deployment.cost_latency_monitoring": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "operational.deployment.cost_latency_monitoring_primary",
    indicator_id: "operational.deployment.cost_latency_monitoring",
    text: "When AI runs in production, how do you watch costs and latency?",
    backup_text: "Have you ever optimised an AI system for cost or speed?",
    target_indicators: {
      "operational.deployment.cost_latency_monitoring": 1.0,
      "operational.apis.cost_and_rate_awareness": 0.5,
    },
    expected_minutes: 1.0,
  },
  {
    probe_id: "operational.deployment.eval_pipelines_primary",
    indicator_id: "operational.deployment.eval_pipelines",
    text: "Have you set up evals that catch when AI behavior regresses?",
    backup_text: "How do you know an AI feature is still working a month after launch?",
    target_indicators: {
      "operational.deployment.eval_pipelines": 1.0,
      "technical.evals.eval_frameworks": 0.5,
      "technical.evals.production_measurement": 0.5,
    },
    expected_minutes: 1.0,
  },
];

// ---------------------------------------------------------------------------
// Indicator importance weights
// ---------------------------------------------------------------------------

export const INDICATOR_IMPORTANCE: Record<string, number> = {
  "behavioral.delegation.sets_explicit_goals": 1.0,
  "behavioral.delegation.decides_task_fit": 1.0,
  "behavioral.delegation.sets_collaboration_terms": 1.0,
  "behavioral.description.provides_context": 1.0,
  "behavioral.description.iterates_and_refines": 2.0, // master signal
  "behavioral.description.specifies_format": 1.0,
  "behavioral.discernment.questions_reasoning": 1.0,
  "behavioral.discernment.identifies_missing_context": 1.0,
  "behavioral.discernment.checks_facts": 1.0,
  "behavioral.diligence.verifies_before_sharing": 1.0,
  "behavioral.diligence.attributes_honestly": 1.0,
  "behavioral.diligence.considers_downstream": 1.0,
  "behavioral.governance.routes_data_correctly": 1.0,
  "behavioral.governance.recognises_confidentiality_posture": 1.0,
  "behavioral.governance.documents_ai_use": 1.0,
  "behavioral.composition.configures_own_variant": 1.0,
  "behavioral.composition.wires_multi_step_workflows": 1.0,
  "behavioral.composition.orchestrates_across_tools": 1.0,
  "behavioral.multiplier.teaches_colleagues": 1.0,
  "behavioral.multiplier.shares_prompts_tools": 1.0,
  "behavioral.multiplier.surfaces_edge_cases": 1.0,
  "technical.model_fundamentals.tokenisation_and_context": 1.0,
  "technical.model_fundamentals.training_vs_inference": 1.0,
  "technical.model_fundamentals.probabilistic_generation": 1.0,
  "technical.prompting.system_vs_user_roles": 1.0,
  "technical.prompting.few_shot_and_cot": 1.0,
  "technical.prompting.structured_outputs": 1.0,
  "technical.memory_retrieval.embeddings": 1.0,
  "technical.memory_retrieval.rag": 1.0,
  "technical.memory_retrieval.kv_cache": 1.0,
  "technical.tool_use.function_calling": 1.0,
  "technical.tool_use.mcp": 1.0,
  "technical.tool_use.agentic_patterns": 1.0,
  "technical.evals.eval_frameworks": 1.0,
  "technical.evals.model_selection": 1.0,
  "technical.evals.production_measurement": 1.0,
  "operational.cli_tooling.terminal": 1.0,
  "operational.cli_tooling.version_control": 1.0,
  "operational.cli_tooling.ai_native_dev_tools": 1.0,
  "operational.apis.direct_api_use": 1.0,
  "operational.apis.cost_and_rate_awareness": 1.0,
  "operational.apis.error_handling": 1.0,
  "operational.mcp_integrations.mcp_server_use": 1.0,
  "operational.mcp_integrations.connector_configuration": 1.0,
  "operational.mcp_integrations.custom_integration": 1.0,
  "operational.ai_code.code_generation": 1.0,
  "operational.ai_code.code_review": 1.0,
  "operational.ai_code.production_shipped": 1.0,
  "operational.deployment.deployment": 1.0,
  "operational.deployment.cost_latency_monitoring": 1.0,
  "operational.deployment.eval_pipelines": 1.0,
};
