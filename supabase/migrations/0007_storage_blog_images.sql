-- ══════════════════════════════════════════════════════════════
-- 0007 · Storage bucket 'blog-images' 생성 (public read)
--        블로그 썸네일/본문 이미지를 보관.
--        쓰기는 service_role 키로만 (서버 API 를 통해서만).
-- ══════════════════════════════════════════════════════════════

-- 버킷 생성 (idempotent)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images',
  'blog-images',
  true,                                          -- public read
  5242880,                                       -- 5MB per file
  array['image/png','image/jpeg','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 정책: 누구나 read 가능 (public bucket)
drop policy if exists "blog_images_public_read" on storage.objects;
create policy "blog_images_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'blog-images');

-- service_role 은 RLS 우회하므로 별도 insert policy 불필요.
-- anon · authenticated 는 write 불가 (policy 없음 = deny-all).
