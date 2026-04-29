"use client"

/**
 * 발행 세팅 모달 — 플라트라이프 어드민 단일 채널 전용.
 *
 * 동작:
 *  1) 카테고리 자동 매핑 결과 표시 (사용자가 변경 가능)
 *  2) 어드민 콘텐츠 매니저에 어떻게 보일지 row 미리보기
 *  3) 발행됐을 때 web /blog/[id] 화면 미리보기
 *  4) 게시 토글 — 디폴트 OFF (DRAFT 로 등록)
 *  5) 등록하기 버튼 — 다음 PR 에서 실제 API 호출 연결
 */

import { useMemo, useState } from "react"
import { DAB_CATEGORIES, type DabCategory, pickDabCategoryWithReason } from "@/lib/dab/category"
import { mapDraftToDabInput } from "@/lib/dab/mapping"

interface DraftLite {
  id: string
  title: string
  status: string
  primary_keyword: string | null
  secondary_keywords?: string[] | null
  body_markdown?: string | null
  hero_image_url?: string | null
  metadata?: {
    dab_blog_id?: number
    dab_status?: "DRAFT" | "PUBLISHED"
    dab_category?: string
    dab_registered_at?: string
    [k: string]: unknown
  } | null
  updated_at: string
}

interface TopicLite {
  journey_stage?: string | null
}

interface Props {
  draft: DraftLite
  topic?: TopicLite | null
  onClose: () => void
  /** "DRAFT" 또는 "PUBLISHED" 상태로 어드민에 등록 — 다음 PR 에서 실제 API call. */
  onSubmit?: (input: {
    category: DabCategory
    status: "DRAFT" | "PUBLISHED"
  }) => Promise<void>
}

