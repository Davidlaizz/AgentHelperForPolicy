const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "unknown error");
    throw new Error(`API ${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------
export interface ChatRequest {
  question: string;
  session_id?: string | null;
  user_id?: string | null;
  top_k?: number;
  policy_category?: string | null;
  include_expired?: boolean;
}

export interface ChatCitation {
  citation_id: string;
  document_id: string;
  chunk_id: string;
  attachment_id: string | null;
  document_title: string;
  file_name: string;
  attachment_title: string | null;
  page_no: number | null;
  article_no: string | null;
  quote_text: string;
  final_score: number;
}

export interface AgentNodeResult {
  node_id: string;
  label: string;
  status: string;
  input_summary: string;
  output_summary: string;
}

export interface AgentResponse {
  nodes: AgentNodeResult[];
  graph_version: string;
}

export interface ChatResponse {
  session_id: string;
  user_message_id: string;
  assistant_message_id: string;
  question: string;
  answer: string;
  policy_basis: string;
  ai_inference: string;
  citations: ChatCitation[];
  retrieved_chunks?: Array<Record<string, unknown>>;
  agent?: AgentResponse;
}

export function askPolicyQuestion(data: ChatRequest): Promise<ChatResponse> {
  return request<ChatResponse>("/chat", {
    method: "POST",
    body: JSON.stringify({
      question: data.question,
      session_id: data.session_id || null,
      user_id: data.user_id || null,
      top_k: data.top_k || 5,
      policy_category: data.policy_category || null,
      include_expired: data.include_expired || false,
    }),
  });
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------
export interface PolicyDocumentItem {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  policy_level: string;
  policy_category: string;
  issuing_department: string | null;
  applicable_scope: string | null;
  college: string | null;
  publish_date: string | null;
  effective_from: string | null;
  effective_to: string | null;
  version: string | null;
  parse_status: string;
  parse_error: string | null;
  parsed_at: string | null;
  parsed_text_path: string | null;
  is_attachment: boolean;
  parent_document_id: string | null;
  attachment_title: string | null;
  chunk_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function listDocuments(): Promise<PolicyDocumentItem[]> {
  return request<PolicyDocumentItem[]>("/documents");
}

// ---------------------------------------------------------------------------
// RAG Search
// ---------------------------------------------------------------------------
export interface RAGSearchResult {
  chunk_id: string;
  document_id: string;
  attachment_id: string | null;
  document_title: string;
  file_name: string;
  chunk_text: string;
  section_title: string | null;
  article_no: string | null;
  page_no: number | null;
  policy_level: string;
  policy_category: string;
  applicable_scope: string | null;
  college: string | null;
  effective_from: string | null;
  effective_to: string | null;
  metadata: Record<string, unknown>;
  vector_score: number;
  keyword_score: number;
  authority_bonus: number;
  recency_bonus: number;
  relation_bonus: number;
  final_score: number;
  related_sources: unknown[];
}

export interface RAGSearchResponse {
  query: string;
  top_k: number;
  results: RAGSearchResult[];
}

export function searchRAG(
  query: string,
  top_k?: number,
  policy_category?: string
): Promise<RAGSearchResponse> {
  const params = new URLSearchParams({ query, top_k: String(top_k || 5) });
  if (policy_category) params.set("policy_category", policy_category);
  return request<RAGSearchResponse>(`/rag/search?${params.toString()}`);
}

// ---------------------------------------------------------------------------
// Management Dashboard
// ---------------------------------------------------------------------------
export interface CategoryCount {
  name: string;
  count: number;
}

export interface DashboardResponse {
  document_count: number;
  active_document_count: number;
  parsed_document_count: number;
  chunk_count: number;
  today_question_count: number;
  hot_question_count: number;
  standard_answer_count: number;
  high_risk_answer_count: number;
  service_case_count: number;
  memory_item_count: number;
  top_policy_categories: CategoryCount[];
  top_case_types: string[];
}

export function getDashboard(): Promise<DashboardResponse> {
  return request<DashboardResponse>("/management/dashboard");
}

// ---------------------------------------------------------------------------
// Hot Questions
// ---------------------------------------------------------------------------
export interface HotQuestionItem {
  id: string;
  question_text: string;
  normalized_question: string;
  policy_category: string | null;
  hit_count: number;
  last_asked_at: string | null;
  created_at: string;
  updated_at: string;
}

export function getHotQuestions(limit?: number): Promise<HotQuestionItem[]> {
  const params = limit ? `?limit=${limit}` : "";
  return request<HotQuestionItem[]>(`/management/hot-questions${params}`);
}

// ---------------------------------------------------------------------------
// Standard Answers
// ---------------------------------------------------------------------------
export interface StandardAnswerItem {
  id: string;
  title: string;
  policy_category: string | null;
  question_keywords: string | null;
  applicable_scope: string | null;
  answer_content: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function getStandardAnswers(): Promise<StandardAnswerItem[]> {
  return request<StandardAnswerItem[]>("/management/standard-answers");
}

// ---------------------------------------------------------------------------
// System Config
// ---------------------------------------------------------------------------
export interface ModelPreset {
  id: string;
  label: string;
  provider: string;
  model: string;
  api_url: string | null;
  description: string;
  keep_current_api_key: boolean;
}

export interface ModelServiceConfig {
  provider: string;
  model: string;
  api_url: string | null;
  api_key_status: string;
  api_key_masked: string | null;
  max_tokens: number | null;
  timeout_seconds: number;
  thinking_type: string | null;
  compatible_protocol: string;
  editable_fields: string[];
  available_presets: ModelPreset[];
}

export interface SystemConfigResponse {
  model_service: ModelServiceConfig;
  rag_service: Record<string, unknown>;
  agent_governance: Record<string, unknown>;
  edit_mode: string;
  edit_note: string;
  updated_at: string;
}

export function getSystemConfig(): Promise<SystemConfigResponse> {
  return request<SystemConfigResponse>("/management/system-config");
}

// ---------------------------------------------------------------------------
// Agent Graph
// ---------------------------------------------------------------------------
export interface AgentGraphNode {
  id: string;
  label: string;
  type: string;
  description: string | null;
  input_keys: string[] | Record<string, unknown> | null;
  output_keys: string[] | Record<string, unknown> | null;
  enabled: boolean;
  call_count: number;
  average_duration_ms: number | null;
  failure_count: number;
  last_failure_message: string | null;
  last_failure_at: string | null;
}

export interface AgentGraphEdge {
  source: string;
  target: string;
  condition: string | null;
  condition_expression: string | null;
}

export interface AgentGraphResponse {
  version: string;
  description: string;
  nodes: AgentGraphNode[];
  edges: AgentGraphEdge[];
}

export function getAgentGraph(): Promise<AgentGraphResponse> {
  return request<AgentGraphResponse>("/management/agent-graph");
}

export function getAgentNodes(): Promise<AgentGraphNode[]> {
  return request<AgentGraphNode[]>("/management/agent-nodes");
}

// ---------------------------------------------------------------------------
// Agent Runs
// ---------------------------------------------------------------------------
export interface AgentRunItem {
  run_id: string;
  session_id: string | null;
  question: string;
  intent: string | null;
  case_type: string | null;
  status: string;
  risk_level: string | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
}

export interface AgentStepLog {
  id: string;
  node_key: string;
  node_name: string;
  status: string;
  input_summary: string | null;
  output_summary: string | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
}

export interface AgentRunDetail {
  run: AgentRunItem;
  steps: AgentStepLog[];
}

export function getAgentRuns(limit?: number): Promise<AgentRunItem[]> {
  const params = limit ? `?limit=${limit}` : "";
  return request<AgentRunItem[]>(`/management/agent-runs${params}`);
}

export function getAgentRunDetail(runId: string): Promise<AgentRunDetail> {
  return request<AgentRunDetail>(`/management/agent-runs/${runId}`);
}

// ---------------------------------------------------------------------------
// Documents (CRUD)
// ---------------------------------------------------------------------------
export function uploadDocument(formData: FormData): Promise<PolicyDocumentItem> {
  const url = `${API_BASE}/documents/upload`;
  return fetch(url, { method: "POST", body: formData }).then(async (res) => {
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
    return res.json();
  });
}

export function parseDocument(docId: string): Promise<PolicyDocumentItem> {
  return request<PolicyDocumentItem>(`/documents/${docId}/parse`, { method: "POST" });
}

export function updateDocument(docId: string, data: Record<string, unknown>): Promise<PolicyDocumentItem> {
  return request<PolicyDocumentItem>(`/documents/${docId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function disableDocument(docId: string): Promise<PolicyDocumentItem> {
  return request<PolicyDocumentItem>(`/documents/${docId}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Policy Chunks
// ---------------------------------------------------------------------------
export interface PolicyChunkItem {
  chunk_id: string;
  document_id: string;
  document_title: string;
  file_name: string;
  chunk_index: number;
  chunk_text: string;
  section_title: string | null;
  article_no: string | null;
  page_no: number | null;
  policy_level: string | null;
  policy_category: string | null;
  applicable_scope: string | null;
  effective_from: string | null;
  effective_to: string | null;
  metadata: Record<string, unknown>;
}

export interface PolicyChunkListResponse {
  total: number;
  limit: number;
  offset: number;
  results: PolicyChunkItem[];
}

export function getPolicyChunks(params?: {
  document_id?: string;
  query?: string;
  limit?: number;
  offset?: number;
}): Promise<PolicyChunkListResponse> {
  const sp = new URLSearchParams();
  if (params?.document_id) sp.set("document_id", params.document_id);
  if (params?.query) sp.set("query", params.query);
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.offset) sp.set("offset", String(params.offset));
  const qs = sp.toString();
  return request<PolicyChunkListResponse>(`/management/policy-chunks${qs ? "?" + qs : ""}`);
}

// ---------------------------------------------------------------------------
// Standard Answers (CRUD)
// ---------------------------------------------------------------------------
export function createStandardAnswer(data: {
  title: string;
  policy_category?: string;
  answer_content: string;
}): Promise<StandardAnswerItem> {
  return request<StandardAnswerItem>("/management/standard-answers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateStandardAnswer(
  answerId: string,
  data: Partial<{ title: string; policy_category: string; answer_content: string; status: string }>
): Promise<StandardAnswerItem> {
  return request<StandardAnswerItem>(`/management/standard-answers/${answerId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function disableStandardAnswer(answerId: string): Promise<StandardAnswerItem> {
  return request<StandardAnswerItem>(`/management/standard-answers/${answerId}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// System Config Update
// ---------------------------------------------------------------------------
export function updateModelService(data: {
  provider?: string;
  model?: string;
  api_url?: string;
  api_key?: string;
  max_tokens?: number;
  timeout_seconds?: number;
  thinking_type?: string;
  clear_api_key?: boolean;
}): Promise<SystemConfigResponse> {
  return request<SystemConfigResponse>("/management/system-config/model-service", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ---------------------------------------------------------------------------
// Service Cases
// ---------------------------------------------------------------------------
export interface ServiceCaseItem {
  id: string;
  title: string;
  case_type: string;
  subject: string | null;
  region: string | null;
  stage: string | null;
  description: string | null;
  materials: unknown;
  steps: unknown;
  department: string | null;
  risk: string | null;
  tips: unknown;
  status: string;
  created_at: string;
  updated_at: string;
}

export function getServiceCases(params?: { case_type?: string; status_filter?: string }): Promise<ServiceCaseItem[]> {
  const sp = new URLSearchParams();
  if (params?.case_type) sp.set("case_type", params.case_type);
  if (params?.status_filter) sp.set("status_filter", params.status_filter);
  const qs = sp.toString();
  return request<ServiceCaseItem[]>(`/management/service-cases${qs ? "?" + qs : ""}`);
}

export function createServiceCase(data: {
  title: string;
  case_type: string;
  subject?: string;
  region?: string;
  stage?: string;
  description?: string;
  materials?: unknown;
  steps?: unknown;
  department?: string;
  risk?: string;
  tips?: unknown;
}): Promise<ServiceCaseItem> {
  return request<ServiceCaseItem>("/management/service-cases", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ---------------------------------------------------------------------------
// Agriculture Diagnosis
// ---------------------------------------------------------------------------
export interface AgricultureDiagnosisItem {
  id: string;
  problem: string;
  category: string;
  diagnosis: string | null;
  solution: string | null;
  digital_direction: string | null;
  policy_links: unknown;
  pain_points: unknown;
  actors: unknown;
  steps: unknown;
  metrics: unknown;
  risks: unknown;
  project_value: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function getAgricultureDiagnoses(params?: { category?: string }): Promise<AgricultureDiagnosisItem[]> {
  const sp = new URLSearchParams();
  if (params?.category) sp.set("category", params.category);
  const qs = sp.toString();
  return request<AgricultureDiagnosisItem[]>(`/management/agriculture-diagnoses${qs ? "?" + qs : ""}`);
}

export function createAgricultureDiagnosis(data: {
  problem: string;
  category: string;
  diagnosis?: string;
  solution?: string;
  digital_direction?: string;
  project_value?: string;
}): Promise<AgricultureDiagnosisItem> {
  return request<AgricultureDiagnosisItem>("/management/agriculture-diagnoses", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
export interface HealthStatus {
  status: string;
  service: string;
  database: string;
}

export function healthCheck(): Promise<HealthStatus> {
  return request<HealthStatus>("/health");
}
