export interface MasterclassLesson {
  id: string;
  level: number;
  levelTitle: string;
  title: string;
  topics: string[];
  durationMinutes: number;
  objectives: string[];
  verifiedDocumentation: string[];
  engineeringKnowledge: string;
  diagramSteps: Array<{ label: string; sublabel: string }>;
  pythonCode: string;
  expectedOutput: string;
  exerciseSteps: string[];
  commonMistakes: string[];
  quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
  miniProject: string;
}

export const MASTERCLASS_CURRICULUM: MasterclassLesson[] = [
  // LEVEL 1: AI FOUNDATIONS
  {
    id: 'L1-01',
    level: 1,
    levelTitle: 'Level 1: AI Foundations',
    title: '01. Artificial Intelligence, Machine Learning & Deep Learning',
    topics: ['Artificial intelligence', 'Machine learning', 'Deep learning', 'Neural networks'],
    durationMinutes: 15,
    objectives: [
      'Distinguish rule-based AI, classical machine learning, and multi-layer deep neural networks.',
      'Understand forward propagation, loss functions, and gradient descent optimization.',
    ],
    verifiedDocumentation: [
      'Google Gemini models are deep neural foundation models accessed via the Google GenAI SDK (`google-genai` in Python, `@google/genai` in TypeScript).',
    ],
    engineeringKnowledge:
      'Artificial intelligence encompasses any system performing tasks associated with human cognition. Machine learning (ML) narrows this to statistical algorithms that learn decision boundaries from labeled or unlabeled datasets instead of explicit rules. Deep learning uses stacked differentiable neural network layers (linear projections plus non-linear activations) trained via backpropagation so hierarchical representations emerge automatically from raw text, code, or pixels.',
    diagramSteps: [
      { label: 'Input Tensor', sublabel: 'Raw features / tokens' },
      { label: 'Hidden Layers', sublabel: 'Weights + non-linearity' },
      { label: 'Loss Function', sublabel: 'Prediction error' },
      { label: 'Backprop Update', sublabel: 'Gradient descent' },
    ],
    pythonCode: `"""Pure Python single-neuron forward pass & gradient step demonstration."""
def sigmoid(z: float) -> float:
    import math
    return 1.0 / (1.0 + math.exp(-z))

# Sample feature vector [token_density, schema_validity]
x = [0.85, 0.90]
weights = [0.4, 0.6]
bias = -0.2
target = 1.0
lr = 0.5

z = sum(xi * wi for xi, wi in zip(x, weights)) + bias
pred = sigmoid(z)
error = pred - target

# Gradient update
updated_weights = [round(w - lr * error * xi, 4) for w, xi in zip(weights, x)]
print(f"Initial prediction: {pred:.4f}")
print(f"Updated weights: {updated_weights}")`,
    expectedOutput: `Initial prediction: 0.6637\nUpdated weights: [0.5430, 0.7513]`,
    exerciseSteps: [
      'Copy the snippet into the AI Coding Studio (Python).',
      'Run 5 iterations in a loop and observe how `pred` converges toward `1.0`.',
      'Experiment with changing learning rate `lr` from `0.5` to `0.05`.',
    ],
    commonMistakes: [
      'Treating deep learning as a replacement for deterministic validation rules when simple assertions suffice.',
      'Ignoring feature scaling before feeding numeric inputs into gradient-based models.',
    ],
    quiz: {
      question: 'What distinguishes deep learning from classical machine learning?',
      options: [
        'Deep learning requires no training data',
        'Deep learning stacks multiple neural layers to learn hierarchical representations automatically',
        'Deep learning cannot process text',
        'Deep learning uses SQL queries instead of weights',
      ],
      correctIndex: 1,
      explanation:
        'Deep learning composes multiple parameterized layers so low-level features combine into higher-level abstractions automatically.',
    },
    miniProject: 'Extend the Python perceptron into a 20-epoch training loop and log binary cross-entropy loss per epoch.',
  },
  {
    id: 'L1-02',
    level: 1,
    levelTitle: 'Level 1: AI Foundations',
    title: '02. Large Language Models & Transformer Architecture',
    topics: ['Large language models', 'Transformers', 'Self-attention', 'Autoregressive decoding'],
    durationMinutes: 20,
    objectives: [
      'Explain why self-attention replaced recurrent bottlenecks in sequence modeling.',
      'Understand autoregressive next-token prediction during inference.',
    ],
    verifiedDocumentation: [
      'Gemini models are multimodal transformer-based models supporting configurable reasoning depth (`thinking_level` / `thinkingLevel`).',
    ],
    engineeringKnowledge:
      'Transformers process all sequence positions in parallel using scaled dot-product self-attention: every token projects Query (Q), Key (K), and Value (V) vectors, computing pairwise relevance scores across the entire context simultaneously. During generation, autoregressive language models predict a probability distribution over the vocabulary for the next token, append the sampled token, and repeat until an end-of-sequence marker or token cap is reached.',
    diagramSteps: [
      { label: 'Token IDs', sublabel: 'Subword vocabulary' },
      { label: 'Q · K^T / sqrt(d)', sublabel: 'Attention weights' },
      { label: 'Feed-Forward', sublabel: 'Per-token MLP' },
      { label: 'Logits -> Next Token', sublabel: 'Vocabulary projection' },
    ],
    pythonCode: `"""Scaled Dot-Product Attention scoring in pure Python."""
import math

def softmax(vals):
    m = max(vals)
    exps = [math.exp(v - m) for v in vals]
    s = sum(exps)
    return [round(e / s, 4) for e in exps]

q = [1.0, 0.5]
keys = [[1.0, 0.4], [0.1, 0.9], [-0.5, 0.2]]
d_k = len(q)

scores = [sum(q[i] * k[i] for i in range(d_k)) / math.sqrt(d_k) for k in keys]
weights = softmax(scores)
print("Raw attention scores:", [round(s, 3) for s in scores])
print("Normalized weights:", weights)`,
    expectedOutput: `Raw attention scores: [0.849, 0.389, -0.283]\nNormalized weights: [0.5112, 0.3227, 0.1661]`,
    exerciseSteps: [
      'Run the attention scorer in the Coding Studio sandbox.',
      'Modify `q` to align closely with the second key `[0.1, 0.9]` and inspect how attention weight shifts.',
    ],
    commonMistakes: [
      'Confusing training-time parallel attention with inference-time sequential token generation.',
      'Assuming transformers store exact database facts rather than probabilistic parameter weights.',
    ],
    quiz: {
      question: 'Why does scaled dot-product attention divide by sqrt(d_k)?',
      options: [
        'To reduce the number of tokens in a prompt',
        'To prevent large dot products from pushing softmax into tiny-gradient saturation zones',
        'To convert strings into JSON',
        'To encrypt model weights',
      ],
      correctIndex: 1,
      explanation: 'Scaling keeps dot-product variance steady as embedding dimension d_k grows, stabilizing gradients.',
    },
    miniProject: 'Implement multi-head attention by splitting a 4-dimensional vector into two 2-dimensional heads and averaging outputs.',
  },
  {
    id: 'L1-03',
    level: 1,
    levelTitle: 'Level 1: AI Foundations',
    title: '03. Tokens, Embeddings, Context Windows & Multimodal AI',
    topics: ['Tokens and embeddings', 'Context windows', 'Multimodal AI'],
    durationMinutes: 18,
    objectives: [
      'Estimate token budgets across text, code, and structured JSON payloads.',
      'Understand vector embeddings and native multimodal input parts.',
    ],
    verifiedDocumentation: [
      'The Gemini SDK accepts multimodal `parts` (text, `inlineData` images/audio/PDFs) and provides `embedContent` with `gemini-embedding-2`.',
    ],
    engineeringKnowledge:
      'Models do not read raw characters; subword tokenizers split text into common chunks (~3.5–4 English characters per token on average, though dense code or symbols tokenize differently). Embeddings map text or media into dense floating-point vectors where semantic similarity corresponds to cosine similarity. Context windows bound the combined size of system instructions, conversation history, retrieved documents, thinking tokens, and output.',
    diagramSteps: [
      { label: 'Text / Image / Audio', sublabel: 'Multimodal input parts' },
      { label: 'Tokenizer / Patcher', sublabel: 'Discrete token stream' },
      { label: 'Context Window', sublabel: 'Input + Thinking + Output' },
      { label: 'Dense Vector', sublabel: 'Semantic embedding space' },
    ],
    pythonCode: `"""Cosine similarity for comparing two embedding vectors."""
import math

def cosine_similarity(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    return round(dot / (norm_a * norm_b), 4)

vec_python = [0.91, 0.84, 0.12]
vec_pyspark = [0.88, 0.79, 0.19]
vec_cooking = [0.10, 0.15, 0.94]

print("Python vs PySpark:", cosine_similarity(vec_python, vec_pyspark))
print("Python vs Cooking:", cosine_similarity(vec_python, vec_cooking))`,
    expectedOutput: `Python vs PySpark: 0.9967\nPython vs Cooking: 0.2738`,
    exerciseSteps: [
      'Execute the cosine similarity helper in Coding Studio.',
      'Add a 4th vector representing SQL and rank all pairs by similarity.',
    ],
    commonMistakes: [
      'Forgetting that `usageMetadata` includes both prompt tokens and generated/thinking tokens.',
      'Stuffing unbounded conversation histories into requests without summarization or window pruning.',
    ],
    quiz: {
      question: 'Which metric measures angular closeness between two normalized embedding vectors?',
      options: ['Levenshtein distance', 'Cosine similarity', 'CRC32 checksum', 'HTTP status code'],
      correctIndex: 1,
      explanation: 'Cosine similarity measures the cosine of the angle between vectors regardless of magnitude.',
    },
    miniProject: 'Build a tiny in-memory vector search function that ranks 5 documentation snippets against a query vector.',
  },

  // LEVEL 2: GEMINI AND HYDROGEN FUNDAMENTALS
  {
    id: 'L2-01',
    level: 2,
    levelTitle: 'Level 2: Gemini & Hydrogen Fundamentals',
    title: '04. Google Gemini Ecosystem & Model Selection',
    topics: ['Google Gemini ecosystem', 'Hydrogen model introduction', 'Model selection'],
    durationMinutes: 18,
    objectives: [
      'Match engineering workloads to the correct Gemini model family.',
      'Identify when to choose Hydrogen, Carbon, Argon, or Flash-Lite.',
    ],
    verifiedDocumentation: [
      'Verified current model identifiers in this workspace: `gemini-4-hydrogen` (balanced general & agentic workhorse), `gemini-3.1-flash-lite` (ultra-low-latency fast tasks), `gemini-4-argon` (complex STEM/interactive coding), `gemini-4-carbon` (deep architectural & root-cause reasoning), and `gemini-3-pro-image-preview` / `gemini-nano-banana-2.1` (1K/2K/4K image synthesis).',
    ],
    engineeringKnowledge:
      'Production AI systems rarely rely on a single monolithic model for every call. Routing high-frequency classification or inline autocomplete to a low-latency model (`gemini-3.1-flash-lite`), primary workflows to `gemini-4-hydrogen`, and escalated security audits or root-cause analysis to `gemini-4-carbon` optimizes both cost and end-user responsiveness.',
    diagramSteps: [
      { label: 'Task Classifier', sublabel: 'Flash-Lite (<200ms)' },
      { label: 'Core Engineering', sublabel: 'Gemini 4 Hydrogen' },
      { label: 'Deep Reasoning', sublabel: 'Argon / Carbon' },
      { label: 'Visual Synthesis', sublabel: 'Pro Image (1K-4K)' },
    ],
    pythonCode: `"""Model routing helper following OXYGEN AI selection rules."""
def select_oxygen_model(task_type: str) -> str:
    routing = {
        "quick_classify": "gemini-3.1-flash-lite",
        "general_chat": "gemini-4-hydrogen",
        "agent_workflow": "gemini-4-hydrogen",
        "complex_stem": "gemini-4-argon",
        "security_audit": "gemini-4-carbon",
        "high_res_image": "gemini-3-pro-image-preview",
    }
    return routing.get(task_type, "gemini-4-hydrogen")

for task in ["quick_classify", "agent_workflow", "security_audit"]:
    print(f"{task} -> {select_oxygen_model(task)}")`,
    expectedOutput: `quick_classify -> gemini-3.1-flash-lite\nagent_workflow -> gemini-4-hydrogen\nsecurity_audit -> gemini-4-carbon`,
    exerciseSteps: [
      'Run the router snippet in Coding Studio.',
      'Test different task keys in the Model Playground and compare latency.',
    ],
    commonMistakes: [
      'Using deprecated Gemini 1.5 or 2.0 identifiers instead of current Gemini 3 / Gemini 4 models.',
      'Routing trivial single-line formatting prompts to heavy deep-reasoning models.',
    ],
    quiz: {
      question: 'Which model is designed specifically for ultra-low-latency fast responses?',
      options: ['gemini-4-carbon', 'gemini-3.1-flash-lite', 'gemini-3-pro-image-preview', 'lyria-3-pro-preview'],
      correctIndex: 1,
      explanation: 'gemini-3.1-flash-lite defaults to MINIMAL thinking for minimal response latency.',
    },
    miniProject: 'Create a benchmark comparison in Benchmark Center running the same suite across Flash-Lite and Hydrogen.',
  },
  {
    id: 'L2-02',
    level: 2,
    levelTitle: 'Level 2: Gemini & Hydrogen Fundamentals',
    title: '05. Hydrogen Capabilities, Modalities & Thinking Levels',
    topics: ['Model capabilities and limitations', 'Available input modalities', 'Model configuration'],
    durationMinutes: 20,
    objectives: [
      'Configure `thinkingLevel` appropriately on Gemini 4 Hydrogen.',
      'Understand parameter constraints (no `thinkingBudget`, no legacy sampling overrides).',
    ],
    verifiedDocumentation: [
      'On `gemini-4-hydrogen`, `thinkingConfig.thinkingLevel` supports `LOW`, `MEDIUM`, `HIGH` (default), and `XHIGH` (maximum reasoning depth for multi-step agentic research). `MINIMAL` is NOT supported on `gemini-4-hydrogen` (it returns HTTP 400). Do NOT pass `thinkingBudget` or deprecated `temperature`/`topP`/`topK` parameters to Gemini 4 series models.',
    ],
    engineeringKnowledge:
      'Configurable thinking levels let engineers trade reasoning tokens against wall-clock latency without switching endpoints. Use `LOW` for direct transformations, `MEDIUM` for standard API orchestration, `HIGH` for multi-constraint coding, and `XHIGH` on Hydrogen when performing deep synthesis across multiple tool outputs.',
    diagramSteps: [
      { label: 'LOW', sublabel: 'Minimal latency' },
      { label: 'MEDIUM', sublabel: 'Balanced throughput' },
      { label: 'HIGH (Default)', sublabel: 'Standard Hydrogen depth' },
      { label: 'XHIGH', sublabel: 'Max agentic synthesis' },
    ],
    pythonCode: `# Official Python google-genai SDK pattern (reference snippet)
# pip install google-genai
from google import genai
from google.genai import types

def build_hydrogen_config(level: str = "HIGH") -> dict:
    supported = {"LOW", "MEDIUM", "HIGH", "XHIGH"}
    if level not in supported:
        raise ValueError(f"Unsupported thinkingLevel for Hydrogen: {level}")
    return {
        "model": "gemini-4-hydrogen",
        "thinking_level": level,
        "system_instruction": "Respond with verified facts and runnable code.",
    }

print(build_hydrogen_config("XHIGH"))`,
    expectedOutput: `{'model': 'gemini-4-hydrogen', 'thinking_level': 'XHIGH', 'system_instruction': 'Respond with verified facts and runnable code.'}`,
    exerciseSteps: [
      'Try setting `Thinking Level` to `LOW` vs `HIGH` in the Model Playground.',
      'Observe the measured latency and token counts returned per turn.',
    ],
    commonMistakes: [
      'Passing `thinkingLevel: MINIMAL` to `gemini-4-hydrogen` (triggers a 400 error).',
      'Passing `thinkingBudget` instead of `thinkingLevel` to Gemini 4 models.',
    ],
    quiz: {
      question: 'Which thinkingLevel value is exclusively supported on gemini-4-hydrogen among Gemini 4 models?',
      options: ['MINIMAL', 'XHIGH', 'ZERO', 'TURBO'],
      correctIndex: 1,
      explanation: 'XHIGH is supported specifically on gemini-4-hydrogen for complex agentic and research workflows.',
    },
    miniProject: 'Test the same algorithmic prompt at LOW and HIGH thinking levels in Playground and record token delta.',
  },
  {
    id: 'L2-03',
    level: 2,
    levelTitle: 'Level 2: Gemini & Hydrogen Fundamentals',
    title: '06. Context Handling, Limitations & Grounding Discipline',
    topics: ['Context handling', 'Model documentation', 'Verification boundaries'],
    durationMinutes: 16,
    objectives: [
      'Prevent hallucinated capabilities by grounding prompts in real application data.',
      'Design clear system boundaries when external data is missing.',
    ],
    verifiedDocumentation: [
      'When using `maxOutputTokens`, remember it caps BOTH thinking tokens and visible response tokens combined; guide response length inside `systemInstruction` instead.',
    ],
    engineeringKnowledge:
      'Every foundation model has a knowledge cutoff and probabilistic failure modes under ambiguity. Reliable engineering platforms separate verified facts (retrieved database rows, tool responses, official documentation) from inferred recommendations, and instruct the model to state uncertainty explicitly rather than fabricating metrics.',
    diagramSteps: [
      { label: 'Verified Context', sublabel: 'DB / CSV / API output' },
      { label: 'System Boundary', sublabel: 'Strict anti-fabrication' },
      { label: 'Hydrogen Inference', sublabel: 'Grounded synthesis' },
      { label: 'Schema Validation', sublabel: 'Deterministic check' },
    ],
    pythonCode: `"""Context budget guard before sending messages to an LLM."""
def trim_context_messages(messages: list[dict], max_chars: int = 8000) -> list[dict]:
    kept = []
    total = 0
    for msg in reversed(messages):
        size = len(msg.get("content", ""))
        if total + size > max_chars and kept:
            break
        kept.append(msg)
        total += size
    return list(reversed(kept))

history = [{"role": "user", "content": "A" * 3000}, {"role": "model", "content": "B" * 3000}, {"role": "user", "content": "Latest question"}]
print("Kept messages:", len(trim_context_messages(history, max_chars=4000)))`,
    expectedOutput: `Kept messages: 2`,
    exerciseSteps: [
      'Inspect how Data Intelligence Lab passes a compact JSON profile rather than raw 10,000-row CSV strings.',
      'Run the context budget guard above with different character caps.',
    ],
    commonMistakes: [
      'Setting tight `maxOutputTokens` on reasoning models without accounting for internal thinking tokens.',
      'Allowing user prompts to override system grounding constraints.',
    ],
    quiz: {
      question: 'What does `maxOutputTokens` count on Gemini reasoning models?',
      options: [
        'Only visible Markdown characters',
        'Both internal thinking tokens and visible response tokens',
        'Only system instructions',
        'Only JSON keys',
      ],
      correctIndex: 1,
      explanation: 'maxOutputTokens caps combined thinking and response tokens; use systemInstruction to control verbosity.',
    },
    miniProject: 'Write a Python context packer that prioritizes the system prompt, latest 3 turns, and truncates older tool outputs.',
  },

  // LEVEL 3: PROMPT ENGINEERING
  {
    id: 'L3-01',
    level: 3,
    levelTitle: 'Level 3: Prompt Engineering',
    title: '07. System Instructions, Roles & Few-Shot Prompting',
    topics: ['System instructions', 'User prompts', 'Role-based prompting', 'Few-shot prompting'],
    durationMinutes: 18,
    objectives: [
      'Separate invariant behavioral rules (System Instruction) from dynamic input (User Prompt).',
      'Use 2–3 high-signal few-shot examples to anchor tone and format.',
    ],
    verifiedDocumentation: [
      'In `@google/genai`, pass `config: { systemInstruction: "..." }` in `ai.models.generateContent` or `ai.chats.create`.',
    ],
    engineeringKnowledge:
      'System instructions establish persona, safety boundaries, output conventions, and domain rules across an entire session. Few-shot prompting embeds concrete input-output pairs inside the prompt so the model infers exact formatting, edge-case handling, and naming style without verbose prose rules.',
    diagramSteps: [
      { label: 'System Instruction', sublabel: 'Invariant rules & role' },
      { label: 'Few-Shot Pairs', sublabel: '2-3 canonical examples' },
      { label: 'User Input', sublabel: 'Dynamic query payload' },
      { label: 'Consistent Output', sublabel: 'Anchored format' },
    ],
    pythonCode: `"""Constructing a clean few-shot prompt template."""
FEW_SHOT_EXAMPLES = [
    ("latency=120ms status=200", '{"severity": "nominal", "action": "none"}'),
    ("latency=4800ms status=504", '{"severity": "critical", "action": "page_oncall"}'),
]

def build_few_shot_prompt(new_event: str) -> str:
    blocks = ["Classify telemetry events into JSON."]
    for inp, out in FEW_SHOT_EXAMPLES:
        blocks.append(f"Input: {inp}\\nOutput: {out}")
    blocks.append(f"Input: {new_event}\\nOutput:")
    return "\\n\\n".join(blocks)

print(build_few_shot_prompt("latency=950ms status=429"))`,
    expectedOutput: `Classify telemetry events into JSON.\n\nInput: latency=120ms status=200\nOutput: {"severity": "nominal", "action": "none"}\n\nInput: latency=4800ms status=504\nOutput: {"severity": "critical", "action": "page_oncall"}\n\nInput: latency=950ms status=429\nOutput:`,
    exerciseSteps: [
      'Open Model Playground and set a strict System Instruction (e.g. "Senior Python SRE").',
      'Test the same question with and without the system instruction to compare precision.',
    ],
    commonMistakes: [
      'Mixing untrusted user text directly into the system instruction field.',
      'Adding 20+ redundant few-shot examples that inflate latency without improving accuracy.',
    ],
    quiz: {
      question: 'Where should persistent behavioral rules and formatting constraints live in a Gemini request?',
      options: ['Inside the HTML title', 'In config.systemInstruction', 'In the CSS file', 'In the model name string'],
      correctIndex: 1,
      explanation: 'config.systemInstruction isolates invariant rules from turn-by-turn user input.',
    },
    miniProject: 'Create 3 reusable system instruction presets for Code Review, SQL Generation, and Technical Documentation.',
  },
  {
    id: 'L3-02',
    level: 3,
    levelTitle: 'Level 3: Prompt Engineering',
    title: '08. Structured Prompts, Output Formatting & Safe Reasoning',
    topics: ['Chain-of-thought concepts', 'Safe reasoning interfaces', 'Structured prompts', 'Output formatting'],
    durationMinutes: 20,
    objectives: [
      'Combine explicit XML/Markdown delimiters with schema-enforced outputs.',
      'Leverage native `thinkingLevel` rather than forcing brittle scratchpad tags.',
    ],
    verifiedDocumentation: [
      'Gemini 4 models include native internal reasoning controlled via `thinkingLevel`. Use `responseMimeType: "application/json"` with `responseSchema` for deterministic JSON structure.',
    ],
    engineeringKnowledge:
      'Delimiters like `<context>...</context>` and `<task>...</task>` prevent prompt ambiguity when user documents contain instructions or code snippets. Rather than asking models to print long unparsed reasoning monologues before JSON, use native `thinkingLevel` so internal reasoning stays separate from the clean structured response.',
    diagramSteps: [
      { label: 'Delimited Inputs', sublabel: '<context> + <constraints>' },
      { label: 'Native Thinking', sublabel: 'Internal reasoning step' },
      { label: 'Schema Constraint', sublabel: 'Type.OBJECT / ARRAY' },
      { label: 'Typed Parse', sublabel: 'Zero regex fragility' },
    ],
    pythonCode: `"""Safe structured prompt builder with explicit delimiters."""
def format_analysis_prompt(code_snippet: str, focus: str) -> str:
    return (
        "<constraints>\\n"
        "- Report only issues directly observable in the snippet.\\n"
        "- Reference exact line numbers.\\n"
        "</constraints>\\n"
        f"<focus>{focus}</focus>\\n"
        f"<code>\\n{code_snippet}\\n</code>"
    )

print(format_analysis_prompt("def add(a, b): return a + b", "type_safety"))`,
    expectedOutput: `<constraints>\n- Report only issues directly observable in the snippet.\n- Reference exact line numbers.\n</constraints>\n<focus>type_safety</focus>\n<code>\ndef add(a, b): return a + b\n</code>`,
    exerciseSteps: [
      'Run the Structured JSON test inside API Laboratory.',
      'Inspect how the returned JSON parses cleanly without Markdown code fences.',
    ],
    commonMistakes: [
      'Asking for "only JSON" in plain text without setting `responseMimeType` and `responseSchema`.',
      'Leaving unescaped triple backticks inside user-supplied code blocks.',
    ],
    quiz: {
      question: 'What is the most reliable way to enforce strict JSON fields from Gemini Hydrogen?',
      options: [
        'Adding "please pretty please return JSON" in caps',
        'Setting responseMimeType: "application/json" and responseSchema',
        'Using regex replace on prose',
        'Increasing font size',
      ],
      correctIndex: 1,
      explanation: 'responseSchema constrains token decoding at the API level to match your declared schema.',
    },
    miniProject: 'Design a JSON schema for extracting function names, parameters, and complexity risks from Python code.',
  },
  {
    id: 'L3-03',
    level: 3,
    levelTitle: 'Level 3: Prompt Engineering',
    title: '09. Prompt Evaluation & Iterative Optimization',
    topics: ['Prompt evaluation', 'Prompt optimization'],
    durationMinutes: 16,
    objectives: [
      'Measure prompt changes against repeatable test cases instead of gut feeling.',
      'Track latency, token efficiency, and pass rate together.',
    ],
    verifiedDocumentation: [
      'Every Gemini response exposes `usageMetadata` (`promptTokenCount`, `candidatesTokenCount`) to quantify token efficiency.',
    ],
    engineeringKnowledge:
      'Prompt engineering is empirical software engineering. Maintain a golden evaluation suite of 10–50 representative inputs (including edge cases and adversarial inputs). Whenever you modify a system prompt or model tier, execute the suite and inspect pass rate, JSON validity, and latency regression before shipping.',
    diagramSteps: [
      { label: 'Golden Dataset', sublabel: 'Representative inputs' },
      { label: 'Run Prompt v1 / v2', sublabel: 'Automated execution' },
      { label: 'Deterministic Grader', sublabel: 'Schema & unit checks' },
      { label: 'Regression Gate', sublabel: 'Compare metrics' },
    ],
    pythonCode: `"""Lightweight deterministic prompt evaluator."""
def evaluate_cases(cases: list[tuple[str, str]]) -> dict:
    passed = 0
    for expected_substr, actual in cases:
        if expected_substr.lower() in actual.lower():
            passed += 1
    rate = round((passed / len(cases)) * 100, 1)
    return {"total": len(cases), "passed": passed, "pass_rate_pct": rate}

sample = [("oxygen", "OXYGEN AI platform"), ("400", "Returns HTTP 400 error")]
print(evaluate_cases(sample))`,
    expectedOutput: `{'total': 2, 'passed': 2, 'pass_rate_pct': 100.0}`,
    exerciseSteps: [
      'Navigate to Benchmark Center and execute a real verification suite on `gemini-4-hydrogen`.',
      'Run the same suite on `gemini-3.1-flash-lite` and compare latency and pass rate.',
    ],
    commonMistakes: [
      'Evaluating prompts on a single happy-path example.',
      'Optimizing for shorter prompts at the cost of removing critical edge-case constraints.',
    ],
    quiz: {
      question: 'Why run automated evaluation suites after editing a system prompt?',
      options: [
        'To detect regressions in accuracy, schema validity, or latency across diverse cases',
        'Because Python requires it to compile',
        'To increase token consumption',
        'To disable caching',
      ],
      correctIndex: 0,
      explanation: 'Prompt edits often fix one case while breaking another; suites catch regressions early.',
    },
    miniProject: 'Add 2 edge-case prompts to your Playground workflow and verify consistent schema adherence across 3 consecutive runs.',
  },

  // LEVEL 4: PYTHON AND API DEVELOPMENT
  {
    id: 'L4-01',
    level: 4,
    levelTitle: 'Level 4: Python & API Development',
    title: '10. Python Environment Setup, Auth & Official SDK',
    topics: ['Python environment setup', 'API keys and authentication', 'Official SDK', 'Model invocation'],
    durationMinutes: 18,
    objectives: [
      'Initialize the official Gemini SDK securely via server-side environment variables.',
      'Avoid deprecated client libraries and never expose API keys in browser code.',
    ],
    verifiedDocumentation: [
      'Use `google-genai` in Python (`from google import genai; client = genai.Client()`) and `@google/genai` in TypeScript (`new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })`). Never import `google.generativeai` or `GoogleGenerativeAI`.',
    ],
    engineeringKnowledge:
      'Production applications isolate API credentials exclusively in server-side environments (`.env` excluded from git, or cloud secret managers). Frontend React applications call authenticated `/api/*` backend endpoints which validate inputs, apply rate limits, and proxy requests to Gemini.',
    diagramSteps: [
      { label: 'React Client', sublabel: 'No API keys in bundle' },
      { label: 'POST /api/*', sublabel: 'Validation & rate limit' },
      { label: 'Server SDK Client', sublabel: 'process.env.GEMINI_API_KEY' },
      { label: 'Gemini Endpoint', sublabel: 'Secure TLS inference' },
    ],
    pythonCode: `"""Official Python google-genai invocation pattern."""
# Install: pip install google-genai
# Env: export GEMINI_API_KEY="your-key"

SAMPLE_SCRIPT = '''
import os
from google import genai

# Automatically reads GEMINI_API_KEY from environment
client = genai.Client()
response = client.models.generate_content(
    model="gemini-4-hydrogen",
    contents="Summarize the benefits of virtual environments in Python."
)
print(response.text)
'''
print("Verified SDK pattern ready. Length:", len(SAMPLE_SCRIPT), "chars")`,
    expectedOutput: `Verified SDK pattern ready. Length: 277 chars`,
    exerciseSteps: [
      'Inspect `API Laboratory` -> Python SDK tab for copy-ready snippets.',
      'Verify `.gitignore` excludes `.env` and database artifacts.',
    ],
    commonMistakes: [
      'Importing legacy `google.generativeai` or passing raw API keys into frontend `VITE_*` variables.',
      'Committing `.env` files containing real credentials to Git repositories.',
    ],
    quiz: {
      question: 'Where should `GEMINI_API_KEY` be stored and accessed in a full-stack web app?',
      options: [
        'Hardcoded inside src/App.tsx',
        'In server-side environment variables accessed only by backend routes',
        'In localStorage',
        'In URL query parameters',
      ],
      correctIndex: 1,
      explanation: 'Keeping GEMINI_API_KEY strictly on the server protects credentials from browser inspection.',
    },
    miniProject: 'Review `server/gemini.ts` in Documentation > Architecture to see how OXYGEN AI initializes `GoogleGenAI`.',
  },
  {
    id: 'L4-02',
    level: 4,
    levelTitle: 'Level 4: Python & API Development',
    title: '11. Streaming Responses, Error Handling & Retry Logic',
    topics: ['Streaming', 'Error handling', 'Rate limits', 'Retry logic'],
    durationMinutes: 20,
    objectives: [
      'Stream incremental chunks via Server-Sent Events (SSE) for responsive UX.',
      'Implement exponential backoff with jitter for transient 429/503 errors.',
    ],
    verifiedDocumentation: [
      'Use `ai.models.generateContentStream` (TypeScript) or `client.models.generate_content_stream` (Python). Handle 400/403 key errors immediately without retrying; retry 429/503 with exponential backoff.',
    ],
    engineeringKnowledge:
      'Streaming reduces perceived Time-To-First-Token (TTFT) from several seconds to hundreds of milliseconds. When calling external inference APIs at scale, transient rate limits (429) or gateway hiccups (503) occur. Exponential backoff (`base * 2^attempt + jitter`) prevents thundering-herd retries while failing fast on permanent 400/403 configuration errors.',
    diagramSteps: [
      { label: 'Stream Request', sublabel: 'SSE channel open' },
      { label: 'Chunk Delta', sublabel: 'Flush tokens to UI' },
      { label: '429 / 503 Catch', sublabel: 'Backoff + jitter' },
      { label: '400 / 403 Catch', sublabel: 'Immediate clear error' },
    ],
    pythonCode: `"""Exponential backoff with jitter for API resilience."""
import random
import time

def compute_backoff_seconds(attempt: int, base: float = 0.5, cap: float = 8.0) -> float:
    exp = min(cap, base * (2 ** attempt))
    jitter = random.uniform(0, 0.25 * exp)
    return round(exp + jitter, 3)

for attempt in range(4):
    print(f"Attempt {attempt + 1} delay: {compute_backoff_seconds(attempt)}s")`,
    expectedOutput: `Attempt 1 delay: ~0.55s\nAttempt 2 delay: ~1.12s\nAttempt 3 delay: ~2.30s\nAttempt 4 delay: ~4.45s`,
    exerciseSteps: [
      'Test streaming in Model Playground and watch the live waveform and incremental Markdown render.',
      'Run the backoff calculator in Coding Studio.',
    ],
    commonMistakes: [
      'Retrying HTTP 400 validation errors infinitely in a tight loop.',
      'Using blocking `response.text` calls for long-form generation when users expect real-time feedback.',
    ],
    quiz: {
      question: 'Which HTTP error codes are appropriate for exponential backoff retries?',
      options: ['400 Bad Request', '403 Permission Denied', '429 Rate Limit / 503 Unavailable', '404 Not Found'],
      correctIndex: 2,
      explanation: '429 and 503 are transient capacity conditions; 400, 403, and 404 indicate request or configuration errors.',
    },
    miniProject: 'Wrap a Python function with a 3-retry exponential backoff decorator that logs each wait interval.',
  },
  {
    id: 'L4-03',
    level: 4,
    levelTitle: 'Level 4: Python & API Development',
    title: '12. Multi-Turn Conversation History & Structured Output',
    topics: ['Conversation history', 'Structured output'],
    durationMinutes: 18,
    objectives: [
      'Persist multi-turn chat state in SQLite and replay turns cleanly.',
      'Validate JSON responses against typed schemas.',
    ],
    verifiedDocumentation: [
      'Use `ai.chats.create({ model, history, config })` and `chat.sendMessage({ message })` (do NOT pass `contents` to `chat.sendMessage`). For JSON, use `Type.OBJECT` / `Type.ARRAY` from `@google/genai`.',
    ],
    engineeringKnowledge:
      'Stateless HTTP servers reconstruct conversation state per request by loading ordered `(user, model)` turns from a database like SQLite or PostgreSQL. Combining chat memory with typed JSON outputs allows applications to extract structured records directly from natural-language dialogues.',
    diagramSteps: [
      { label: 'Load SQLite Turns', sublabel: 'Ordered history' },
      { label: 'ai.chats.create', sublabel: 'Attach systemInstruction' },
      { label: 'sendMessageStream', sublabel: 'Current user turn' },
      { label: 'Persist Turn', sublabel: 'Store tokens & latency' },
    ],
    pythonCode: `"""Validating structured JSON output in Python."""
import json

raw_json = '{"service": "hydrogen", "healthy": true, "latency_ms": 284}'
parsed = json.loads(raw_json)
assert isinstance(parsed["service"], str)
assert isinstance(parsed["healthy"], bool)
assert parsed["latency_ms"] > 0
print("Validated payload:", parsed)`,
    expectedOutput: `Validated payload: {'service': 'hydrogen', 'healthy': true, 'latency_ms': 284}`,
    exerciseSteps: [
      'Start a multi-turn conversation in Model Playground and ask a follow-up question referencing turn 1.',
      'Export the conversation JSON and inspect the persisted message metadata.',
    ],
    commonMistakes: [
      'Passing `contents` instead of `message` to `chat.sendMessage` in `@google/genai`.',
      'Declaring empty `Type.OBJECT` schemas without `properties`.',
    ],
    quiz: {
      question: 'In `@google/genai`, which parameter name does `chat.sendMessage` accept?',
      options: ['contents', 'prompt', 'message', 'query'],
      correctIndex: 2,
      explanation: 'chat.sendMessage and chat.sendMessageStream require the `message` parameter.',
    },
    miniProject: 'Write a Python schema validator checking required keys and numeric ranges on JSON outputs.',
  },

  // LEVEL 5: ADVANCED MODEL INTEGRATION
  {
    id: 'L5-01',
    level: 5,
    levelTitle: 'Level 5: Advanced Model Integration',
    title: '13. Function Calling & External Tool Integration',
    topics: ['Tool calling', 'Function calling', 'External tools'],
    durationMinutes: 22,
    objectives: [
      'Declare typed `FunctionDeclaration` tools for Gemini models.',
      'Execute deterministic local functions and return `functionResponse` parts.',
    ],
    verifiedDocumentation: [
      'Define tools via `tools: [{ functionDeclarations: [...] }]`. Inspect `response.functionCalls`, execute the verified local handler, and send back `functionResponse` matching `call.id` and `call.name`.',
    ],
    engineeringKnowledge:
      'Function calling turns an LLM from a passive text generator into an interface to deterministic systems (databases, calculators, REST APIs, sandboxes). Crucially, the model never executes functions directly: it emits structured arguments, your application validates and executes the code safely, and returns the real result.',
    diagramSteps: [
      { label: 'Declare Schema', sublabel: 'FunctionDeclaration' },
      { label: 'Model Tool Call', sublabel: 'Args JSON emitted' },
      { label: 'Local Execution', sublabel: 'Validated server code' },
      { label: 'FunctionResponse', sublabel: 'Final grounded answer' },
    ],
    pythonCode: `"""Simulating the deterministic tool-execution loop."""
def get_cluster_metrics(cluster_id: str) -> dict:
    inventory = {
        "prod-us": {"cpu_pct": 42.1, "active_workers": 12},
        "eu-west": {"cpu_pct": 67.8, "active_workers": 8},
    }
    return inventory.get(cluster_id, {"error": "Unknown cluster"})

# Simulated model FunctionCall output
model_call = {"name": "get_cluster_metrics", "args": {"cluster_id": "prod-us"}}
result = get_cluster_metrics(**model_call["args"])
print("Tool Result:", result)`,
    expectedOutput: `Tool Result: {'cpu_pct': 42.1, 'active_workers': 12}`,
    exerciseSteps: [
      'Explore the Function Calling tab in API Laboratory.',
      'Extend `get_cluster_metrics` in Coding Studio to validate `cluster_id` against an allowlist.',
    ],
    commonMistakes: [
      'Executing arbitrary unvalidated shell commands from model tool arguments.',
      'Forgetting to preserve `functionCall.id` when returning `functionResponse`.',
    ],
    quiz: {
      question: 'Who executes the actual code when Gemini emits a FunctionCall?',
      options: [
        'The Gemini server executes your local database directly',
        'Your application backend validates the arguments and executes the function safely',
        'The browser CSS engine',
        'No one executes it',
      ],
      correctIndex: 1,
      explanation: 'Gemini returns structured call arguments; your application retains full execution control.',
    },
    miniProject: 'Implement a safe Python calculator tool dispatcher supporting `mean`, `median`, and `stdev` operations.',
  },
  {
    id: 'L5-02',
    level: 5,
    levelTitle: 'Level 5: Advanced Model Integration',
    title: '14. Multimodal Inputs & High-Resolution Image Generation',
    topics: ['Multimodal input', 'File handling', 'Image understanding', 'Image generation'],
    durationMinutes: 20,
    objectives: [
      'Encode binary assets cleanly as `inlineData` parts.',
      'Generate configurable 1K, 2K, and 4K visual assets with `gemini-3-pro-image-preview`.',
    ],
    verifiedDocumentation: [
      'Pass `imageConfig: { aspectRatio, imageSize }` (`"1K"`, `"2K"`, `"4K"`) when generating images. Do NOT set `responseMimeType` or `responseSchema` on image generation models, and iterate all `parts` to find `inlineData`.',
    ],
    engineeringKnowledge:
      'Multimodal engineering pipelines inspect file signatures, enforce size limits before Base64 encoding, and route image understanding vs image synthesis to the appropriate specialized model. When generating high-resolution graphics (2K/4K), expect higher latency and handle potential text captions alongside inline image bytes.',
    diagramSteps: [
      { label: 'Prompt + Size', sublabel: '1K / 2K / 4K + Ratio' },
      { label: 'Image Model', sublabel: 'gemini-3-pro-image-preview' },
      { label: 'Iterate Parts', sublabel: 'Extract inlineData' },
      { label: 'Render & Export', sublabel: 'Data URL / PNG' },
    ],
    pythonCode: `"""Validating multimodal image upload constraints before API dispatch."""
ALLOWED_MIMES = {"image/png", "image/jpeg", "image/webp"}
MAX_BYTES = 5 * 1024 * 1024

def validate_upload(mime_type: str, size_bytes: int) -> bool:
    if mime_type not in ALLOWED_MIMES:
        raise ValueError(f"Unsupported MIME: {mime_type}")
    if size_bytes <= 0 or size_bytes > MAX_BYTES:
        raise ValueError("File size must be between 1 byte and 5 MB.")
    return True

print("Valid PNG:", validate_upload("image/png", 204800))`,
    expectedOutput: `Valid PNG: True`,
    exerciseSteps: [
      'Open Model Playground -> Image Generation mode.',
      'Select `1K`, `2K`, or `4K` resolution and inspect the server-side configuration in API Laboratory.',
    ],
    commonMistakes: [
      'Assuming `candidates[0].content.parts[0]` is always the image (sometimes text comes first).',
      'Setting `responseMimeType: "application/json"` on an image generation request.',
    ],
    quiz: {
      question: 'Which imageSize options are supported by high-quality Gemini Pro Image generation?',
      options: ['480p and 720p', '1K, 2K, and 4K', 'SVG only', '100x100 only'],
      correctIndex: 1,
      explanation: 'High-quality Gemini image models support 1K, 2K, and 4K imageSize presets.',
    },
    miniProject: 'Build a small MIME & file-extension verifier in Python that rejects mismatched extensions.',
  },
  {
    id: 'L5-03',
    level: 5,
    levelTitle: 'Level 5: Advanced Model Integration',
    title: '15. JSON Extraction Pipelines & External API Orchestration',
    topics: ['JSON output', 'API integration', 'Data pipelines'],
    durationMinutes: 18,
    objectives: [
      'Transform unstructured documents into normalized relational records.',
      'Combine Gemini structured extraction with Pandas/tabular profiling.',
    ],
    verifiedDocumentation: [
      'Use `Type.ARRAY` of `Type.OBJECT` in `responseSchema` to extract multi-row records cleanly.',
    ],
    engineeringKnowledge:
      'Unstructured logs, incident tickets, and research notes become queryable once mapped into strict JSON schemas. Pair schema-enforced extraction with deterministic post-checks (date parsing, numeric bounds, deduplication) before committing records to SQLite or PostgreSQL.',
    diagramSteps: [
      { label: 'Raw Unstructured Text', sublabel: 'Logs / Docs / Reports' },
      { label: 'Schema Extraction', sublabel: 'Structured JSON' },
      { label: 'Type Normalizer', sublabel: 'Bounds & nulls check' },
      { label: 'SQLite / Analytics', sublabel: 'Queryable table' },
    ],
    pythonCode: `"""Normalizing extracted JSON records before database insertion."""
records = [
    {"id": "101", "latency": "312.5", "status": " nominal "},
    {"id": "102", "latency": None, "status": "WARNING"},
]

normalized = [
    {
        "id": int(r["id"]),
        "latency_ms": float(r["latency"]) if r["latency"] is not None else 0.0,
        "status": r["status"].strip().lower(),
    }
    for r in records
]
print(normalized)`,
    expectedOutput: `[{'id': 101, 'latency_ms': 312.5, 'status': 'nominal'}, {'id': 102, 'latency_ms': 0.0, 'status': 'warning'}]`,
    exerciseSteps: [
      'Upload or load the sample dataset in Data Intelligence Lab.',
      'Run the automated cleaning pipeline and inspect missing value imputation.',
    ],
    commonMistakes: [
      'Inserting raw LLM JSON directly into SQL queries without parameterized bindings.',
      'Skipping null-safety checks on optional extracted numeric attributes.',
    ],
    quiz: {
      question: 'Why normalize extracted LLM JSON before persisting to SQL?',
      options: [
        'To enforce canonical types, trim whitespace, and safely handle nulls',
        'To remove all primary keys',
        'Because JSON cannot store numbers',
        'To increase database size',
      ],
      correctIndex: 0,
      explanation: 'Deterministic post-normalization guarantees clean schema types and safe database writes.',
    },
    miniProject: 'Write a normalizer in Coding Studio that converts messy string timestamps and numbers into clean dicts.',
  },

  // LEVEL 6: AGENTIC AI
  {
    id: 'L6-01',
    level: 6,
    levelTitle: 'Level 6: Agentic AI',
    title: '16. AI Agent Architecture, Planning, State & Memory',
    topics: ['AI agent architecture', 'Planning and execution', 'Agent state', 'Memory concepts'],
    durationMinutes: 22,
    objectives: [
      'Model agent execution as an explicit state machine rather than an unbounded loop.',
      'Differentiate short-term working state from persistent checkpoint memory.',
    ],
    verifiedDocumentation: [
      'Gemini 4 Hydrogen supports `ThinkingLevel.XHIGH` for complex multi-step planning and preserves `thoughtSignature` metadata across multi-turn tool calls.',
    ],
    engineeringKnowledge:
      'Reliable agents separate planning from execution using explicit typed state graphs. Each node reads the current state, invokes a bounded tool or model call, appends trace logs, and transitions along deterministic edges. Persistent checkpoints in SQLite allow workflows to pause, survive restarts, and resume cleanly.',
    diagramSteps: [
      { label: 'State Object', sublabel: 'Goal + Artifacts + Trace' },
      { label: 'Planner Node', sublabel: 'Decompose subtasks' },
      { label: 'Specialist Nodes', sublabel: 'Research / Code / Test' },
      { label: 'Checkpoint Store', sublabel: 'Resumable persistence' },
    ],
    pythonCode: `"""Explicit finite-state machine for a bounded agent workflow."""
from dataclasses import dataclass, field

@dataclass
class AgentState:
    goal: str
    step: str = "plan"
    artifacts: dict = field(default_factory=dict)
    max_hops: int = 5
    hops: int = 0

state = AgentState(goal="Validate telemetry parser")
while state.step != "done" and state.hops < state.max_hops:
    state.hops += 1
    if state.step == "plan":
        state.artifacts["plan"] = "Write & test parser"
        state.step = "execute"
    elif state.step == "execute":
        state.artifacts["test_passed"] = True
        state.step = "done"

print("Final state:", state)`,
    expectedOutput: `Final state: AgentState(goal='Validate telemetry parser', step='done', artifacts={'plan': 'Write & test parser', 'test_passed': True}, max_hops=5, hops=2)`,
    exerciseSteps: [
      'Open Agent Control Center and inspect the 6-node execution graph.',
      'Launch a workflow with Human Approval enabled and inspect the Orchestrator plan before resuming.',
    ],
    commonMistakes: [
      'Letting autonomous loops run without a `max_hops` or timeout ceiling.',
      'Losing intermediate tool traces when an agent fails midway.',
    ],
    quiz: {
      question: 'Why enforce an explicit `max_hops` or step budget in agent state machines?',
      options: [
        'To guarantee bounded execution and prevent infinite retry loops',
        'To disable tool calling',
        'To force random outputs',
        'To bypass authentication',
      ],
      correctIndex: 0,
      explanation: 'Bounded loops protect latency, cost, and system stability against cyclical agent failures.',
    },
    miniProject: 'Extend the Python `AgentState` class with a `tool_calls` list recording duration per transition.',
  },
  {
    id: 'L6-02',
    level: 6,
    levelTitle: 'Level 6: Agentic AI',
    title: '17. Multi-Agent Coordination & LangGraph Patterns',
    topics: ['Multi-agent coordination', 'LangGraph fundamentals', 'Workflow orchestration'],
    durationMinutes: 22,
    objectives: [
      'Design a supervisor-worker graph with specialized Research, Coding, Analyst, Testing, and Docs agents.',
      'Route tasks conditionally based on the goal rather than running unnecessary steps.',
    ],
    verifiedDocumentation: [
      'OXYGEN AI implements a LangGraph-inspired directed state graph where the Orchestrator outputs structured JSON routing decisions verified against allowed node names.',
    ],
    engineeringKnowledge:
      'Instead of one mega-prompt trying to research, code, test, and write docs at once, multi-agent graphs assign narrow responsibilities and tool permissions to each specialist. The Testing Agent can run actual code in an isolated sandbox and feed real `stderr` back into the workflow rather than guessing whether generated code works.',
    diagramSteps: [
      { label: 'Orchestrator', sublabel: 'JSON route plan' },
      { label: 'Research & Coding', sublabel: 'Artifact synthesis' },
      { label: 'Testing Sandbox', sublabel: 'Real assertion check' },
      { label: 'Docs Compiler', sublabel: 'Verified final report' },
    ],
    pythonCode: `"""Graph edge router validating specialist node transitions."""
VALID_NODES = {"research", "coding", "data_analyst", "testing", "documentation"}

def validate_route(proposed: list[str]) -> list[str]:
    clean = [n for n in proposed if n in VALID_NODES]
    if "documentation" not in clean:
        clean.append("documentation")
    return clean

print(validate_route(["research", "coding", "unknown_node", "testing"]))`,
    expectedOutput: `['research', 'coding', 'testing', 'documentation']`,
    exerciseSteps: [
      'Submit a goal like "Build a Python moving-average anomaly detector with unit tests" in Agent Control Center.',
      'Inspect the Testing Agent node output to verify real sandbox execution.',
    ],
    commonMistakes: [
      'Simulating test pass results with prose instead of running an actual sandbox process.',
      'Allowing orchestrators to route to arbitrary unvalidated node identifiers.',
    ],
    quiz: {
      question: 'What is the role of the Testing Agent in OXYGEN AI?',
      options: [
        'To invent hypothetical test outputs',
        'To execute generated Python code in an isolated sandbox and capture real exit codes',
        'To edit CSS variables',
        'To delete the database',
      ],
      correctIndex: 1,
      explanation: 'Real sandbox execution grounds the workflow in empirical pass/fail signals.',
    },
    miniProject: 'Review `server/agents.ts` in Documentation to trace how tool calls are persisted per checkpoint.',
  },
  {
    id: 'L6-03',
    level: 6,
    levelTitle: 'Level 6: Agentic AI',
    title: '18. Human Approval Gates & Failure Recovery',
    topics: ['Human approval', 'Failure recovery'],
    durationMinutes: 18,
    objectives: [
      'Pause autonomous pipelines before downstream code/execution nodes via human-in-the-loop checkpoints.',
      'Recover gracefully when a sandbox test or API call fails.',
    ],
    verifiedDocumentation: [
      'OXYGEN AI persists `awaiting_approval` checkpoints in SQLite so operators can inspect the Orchestrator plan and explicitly Approve or Reject execution.',
    ],
    engineeringKnowledge:
      'Human-in-the-loop (HITL) checkpoints are essential whenever agents mutate state, run generated code, or produce external reports. Checkpointing the workflow state before risky actions lets operators inspect rationale, reject flawed plans, or resume after transient failures.',
    diagramSteps: [
      { label: 'Plan Complete', sublabel: 'Checkpoint saved' },
      { label: 'HITL Gate', sublabel: 'awaiting_approval' },
      { label: 'Approve / Reject', sublabel: 'Operator decision' },
      { label: 'Resume or Abort', sublabel: 'Audited trace' },
    ],
    pythonCode: `"""Checkpointing workflow state with approval gate."""
def gate_transition(state: dict, approved: bool) -> dict:
    if state["status"] != "awaiting_approval":
        raise RuntimeError("Invalid state for approval transition")
    if approved:
        state["status"] = "running"
        state["audit"].append("Operator approved execution")
    else:
        state["status"] = "cancelled"
        state["audit"].append("Operator rejected execution")
    return state

wf = {"status": "awaiting_approval", "audit": []}
print(gate_transition(wf, approved=True))`,
    expectedOutput: `{'status': 'running', 'audit': ['Operator approved execution']}`,
    exerciseSteps: [
      'Run a workflow in Agent Control Center with "Require Human Approval" toggled ON.',
      'Click Approve & Resume (or Reject) and check the System Activity Log.',
    ],
    commonMistakes: [
      'Skipping human approval for destructive operations or unverified external mutations.',
      'Discarding error tracebacks instead of surfacing exact failure reasons to operators.',
    ],
    quiz: {
      question: 'Why persist workflow checkpoints to a database before an approval gate?',
      options: [
        'So the workflow can pause indefinitely and resume safely across requests',
        'To slow down the CPU',
        'To skip error handling',
        'To expose secrets',
      ],
      correctIndex: 0,
      explanation: 'Database checkpointing decouples human review latency from HTTP request lifetimes.',
    },
    miniProject: 'Test rejecting an agent workflow and verify the audit trail marks downstream nodes as skipped.',
  },

  // LEVEL 7: ADVANCED ENGINEERING
  {
    id: 'L7-01',
    level: 7,
    levelTitle: 'Level 7: Advanced Engineering',
    title: '19. Model Evaluation, Benchmarking & Prompt Testing',
    topics: ['Model evaluation', 'Benchmarking', 'Prompt testing'],
    durationMinutes: 20,
    objectives: [
      'Build reproducible benchmarks measuring latency, token consumption, JSON validity, and code pass rate.',
      'Distinguish actual measured runs from published reference figures.',
    ],
    verifiedDocumentation: [
      'OXYGEN AI Benchmark Center executes live prompts against configured models and verifies Python outputs inside the isolated sandbox.',
    ],
    engineeringKnowledge:
      'Never rely on anecdotal impressions when comparing models or thinking levels. Reproducible benchmark suites capture wall-clock milliseconds, exact token counts from `usageMetadata`, deterministic schema validation, and unit-test execution pass rates on identical prompt fixtures.',
    diagramSteps: [
      { label: 'Fixed Suite', sublabel: 'JSON + Code + QA' },
      { label: 'Live Inference', sublabel: 'Measured latency & tokens' },
      { label: 'Sandbox Grader', sublabel: 'Assert-based checks' },
      { label: 'Historical Ledger', sublabel: 'Cross-model compare' },
    ],
    pythonCode: `"""Computing composite reliability & latency summary from benchmark runs."""
runs = [
    {"model": "gemini-4-hydrogen", "passed": 3, "total": 3, "latency_ms": 480},
    {"model": "gemini-3.1-flash-lite", "passed": 3, "total": 3, "latency_ms": 145},
]

for r in runs:
    pass_rate = (r["passed"] / r["total"]) * 100
    print(f"{r['model']}: {pass_rate:.0f}% pass | {r['latency_ms']} ms avg")`,
    expectedOutput: `gemini-4-hydrogen: 100% pass | 480 ms avg\ngemini-3.1-flash-lite: 100% pass | 145 ms avg`,
    exerciseSteps: [
      'Open Benchmark Center and run the Hydrogen Core Verification Suite.',
      'Inspect per-case latency and sandbox assertion logs.',
    ],
    commonMistakes: [
      'Presenting simulated or copied leaderboard numbers as live measurements from your system.',
      'Comparing models across different prompt versions simultaneously.',
    ],
    quiz: {
      question: 'Which practice makes an internal model benchmark trustworthy?',
      options: [
        'Running identical test cases, measuring real latency/tokens, and verifying code via assertions',
        'Hardcoding 100% pass rates',
        'Changing prompts between models',
        'Ignoring failed JSON parses',
      ],
      correctIndex: 0,
      explanation: 'Controlled inputs plus deterministic graders produce reproducible, comparable metrics.',
    },
    miniProject: 'Run benchmarks for both `LOW` and `HIGH` thinking levels on Hydrogen and compare token overhead.',
  },
  {
    id: 'L7-02',
    level: 7,
    levelTitle: 'Level 7: Advanced Engineering',
    title: '20. Security, Guardrails, Data Privacy & Logging',
    topics: ['Security', 'Guardrails', 'Data privacy', 'Logging'],
    durationMinutes: 20,
    objectives: [
      'Enforce input validation, upload size caps, rate limiting, and sandbox isolation.',
      'Keep secrets and PII out of structured application logs.',
    ],
    verifiedDocumentation: [
      'OXYGEN AI enforces server-only `GEMINI_API_KEY` usage, 5MB upload validation, Python AST/module import restrictions, and secret-free activity logs.',
    ],
    engineeringKnowledge:
      'AI applications expand the attack surface through prompt injection, untrusted code generation, and oversized file uploads. Defense-in-depth requires validating every request schema, sandboxing executed code with CPU/memory/timeout limits and restricted imports, never auto-executing uploaded files, and redacting sensitive tokens from logs.',
    diagramSteps: [
      { label: 'Input Guard', sublabel: 'Schema & 5MB cap' },
      { label: 'Rate Limiter', sublabel: 'Per-IP throttling' },
      { label: 'AST Sandbox Guard', sublabel: 'Block os/subprocess/net' },
      { label: 'Redacted Audit', sublabel: 'Zero secret logging' },
    ],
    pythonCode: `"""Log sanitizer stripping bearer tokens and API keys before persistence."""
import re

def redact_secrets(log_line: str) -> str:
    log_line = re.sub(r"AIza[0-9A-Za-z\\-_]{20,}", "[REDACTED_KEY]", log_line)
    log_line = re.sub(r"Bearer\\s+[A-Za-z0-9\\-_.]+", "Bearer [REDACTED]", log_line)
    return log_line

sample = "Auth header Bearer eyJhbGciOiJIUzI1NiJ9 failed for key AIzaSyDemoSecretKey1234567890"
print(redact_secrets(sample))`,
    expectedOutput: `Auth header Bearer [REDACTED] failed for key [REDACTED_KEY]`,
    exerciseSteps: [
      'Try importing `os` or `subprocess` inside the AI Coding Studio Python sandbox and observe the security guard.',
      'Inspect `server/sandbox.ts` details in Documentation > Security Guidance.',
    ],
    commonMistakes: [
      'Auto-executing code returned by an LLM without isolation or timeouts.',
      'Logging full `process.env` or request Authorization headers during error debugging.',
    ],
    quiz: {
      question: 'Why does OXYGEN AI block `os`, `subprocess`, and `socket` inside the Python sandbox?',
      options: [
        'To prevent untrusted or generated code from accessing host files, processes, or networks',
        'Because Python 3 lacks those modules',
        'To increase runtime latency',
        'To disable math operations',
      ],
      correctIndex: 0,
      explanation: 'Restricting system and network modules enforces sandbox containment.',
    },
    miniProject: 'Write a unit test verifying that `redact_secrets` masks both Bearer tokens and Google API keys.',
  },
  {
    id: 'L7-03',
    level: 7,
    levelTitle: 'Level 7: Advanced Engineering',
    title: '21. Deployment, Docker, CI/CD & Cost Optimization',
    topics: ['Deployment', 'Docker', 'CI/CD', 'Cost optimization', 'Production monitoring'],
    durationMinutes: 20,
    objectives: [
      'Containerize full-stack AI platforms with multi-stage builds and non-root users.',
      'Optimize cost and reliability through model tiering, caching, and health probes.',
    ],
    verifiedDocumentation: [
      'OXYGEN AI builds via `npm run build` and runs on port `3000` with `/api/health` exposing runtime readiness without leaking secrets.',
    ],
    engineeringKnowledge:
      'Production deployment packages compiled static assets alongside the API server in a reproducible container image. Health checks verify server availability, CI/CD runs TypeScript checks (`tsc --noEmit`), unit tests, and container builds on every commit, and telemetry tracks latency percentiles and token cost per feature.',
    diagramSteps: [
      { label: 'CI Pipeline', sublabel: 'Lint + Test + Build' },
      { label: 'Docker Image', sublabel: 'Multi-stage runtime' },
      { label: 'Health Probe', sublabel: 'GET /api/health' },
      { label: 'Cost Telemetry', sublabel: 'Tokens & latency' },
    ],
    pythonCode: `"""Token cost estimator helper for production budget planning."""
def estimate_monthly_tokens(daily_requests: int, avg_prompt_tok: int, avg_out_tok: int) -> dict:
    daily_total = daily_requests * (avg_prompt_tok + avg_out_tok)
    monthly_total = daily_total * 30
    return {
        "daily_tokens": daily_total,
        "monthly_tokens": monthly_total,
        "monthly_millions": round(monthly_total / 1_000_000, 2),
    }

print(estimate_monthly_tokens(daily_requests=2500, avg_prompt_tok=450, avg_out_tok=350))`,
    expectedOutput: `{'daily_tokens': 2000000, 'monthly_tokens': 60000000, 'monthly_millions': 60.0}`,
    exerciseSteps: [
      'Inspect the Deployment & Docker specification in Documentation.',
      'Check live token totals and average latency inside Command Center.',
    ],
    commonMistakes: [
      'Running containers as `root` with devDependencies bundled into production images.',
      'Using an expensive reasoning model for high-volume classification tasks.',
    ],
    quiz: {
      question: 'Which strategy reduces AI inference cost without degrading complex task quality?',
      options: [
        'Routing simple fast tasks to Flash-Lite while reserving Hydrogen/Carbon for complex steps',
        'Disabling all timeouts',
        'Duplicating every prompt 3 times',
        'Using 4K images for text summaries',
      ],
      correctIndex: 0,
      explanation: 'Tiered model routing matches compute cost to actual task complexity.',
    },
    miniProject: 'Use the estimator above to compare monthly token footprints across 3 workload profiles.',
  },
];
