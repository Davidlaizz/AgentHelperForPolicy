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
