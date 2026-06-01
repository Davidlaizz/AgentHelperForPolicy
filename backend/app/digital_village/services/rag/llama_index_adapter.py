from __future__ import annotations

from dataclasses import dataclass

from llama_index.core import StorageContext, VectorStoreIndex
from llama_index.core.schema import NodeWithScore, TextNode
from llama_index.core.vector_stores import FilterOperator, MetadataFilter, MetadataFilters
from llama_index.vector_stores.postgres import PGVectorStore

from app.digital_village.config import dv_settings
from app.models import PolicyAttachment, PolicyChunk, PolicyDocument
from app.services.rag.embedding import ZhicetongEmbedding


@dataclass(frozen=True)
class LlamaIndexFilter:
    policy_level: str | None = None
    policy_category: str | None = None
    applicable_scope: str | None = None
    college: str | None = None


def get_dv_embed_model() -> ZhicetongEmbedding:
    return ZhicetongEmbedding()


def get_dv_vector_store() -> PGVectorStore:
    return PGVectorStore.from_params(
        host=dv_settings.dv_postgres_host,
        port=str(dv_settings.dv_postgres_port),
        database=dv_settings.dv_postgres_db,
        user=dv_settings.dv_postgres_user,
        password=dv_settings.dv_postgres_password,
        table_name=dv_settings.dv_llamaindex_vector_table,
        schema_name=dv_settings.dv_llamaindex_schema,
        embed_dim=dv_settings.dv_embedding_dimensions,
        use_jsonb=True,
        perform_setup=True,
    )


def build_dv_storage_context() -> StorageContext:
    return StorageContext.from_defaults(vector_store=get_dv_vector_store())


def build_dv_policy_node(
    chunk: PolicyChunk,
    document: PolicyDocument,
    attachment: PolicyAttachment | None = None,
) -> TextNode:
    metadata = build_dv_node_metadata(chunk, document, attachment)
    metadata_keys = list(metadata.keys())
    return TextNode(
        text=chunk.chunk_text,
        id_=str(chunk.id),
        metadata=metadata,
        excluded_embed_metadata_keys=metadata_keys,
        excluded_llm_metadata_keys=[],
    )


def build_dv_node_metadata(
    chunk: PolicyChunk,
    document: PolicyDocument,
    attachment: PolicyAttachment | None,
) -> dict[str, str | int | None]:
    return {
        "document_id": str(document.id),
        "chunk_id": str(chunk.id),
        "attachment_id": str(chunk.attachment_id) if chunk.attachment_id else None,
        "policy_level": document.policy_level,
        "policy_category": document.policy_category,
        "applicable_scope": document.applicable_scope,
        "college": document.college,
        "effective_from": document.effective_from.isoformat() if document.effective_from else None,
        "effective_to": document.effective_to.isoformat() if document.effective_to else None,
        "parent_document_id": str(attachment.parent_document_id) if attachment else None,
        "attachment_title": attachment.attachment_title if attachment else None,
        "page_no": chunk.page_no,
        "article_no": chunk.article_no,
    }


def dv_index_nodes(nodes: list[TextNode]) -> None:
    if not nodes:
        return
    VectorStoreIndex(
        nodes=nodes,
        storage_context=build_dv_storage_context(),
        embed_model=get_dv_embed_model(),
        show_progress=False,
    )


def dv_delete_document_nodes(document_id: str) -> None:
    filters = MetadataFilters(
        filters=[
            MetadataFilter(
                key="document_id",
                value=document_id,
                operator=FilterOperator.EQ,
            )
        ]
    )
    get_dv_vector_store().delete_nodes(filters=filters)


def dv_retrieve_nodes(
    query: str,
    filters: LlamaIndexFilter,
    top_k: int,
) -> list[NodeWithScore]:
    index = VectorStoreIndex.from_vector_store(
        vector_store=get_dv_vector_store(),
        embed_model=get_dv_embed_model(),
    )
    retriever = index.as_retriever(
        similarity_top_k=top_k,
        filters=build_dv_metadata_filters(filters),
    )
    return retriever.retrieve(query)


def build_dv_metadata_filters(filters: LlamaIndexFilter) -> MetadataFilters | None:
    metadata_filters: list[MetadataFilter] = []
    filter_values = {
        "policy_level": filters.policy_level,
        "policy_category": filters.policy_category,
        "applicable_scope": filters.applicable_scope,
        "college": filters.college,
    }

    for key, value in filter_values.items():
        if value:
            metadata_filters.append(
                MetadataFilter(
                    key=key,
                    value=value,
                    operator=FilterOperator.EQ,
                )
            )

    if not metadata_filters:
        return None
    return MetadataFilters(filters=metadata_filters)
