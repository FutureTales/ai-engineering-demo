-- Hybrid retrieval (paso-05-rag): full-text search in Spanish + vector search,
-- fused with Reciprocal Rank Fusion (RRF). Works FTS-only when no embedding is
-- given (no VOYAGE_API_KEY) or when chunks have no embeddings.
--
-- FTS uses OR between the query's terms: conversational messages ("tengo filas
-- en el check-in de mi hotel") would almost never match if every word were required.

create or replace function public.match_chunks(
  query_text text,
  query_embedding extensions.vector(1024) default null,
  match_count int default 8,
  line_filter text default null,
  rrf_k int default 60
)
returns table (
  chunk_id bigint,
  document_id bigint,
  source_path text,
  title text,
  kind text,
  service_id text,
  heading text,
  content text,
  score double precision,
  fts_rank bigint,
  vector_rank bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select nullif(replace(plainto_tsquery('spanish', query_text)::text, '&', '|'), '') as tsq
  ),
  candidates as (
    select c.id, c.fts, c.embedding
    from public.chunks c
    join public.documents d on d.id = c.document_id
    left join public.services s on s.id = d.service_id
    where line_filter is null or s.line = line_filter or d.kind = 'policy'
  ),
  fts as (
    select c.id, row_number() over (order by ts_rank_cd(c.fts, to_tsquery('spanish', q.tsq)) desc) as rnk
    from candidates c, q
    where q.tsq is not null and c.fts @@ to_tsquery('spanish', q.tsq)
    order by rnk
    limit 30
  ),
  vec as (
    select c.id, row_number() over (order by c.embedding operator(extensions.<=>) query_embedding) as rnk
    from candidates c
    where query_embedding is not null and c.embedding is not null
    order by c.embedding operator(extensions.<=>) query_embedding
    limit 30
  ),
  fused as (
    select
      coalesce(f.id, v.id) as id,
      coalesce(1.0 / (rrf_k + f.rnk), 0) + coalesce(1.0 / (rrf_k + v.rnk), 0) as score,
      f.rnk as fts_rank,
      v.rnk as vector_rank
    from fts f
    full outer join vec v on v.id = f.id
  )
  select
    c.id, d.id, d.source_path, d.title, d.kind, d.service_id, c.heading, c.content,
    fused.score, fused.fts_rank, fused.vector_rank
  from fused
  join public.chunks c on c.id = fused.id
  join public.documents d on d.id = c.document_id
  order by fused.score desc
  limit match_count;
$$;

revoke execute on function public.match_chunks(text, extensions.vector, int, text, int) from public, anon, authenticated;
grant execute on function public.match_chunks(text, extensions.vector, int, text, int) to service_role;
