import type {
  AgentNodeId,
  AgentStepState,
  AgentToolCall,
  AgentWorkflowRecord,
  GeminiModelId,
} from '../src/types/oxygen.ts';
import { getAgentWorkflow, logActivity, saveAgentWorkflow } from './db.ts';
import { generateText, isGeminiConfigured, Type } from './gemini.ts';
import { runIsolatedPython } from './sandbox.ts';

interface OrchestrationPlan {
  routeAgents: AgentNodeId[];
  rationale: string;
  researchFocus: string;
  codingTask: string;
  analysisTask: string;
}

function buildInitialSteps(): AgentStepState[] {
  return [
    { agent: 'orchestrator', label: 'Orchestrator Router', status: 'pending', output: '' },
    { agent: 'research', label: 'Research Agent', status: 'pending', output: '' },
    { agent: 'coding', label: 'Coding Agent', status: 'pending', output: '' },
    { agent: 'data_analyst', label: 'Data Analyst Agent', status: 'pending', output: '' },
    { agent: 'testing', label: 'Testing Agent (Sandbox)', status: 'pending', output: '' },
    { agent: 'documentation', label: 'Documentation Agent', status: 'pending', output: '' },
  ];
}

function appendToolCall(
  wf: AgentWorkflowRecord,
  agent: AgentNodeId,
  toolName: string,
  inputSummary: string,
  outputSummary: string,
  durationMs: number
) {
  const call: AgentToolCall = {
    id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    agent,
    toolName,
    inputSummary: inputSummary.slice(0, 180),
    outputSummary: outputSummary.slice(0, 220),
    durationMs,
    timestamp: new Date().toISOString(),
  };
  wf.toolCalls.push(call);
}

function setStep(wf: AgentWorkflowRecord, agent: AgentNodeId, patch: Partial<AgentStepState>) {
  const step = wf.steps.find((s) => s.agent === agent);
  if (step) {
    Object.assign(step, patch);
  }
  wf.currentNode = agent;
  wf.updatedAt = new Date().toISOString();
  saveAgentWorkflow(wf);
}

async function runPlanNode(wf: AgentWorkflowRecord): Promise<OrchestrationPlan> {
  setStep(wf, 'orchestrator', { status: 'running' });
  const started = Date.now();

  if (!isGeminiConfigured()) {
    throw new Error('GEMINI_API_KEY is required for multi-agent orchestration.');
  }

  const res = await generateText({
    model: wf.model,
    thinkingLevel: wf.model === 'gemini-4-hydrogen' ? 'MEDIUM' : 'LOW',
    systemInstruction:
      'You are the OXYGEN AI Orchestrator Agent. Decompose engineering goals into structured subtasks for Research, Coding, Data Analyst, Testing, and Documentation agents.',
    prompt: `Engineering Goal: "${wf.goal}"
Decide which specialist agents are needed from ["research", "coding", "data_analyst", "testing", "documentation"]. Always include "documentation" at the end. Return JSON.`,
    jsonSchema: {
      type: Type.OBJECT,
      properties: {
        routeAgents: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        rationale: { type: Type.STRING },
        researchFocus: { type: Type.STRING },
        codingTask: { type: Type.STRING },
        analysisTask: { type: Type.STRING },
      },
      required: ['routeAgents', 'rationale', 'researchFocus', 'codingTask', 'analysisTask'],
    },
  });

  const plan = JSON.parse(res.text || '{}') as OrchestrationPlan;
  const duration = Date.now() - started;

  appendToolCall(
    wf,
    'orchestrator',
    'plan_graph_routing',
    wf.goal,
    `Routed: ${(plan.routeAgents ?? []).join(' -> ')}`,
    duration
  );

  setStep(wf, 'orchestrator', {
    status: 'completed',
    output: `Routing Rationale: ${plan.rationale}\nPipeline: ${(plan.routeAgents ?? []).join(' -> ')}`,
    latencyMs: res.latencyMs,
    tokens: res.promptTokens + res.outputTokens,
  });

  return plan;
}