export function PublishSettingModal({ draft, topic, onClose, onSubmit }: Props) {
  /* 자동 매핑 결과 + 매핑 사유 (UI 디버그용) */
  const auto = useMemo(
    () =>
      pickDabCategoryWithReason({
        title: draft.title,
        primaryKeyword: draft.primary_keyword,
        secondaryKeywords: draft.secondary_keywords ?? null,
        journeyStage: topic?.journey_stage ?? null,
      }),
    [draft, topic]
  )

  const [category, setCategory] = useState<DabCategory>(
    (draft.metadata?.dab_category as DabCategory) ?? auto.category
  )
  const [publishOn, setPublishOn] = useState<boolean>(
    draft.metadata?.dab_status === "PUBLISHED"
  )
  const [busy, setBusy] = useState(false)

  /* 어드민에 보낼 페이로드 (미리보기용) */
  const dabInput = useMemo(
    () =>
      mapDraftToDabInput(
        {
          title: draft.title,
          body_markdown: draft.body_markdown ?? null,
          cover_url: draft.hero_image_url ?? null,
          primary_keyword: draft.primary_keyword,
          secondary_keywords: draft.secondary_keywords ?? null,
        },
        topic ? { journey_stage: topic.journey_stage } : null,
        {
          forcedCategory: category,
          status: publishOn ? "PUBLISHED" : "DRAFT",
        }
      ),
    [draft, topic, category, publishOn]
  )

  const isAlreadyRegistered = !!draft.metadata?.dab_blog_id

  const handleSubmit = async () => {
    setBusy(true)
    try {
      await onSubmit?.({ category, status: publishOn ? "PUBLISHED" : "DRAFT" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.65)",
        display: "grid",
        placeItems: "center",
        zIndex: 100,
        backdropFilter: "blur(8px) saturate(140%)",
        WebkitBackdropFilter: "blur(8px) saturate(140%)",
        padding: 24,
        animation: "modal-fade-in 0.18s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: 16,
          width: "min(880px, 100%)",
          maxHeight: "calc(100vh - 48px)",
          overflow: "auto",
          boxShadow:
            "0 1px 3px rgba(15, 23, 42, 0.1), 0 24px 60px rgba(15, 23, 42, 0.30), 0 0 0 1px rgba(15, 23, 42, 0.06)",
          animation: "modal-pop 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <style jsx global>{`
          @keyframes modal-fade-in { from { opacity: 0; } to { opacity: 1; } }
          @keyframes modal-pop {
            from { opacity: 0; transform: translateY(8px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        {/* 헤더 */}
        <div
          style={{
            padding: "18px 24px 14px",
            background: "linear-gradient(180deg, #fafbff 0%, #ffffff 100%)",
            borderBottom: "1px solid #eef0ff",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: "var(--brand-700)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              발행 세팅 · 플라트라이프 어드민
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                lineHeight: 1.35,
                letterSpacing: "-0.01em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical" as const,
              }}
            >
              {draft.title}
            </div>
            {isAlreadyRegistered && (
              <div style={{ fontSize: 11.5, color: "#0e7490", marginTop: 6, fontWeight: 600 }}>
                ⓘ 이미 어드민에 등록됨 (id: {draft.metadata?.dab_blog_id}) — 재발행 시 덮어씁니다
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "var(--bg-subtle)",
              border: 0,
              width: 32,
              height: 32,
              borderRadius: 8,
              fontSize: 14,
              color: "var(--text-secondary)",
              cursor: "pointer",
              flexShrink: 0,
            }}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 바디 */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 22 }}>
          {/* 1. 카테고리 */}
          <section>
            <SectionLabel num="1" label="카테고리" right={
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                자동 매핑: <b style={{ color: "var(--brand-700)" }}>{auto.category}</b>{" "}
                <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
                  ({auto.reason === "keyword" ? "키워드 매칭" : auto.reason === "journey_stage" ? "여정 단계" : "디폴트"})
                </span>
              </span>
            } />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
              {DAB_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  style={{
                    padding: "9px 8px",
                    borderRadius: 8,
                    border: `1.5px solid ${category === c ? "var(--brand-500)" : "var(--border-default)"}`,
                    background: category === c ? "var(--brand-50)" : "white",
                    color: category === c ? "var(--brand-800, #3730a3)" : "var(--text-primary)",
                    fontSize: 12.5,
                    fontWeight: category === c ? 700 : 500,
                    cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </section>

          {/* 2. 게시 토글 */}
          <section>
            <SectionLabel num="2" label="게시 상태" />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                border: "1px solid var(--border-default)",
                borderRadius: 10,
                background: publishOn ? "#ecfdf5" : "var(--bg-subtle)",
                borderColor: publishOn ? "#a7f3d0" : "var(--border-default)",
                transition: "all 0.15s",
              }}
            >
              <ToggleSwitch on={publishOn} onToggle={() => setPublishOn((v) => !v)} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: publishOn ? "#047857" : "var(--text-primary)" }}>
                  {publishOn ? "🟢 게시 중 (PUBLISHED)" : "⚪️ 임시저장 (DRAFT)"}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                  {publishOn
                    ? "어드민 등록과 동시에 web 에 즉시 노출됩니다"
                    : "어드민 콘텐츠 매니저에만 등록 (web 노출 X). 나중에 토글 ON 으로 게시"}
                </div>
              </div>
            </div>
          </section>

          {/* 3. 어드민 콘텐츠 매니저 미리보기 */}
          <section>
            <SectionLabel num="3" label="어드민 콘텐츠 매니저에 이렇게 보입니다" />
            <AdminRowPreview input={dabInput} draft={draft} />
          </section>

          {/* 4. web 발행 미리보기 */}
          <section>
            <SectionLabel num="4" label={publishOn ? "web 화면 미리보기 (게시 ON)" : "web 화면 미리보기 (게시 OFF — 노출 X)"} />
            <WebBlogPreview input={dabInput} draft={draft} disabled={!publishOn} />
          </section>
        </div>

        {/* 푸터 */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #eef0ff",
            display: "flex",
            gap: 8,
            alignItems: "center",
            justifyContent: "flex-end",
            background: "#fafbff",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{
              background: "transparent",
              border: 0,
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--text-secondary)",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            닫기
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy || !onSubmit}
            style={{
              background:
                busy || !onSubmit
                  ? "#cbd5e1"
                  : publishOn
                  ? "linear-gradient(135deg, #047857 0%, #065f46 100%)"
                  : "linear-gradient(135deg, var(--brand-600) 0%, var(--brand-700) 100%)",
              color: "white",
              border: 0,
              padding: "10px 18px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: busy || !onSubmit ? "not-allowed" : "pointer",
              boxShadow: busy || !onSubmit ? "none" : "0 4px 12px rgba(99,102,241,0.25)",
            }}
            title={!onSubmit ? "다음 PR 에서 실제 등록 연결 예정" : undefined}
          >
            {busy
              ? "등록 중…"
              : publishOn
              ? "🚀 어드민에 등록 + 게시"
              : "📥 어드민에 임시저장 등록"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── 보조 컴포넌트 ─────────────────────────────────────────── */

function SectionLabel({
  num,
  label,
  right,
}: {
  num: string
  label: string
  right?: React.ReactNode
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "var(--brand-100)",
          color: "var(--brand-700)",
          fontSize: 11,
          fontWeight: 800,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        {num}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
        {label}
      </span>
      {right && (
        <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>{right}</div>
      )}
    </div>
  )
}

function ToggleSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      style={{
        width: 44,
        height: 24,
        borderRadius: 999,
        border: 0,
        background: on ? "#10b981" : "#cbd5e1",
        position: "relative",
        cursor: "pointer",
        transition: "background 0.18s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 22 : 2,
          width: 20,
          height: 20,
          background: "white",
          borderRadius: "50%",
          boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
          transition: "left 0.18s",
        }}
      />
    </button>
  )
}

/** 어드민 콘텐츠 매니저(`/julian/blog/manage`) 의 row 와 동일한 모양 */
function AdminRowPreview({
  input,
  draft,
}: {
  input: ReturnType<typeof mapDraftToDabInput>
  draft: DraftLite
}) {
  const isPublished = input.status === "PUBLISHED"
  return (
    <div
      style={{
        border: "1px solid var(--border-default)",
        borderRadius: 10,
        background: "white",
        overflow: "hidden",
        fontSize: 12,
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      {/* 헤더 — 대브 어드민 칼럼명 그대로 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "32px 60px 1fr 100px 80px 60px 60px 80px 50px",
          gap: 8,
          padding: "8px 12px",
          background: "var(--bg-subtle)",
          borderBottom: "1px solid var(--border-subtle)",
          fontSize: 10.5,
          fontWeight: 700,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        <div>#</div>
        <div>썸네일</div>
        <div>제목 / 작성자</div>
        <div>카테고리</div>
        <div>상태</div>
        <div style={{ textAlign: "right" }}>조회</div>
        <div style={{ textAlign: "right" }}>일평균</div>
        <div>작성일</div>
        <div style={{ textAlign: "center" }}>게시</div>
      </div>
      {/* row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "32px 60px 1fr 100px 80px 60px 60px 80px 50px",
          gap: 8,
          padding: "10px 12px",
          alignItems: "center",
          opacity: isPublished ? 1 : 0.65,
          fontSize: 12,
        }}
      >
        <div style={{ color: "var(--text-muted)", fontWeight: 600 }}>—</div>
        <div>
          {input.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={input.thumbnail}
              alt=""
              style={{ width: 48, height: 32, objectFit: "cover", borderRadius: 4, display: "block" }}
            />
          ) : (
            <div
              style={{
                width: 48,
                height: 32,
                background: "var(--bg-muted)",
                borderRadius: 4,
                display: "grid",
                placeItems: "center",
                color: "var(--text-muted)",
                fontSize: 14,
              }}
            >
              📄
            </div>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {input.title}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 1 }}>
            {input.authorName}
          </div>
        </div>
        <div>
          <span
            style={{
              fontSize: 10.5,
              padding: "2px 8px",
              borderRadius: 4,
              background: "#f3f4f6",
              color: "var(--text-secondary)",
              fontWeight: 600,
            }}
          >
            {input.category}
          </span>
        </div>
        <div>
          {isPublished ? (
            <span
              style={{
                fontSize: 10,
                padding: "2px 6px",
                borderRadius: 4,
                background: "#d1fae5",
                color: "#047857",
                fontWeight: 700,
              }}
            >
              게시 중
            </span>
          ) : (
            <span
              style={{
                fontSize: 10,
                padding: "2px 6px",
                borderRadius: 4,
                border: "1px solid var(--border-default)",
                color: "var(--text-muted)",
                fontWeight: 600,
              }}
            >
              임시저장
            </span>
          )}
        </div>
        <div style={{ textAlign: "right", color: "var(--text-muted)" }}>0</div>
        <div style={{ textAlign: "right", color: "var(--text-muted)" }}>0.0</div>
        <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
          {new Date(draft.updated_at).toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" })}
        </div>
        <div style={{ textAlign: "center" }}>
          <span
            style={{
              display: "inline-block",
              width: 26,
              height: 14,
              background: isPublished ? "#10b981" : "#cbd5e1",
              borderRadius: 999,
              position: "relative",
              verticalAlign: "middle",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 1,
                left: isPublished ? 13 : 1,
                width: 12,
                height: 12,
                background: "white",
                borderRadius: "50%",
              }}
            />
          </span>
        </div>
      </div>
    </div>
  )
}

/** web /blog/[id] 화면 미리보기 — 카테고리 배지 + 커버 이미지 + 제목 + summary */
function WebBlogPreview({
  input,
  draft,
  disabled,
}: {
  input: ReturnType<typeof mapDraftToDabInput>
  draft: DraftLite
  disabled?: boolean
}) {
  return (
    <div
      style={{
        border: "1px solid var(--border-default)",
        borderRadius: 12,
        background: "white",
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        position: "relative",
      }}
    >
      {disabled && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255,255,255,0.55)",
            backdropFilter: "blur(2px)",
            display: "grid",
            placeItems: "center",
            zIndex: 5,
            color: "#475569",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          🚫 게시 OFF — web 에 노출되지 않음
        </div>
      )}
      <div style={{ padding: "16px 18px 4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#475569" }}>
          <span
            style={{
              fontSize: 10.5,
              padding: "2px 8px",
              borderRadius: 4,
              background: "var(--brand-50)",
              color: "var(--brand-700)",
              fontWeight: 700,
            }}
          >
            {input.category}
          </span>
          <span>{new Date(draft.updated_at).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}</span>
        </div>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 1.4,
            marginTop: 6,
            letterSpacing: "-0.01em",
          }}
        >
          {input.title}
        </h1>
      </div>
      {input.thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={input.thumbnail}
          alt=""
          style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block", marginTop: 10 }}
        />
      )}
      <div style={{ padding: "14px 18px 18px", color: "#475569", fontSize: 12.5, lineHeight: 1.65 }}>
        {input.summary && (
          <div style={{ display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
            {input.summary}
          </div>
        )}
        <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-muted)" }}>
          ⓘ 본문 전체는 등록 후 web 에 노출됩니다 (HTML {((input.content?.length ?? 0) / 1000).toFixed(1)}KB)
        </div>
      </div>
    </div>
  )
}