function extractPythonCode(markdown: string): string {
  const match = markdown.match(/```python\s*([\s\S]*?)```/i) ?? markdown.match(/```\s*([\s\S]*?)```/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return '';
}

async function executeDownstreamNodes(wf: AgentWorkflowRecord, plan: OrchestrationPlan) {
  const activeSet = new Set(plan.routeAgents ?? ['research', 'coding', 'testing', 'documentation']);
  let researchSummary = '';
  let generatedCode = '';
  let sandboxTestOutput = '';
  let analystSummary = '';

  // 1. Research Agent
  if (activeSet.has('research')) {
    setStep(wf, 'research', { status: 'running' });
    const res = await generateText({
      model: wf.model,
      systemInstruction:
        'You are the OXYGEN AI Research Agent. Provide verified architectural facts, Python best practices, edge cases, and security considerations. Never invent benchmarks.',
      prompt: `Goal: ${wf.goal}\nResearch Focus: ${plan.researchFocus}\nProvide concise technical findings and architectural recommendations.`,
    });
    researchSummary = res.text;
    appendToolCall(wf, 'research', 'synthesize_technical_brief', plan.researchFocus, res.text.slice(0, 140), res.latencyMs);
    setStep(wf, 'research', {
      status: 'completed',
      output: res.text,
      latencyMs: res.latencyMs,
      tokens: res.promptTokens + res.outputTokens,
    });
  } else {
    setStep(wf, 'research', { status: 'skipped', output: 'Skipped by orchestrator route.' });
  }

  // 2. Coding Agent
  if (activeSet.has('coding') || activeSet.has('testing')) {
    setStep(wf, 'coding', { status: 'running' });
    const res = await generateText({
      model: wf.model,
      systemInstruction:
        'You are the OXYGEN AI Coding Agent. Write clean, modular Python 3 code using standard library modules only (math, statistics, json, typing, collections) so it can be verified immediately inside the isolated Python sandbox. Wrap the complete runnable Python script in a single ```python code block with a self-check assert block in __main__.',
      prompt: `Goal: ${wf.goal}\nTask: ${plan.codingTask}\nResearch Notes:\n${researchSummary.slice(0, 1200)}`,
    });
    generatedCode = extractPythonCode(res.text);
    appendToolCall(wf, 'coding', 'generate_python_module', plan.codingTask, `Generated ${generatedCode.length} chars of Python`, res.latencyMs);
    setStep(wf, 'coding', {
      status: 'completed',
      output: res.text,
      latencyMs: res.latencyMs,
      tokens: res.promptTokens + res.outputTokens,
    });
  } else {
    setStep(wf, 'coding', { status: 'skipped', output: 'Skipped by orchestrator route.' });
  }

  // 3. Data Analyst Agent
  if (activeSet.has('data_analyst')) {
    setStep(wf, 'data_analyst', { status: 'running' });
    const res = await generateText({
      model: wf.model,
      systemInstruction:
        'You are the OXYGEN AI Data Analyst Agent. Outline metrics, schema validations, anomaly checks, and quantitative methodology for the goal.',
      prompt: `Goal: ${wf.goal}\nAnalysis Task: ${plan.analysisTask}`,
    });
    analystSummary = res.text;
    appendToolCall(wf, 'data_analyst', 'analytical_framework', plan.analysisTask, res.text.slice(0, 140), res.latencyMs);
    setStep(wf, 'data_analyst', {
      status: 'completed',
      output: res.text,
      latencyMs: res.latencyMs,
      tokens: res.promptTokens + res.outputTokens,
    });
  } else {
    setStep(wf, 'data_analyst', { status: 'skipped', output: 'Skipped by orchestrator route.' });
  }

  // 4. Testing Agent (Real Sandbox Verification)
  if (generatedCode) {
    setStep(wf, 'testing', { status: 'running' });
    const execResult = await runIsolatedPython(generatedCode, 5000);
    sandboxTestOutput = [
      `Exit Code: ${execResult.exitCode}`,
      `Duration: ${execResult.durationMs}ms`,
      execResult.stdout ? `STDOUT:\n${execResult.stdout}` : 'STDOUT: (empty)',
      execResult.stderr ? `STDERR:\n${execResult.stderr}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    appendToolCall(
      wf,
      'testing',
      'run_isolated_python_sandbox',
      `Execute ${generatedCode.split('\n').length} lines`,
      execResult.success ? `Passed (${execResult.durationMs}ms)` : `Failed: ${execResult.stderr.slice(0, 100)}`,
      execResult.durationMs
    );

    setStep(wf, 'testing', {
      status: execResult.success ? 'completed' : 'failed',
      output: sandboxTestOutput,
      latencyMs: execResult.durationMs,
      error: execResult.success ? undefined : execResult.stderr,
    });
  } else {
    setStep(wf, 'testing', { status: 'skipped', output: 'No runnable Python artifact to test.' });
  }

  // 5. Documentation Agent
  setStep(wf, 'documentation', { status: 'running' });
  const docRes = await generateText({
    model: wf.model,
    systemInstruction:
      'You are the OXYGEN AI Documentation Agent. Produce a crisp, production-grade technical report summarizing architecture, implementation, sandbox verification results, and next engineering steps.',
    prompt: `Goal: ${wf.goal}
Research: ${researchSummary.slice(0, 900)}
Analyst: ${analystSummary.slice(0, 600)}
Sandbox Verification:
${sandboxTestOutput || 'Not executed'}
Write a clear Markdown technical report.`,
  });

  appendToolCall(wf, 'documentation', 'compile_technical_report', wf.goal, `Report length: ${docRes.text.length} chars`, docRes.latencyMs);
  setStep(wf, 'documentation', {
    status: 'completed',
    output: docRes.text,
    latencyMs: docRes.latencyMs,
    tokens: docRes.promptTokens + docRes.outputTokens,
  });

  wf.finalReport = docRes.text;
  wf.status = 'completed';
  wf.updatedAt = new Date().toISOString();
  saveAgentWorkflow(wf);
}

export async function startAgentWorkflow(input: {
  goal: string;
  model: GeminiModelId;
  requireHumanApproval: boolean;
}): Promise<AgentWorkflowRecord> {
  const now = new Date().toISOString();
  const wf: AgentWorkflowRecord = {
    id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    goal: input.goal,
    model: input.model,
    requireHumanApproval: input.requireHumanApproval,
    status: 'running',
    currentNode: 'orchestrator',
    steps: buildInitialSteps(),
    toolCalls: [],
    finalReport: '',
    createdAt: now,
    updatedAt: now,
  };
  saveAgentWorkflow(wf);

  try {
    const plan = await runPlanNode(wf);

    if (wf.requireHumanApproval) {
      wf.status = 'awaiting_approval';
      const firstDownstream = wf.steps.find((s) => s.agent !== 'orchestrator');
      if (firstDownstream) {
        firstDownstream.status = 'awaiting_approval';
        wf.currentNode = firstDownstream.agent;
      }
      wf.updatedAt = new Date().toISOString();
      saveAgentWorkflow(wf);
      logActivity({
        category: 'agent',
        action: 'Workflow awaiting approval',
        detail: wf.goal.slice(0, 90),
        status: 'warning',
      });
      return wf;
    }

    await executeDownstreamNodes(wf, plan);
    logActivity({
      category: 'agent',
      action: 'Multi-agent workflow completed',
      detail: wf.goal.slice(0, 90),
      status: 'nominal',
    });
    return wf;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    wf.status = 'failed';
    const cur = wf.steps.find((s) => s.agent === wf.currentNode);
    if (cur) {
      cur.status = 'failed';
      cur.error = msg;
    }
    wf.updatedAt = new Date().toISOString();
    saveAgentWorkflow(wf);
    logActivity({
      category: 'agent',
      action: 'Multi-agent workflow failed',
      detail: msg.slice(0, 120),
      status: 'error',
    });
    throw err;
  }
}

export async function approveAndResumeWorkflow(workflowId: string, approved: boolean): Promise<AgentWorkflowRecord> {
  const wf = getAgentWorkflow(workflowId);
  if (!wf) {
    throw new Error('Workflow not found.');
  }

  if (!approved) {
    wf.status = 'failed';
    for (const s of wf.steps) {
      if (s.status === 'awaiting_approval' || s.status === 'pending') {
        s.status = 'skipped';
        s.output = 'Cancelled by human reviewer at approval checkpoint.';
      }
    }
    wf.updatedAt = new Date().toISOString();
    saveAgentWorkflow(wf);
    logActivity({
      category: 'agent',
      action: 'Workflow rejected by operator',
      detail: wf.goal.slice(0, 90),
      status: 'warning',
    });
    return wf;
  }

  wf.status = 'running';
  saveAgentWorkflow(wf);

  const orchStep = wf.steps.find((s) => s.agent === 'orchestrator');
  const pipelineMatch = orchStep?.output.match(/Pipeline:\s*(.+)/);
  const routeAgents = pipelineMatch
    ? (pipelineMatch[1].split('->').map((x) => x.trim()) as AgentNodeId[])
    : (['research', 'coding', 'testing', 'documentation'] as AgentNodeId[]);

  const plan: OrchestrationPlan = {
    routeAgents,
    rationale: orchStep?.output ?? '',
    researchFocus: wf.goal,
    codingTask: wf.goal,
    analysisTask: wf.goal,
  };

  try {
    await executeDownstreamNodes(wf, plan);
    logActivity({
      category: 'agent',
      action: 'Approved workflow completed',
      detail: wf.goal.slice(0, 90),
      status: 'nominal',
    });
    return wf;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    wf.status = 'failed';
    const cur = wf.steps.find((s) => s.agent === wf.currentNode);
    if (cur) {
      cur.status = 'failed';
      cur.error = msg;
    }
    wf.updatedAt = new Date().toISOString();
    saveAgentWorkflow(wf);
    throw err;
  }
}
