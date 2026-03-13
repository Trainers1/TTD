"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./admin.module.css";

/* ── YouTube URL에서 영상 ID 추출 ── */
function getYoutubeId(url) {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

/* ── [[빨간색]] 헤드라인 미리보기 파싱 ── */
function parseHeadlinePreview(text) {
  if (!text) return null;
  const parts = text.split(/(\[\[[\s\S]*?\]\])/);
  const result = [];
  parts.forEach((part, i) => {
    if (part.startsWith("[[") && part.endsWith("]]")) {
      result.push(
        <em
          key={i}
          style={{
            color: "#e8533e",
            fontStyle: "normal",
            fontWeight: "inherit",
          }}
        >
          {part.slice(2, -2)}
        </em>,
      );
    } else {
      part.split("\n").forEach((line, j) => {
        if (j > 0) result.push(<br key={`${i}-${j}`} />);
        if (line) result.push(line);
      });
    }
  });
  return result;
}

/* ── 날짜 문자열 → 표시용 값 변환 ── */
const MONTHS_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAYS_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function dateToDisplay(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T12:00:00");
  if (isNaN(d)) return null;
  return {
    month: `${MONTHS_EN[d.getMonth()]} ${d.getFullYear()}`,
    day: `${d.getDate()}일`,
    dow: DAYS_EN[d.getDay()],
  };
}

/* ── 다음 달 세 번째 토요일 계산 ── */
function getNextThirdSaturday() {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1; // 다음 달
  if (month > 11) {
    month = 0;
    year++;
  }
  // 해당 월 1일의 요일
  const first = new Date(year, month, 1);
  const firstDay = first.getDay(); // 0=일 ~ 6=토
  // 첫 번째 토요일 날짜
  const firstSat = firstDay <= 6 ? 6 - firstDay + 1 : 1;
  // 세 번째 토요일 = 첫 번째 토요일 + 14
  const thirdSat = firstSat + 14;
  const d = new Date(year, month, thirdSat);
  return d.toISOString().split("T")[0]; // "YYYY-MM-DD"
}

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ── 파일 업로드 헬퍼 (브라우저 → Supabase 직접 업로드) ── */
async function uploadFile(file) {
  // 1단계: 서버에서 서명된 업로드 URL 발급
  const prepRes = await fetch("/api/admin/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name }),
  });
  const prepData = await prepRes.json();
  if (!prepData.success) return prepData;

  // 2단계: 브라우저에서 Supabase로 직접 PUT 업로드 (서버 경유 없음)
  const uploadRes = await fetch(prepData.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": prepData.contentType },
    body: file,
  });
  if (!uploadRes.ok) {
    return { success: false, message: `업로드 실패 (${uploadRes.status})` };
  }

  return { success: true, url: prepData.publicUrl, mediaType: prepData.mediaType };
}

export default function AdminPage() {
  const [auth, setAuth] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [content, setContent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [activeTab, setActiveTab] = useState("intro");

  /* ── 게시판 관리 상태 ── */
  const [boardPosts, setBoardPosts] = useState([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [postComments, setPostComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  /* ── 로그인 상태 확인 ── */
  useEffect(() => {
    fetch("/api/admin/auth")
      .then((r) => r.json())
      .then((d) => {
        setAuth(d.authenticated);
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  /* ── 콘텐츠 불러오기 ── */
  const loadContent = useCallback(() => {
    fetch("/api/admin/content")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setContent(d.data);
      });
  }, []);

  useEffect(() => {
    if (auth) loadContent();
  }, [auth, loadContent]);

  /* ── 지난 날짜 자동 갱신 (다음 달 세 번째 토요일) ── */
  useEffect(() => {
    if (!content?.schedule?.date) return;
    const today = getTodayStr();
    if (content.schedule.date < today) {
      const next = getNextThirdSaturday();
      const currentVol = String(content.schedule.vol ?? "");
      const numMatch = currentVol.match(/\d+/);
      const nextVol = numMatch
        ? currentVol.replace(/\d+/, String(Number(numMatch[0]) + 1))
        : currentVol;
      setContent((prev) => ({
        ...prev,
        schedule: { ...prev.schedule, date: next, vol: nextVol },
      }));
    }
  }, [content?.schedule?.date]);

  /* ── 로그인 ── */
  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (data.success) {
      setAuth(true);
      setPassword("");
    } else setError(data.message);
  }

  /* ── 로그아웃 ── */
  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuth(false);
    setContent(null);
  }

  /* ── 저장 ── */
  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/admin/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content),
    });
    const data = await res.json();
    setSaving(false);
    showToast(data.success ? "저장되었습니다!" : data.message || "저장 실패");
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  /* ── 필드 업데이트 헬퍼 ── */
  function updateField(section, key, value) {
    setContent((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  }

  function updateSlide(index, key, value) {
    setContent((prev) => {
      const slides = [...prev.slides];
      slides[index] = { ...slides[index], [key]: value };
      return { ...prev, slides };
    });
  }

  function addSlide() {
    setContent((prev) => ({
      ...prev,
      slides: [
        ...prev.slides,
        { id: Date.now(), label: "", imageUrl: "", mediaType: "image" },
      ],
    }));
  }

  async function removeSlide(index) {
    setContent((prev) => {
      if (prev.slides.length <= 1) return prev;
      const slide = prev.slides[index];
      // Supabase에 업로드된 파일만 삭제 시도 (외부 URL·YouTube 제외)
      const urls = [slide.imageUrl, slide.mobileUrl].filter(
        (u) => u && u.includes("/storage/v1/object/public/")
      );
      if (urls.length > 0) {
        fetch("/api/admin/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls }),
        });
      }
      const slides = prev.slides.filter((_, i) => i !== index);
      return { ...prev, slides };
    });
  }

  function updatePrize(index, key, value) {
    setContent((prev) => {
      const prizes = [...prev.prizes];
      prizes[index] = { ...prizes[index], [key]: value };
      return { ...prev, prizes };
    });
  }

  function addPrize() {
    setContent((prev) => ({
      ...prev,
      prizes: [
        ...prev.prizes,
        { rank: prev.prizes.length + 1, name: "", count: "1명" },
      ],
    }));
  }

  function removePrize(index) {
    setContent((prev) => ({
      ...prev,
      prizes: prev.prizes
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, rank: i + 1 })),
    }));
  }

  function addNotice() {
    setContent((prev) => ({
      ...prev,
      seller: { ...prev.seller, notices: [...(prev.seller.notices || []), ""] },
    }));
  }

  function removeNotice(index) {
    setContent((prev) => ({
      ...prev,
      seller: {
        ...prev.seller,
        notices: (prev.seller.notices || []).filter((_, i) => i !== index),
      },
    }));
  }

  function updateNotice(index, value) {
    setContent((prev) => {
      const notices = [...(prev.seller.notices || [])];
      notices[index] = value;
      return { ...prev, seller: { ...prev.seller, notices } };
    });
  }

  function addFooterLink() {
    setContent((prev) => ({
      ...prev,
      footerLinks: [
        ...(prev.footerLinks || []),
        { id: Date.now(), name: "", url: "" },
      ],
    }));
  }

  function removeFooterLink(index) {
    setContent((prev) => ({
      ...prev,
      footerLinks: (prev.footerLinks || []).filter((_, i) => i !== index),
    }));
  }

  function updateFooterLink(index, key, value) {
    setContent((prev) => {
      const footerLinks = [...(prev.footerLinks || [])];
      footerLinks[index] = { ...footerLinks[index], [key]: value };
      return { ...prev, footerLinks };
    });
  }

  /* ── 게시판 관리 함수 ── */
  async function loadBoardPosts() {
    setBoardLoading(true);
    try {
      const res = await fetch("/api/admin/board");
      const d = await res.json();
      if (d.success) setBoardPosts(d.posts);
    } finally {
      setBoardLoading(false);
    }
  }

  async function loadPostComments(postId) {
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/admin/board/comments?post_id=${postId}`);
      const d = await res.json();
      if (d.success) setPostComments(d.comments);
    } finally {
      setCommentsLoading(false);
    }
  }

  function handleSelectPost(post) {
    if (selectedPost?.id === post.id) {
      setSelectedPost(null);
      setPostComments([]);
    } else {
      setSelectedPost(post);
      loadPostComments(post.id);
    }
  }

  async function toggleHidden(type, id, currentHidden) {
    const res = await fetch("/api/admin/board", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, hidden: !currentHidden }),
    });
    const d = await res.json();
    if (d.success) {
      showToast(
        !currentHidden ? "숨김 처리되었습니다." : "숨김 해제되었습니다.",
      );
      if (type === "post") {
        setBoardPosts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, hidden: !currentHidden } : p)),
        );
      } else {
        setPostComments((prev) =>
          prev.map((c) => (c.id === id ? { ...c, hidden: !currentHidden } : c)),
        );
      }
    } else {
      showToast(d.message || "처리 실패");
    }
  }

  /* ── 미디어 업로드 핸들러 ── */
  async function handleSlideUpload(index, file, field = "imageUrl") {
    showToast("업로드 중...");
    const data = await uploadFile(file);
    if (data.success) {
      updateSlide(index, field, data.url);
      if (field === "imageUrl") updateSlide(index, "mediaType", data.mediaType || "image");
      showToast("업로드 완료!");
    } else {
      showToast(data.message || "업로드 실패");
    }
  }

  async function handlePrizeImageUpload(file) {
    showToast("업로드 중...");
    const data = await uploadFile(file);
    if (data.success) {
      setContent((prev) => ({ ...prev, prizeImageUrl: data.url }));
      showToast("이미지 업로드 완료!");
    } else showToast(data.message || "업로드 실패");
  }

  /* ── 로딩 ── */
  if (checking)
    return (
      <div className={styles.loginWrap}>
        <div className={styles.loginCard}>
          <p style={{ color: "#7a7680", textAlign: "center" }}>확인 중...</p>
        </div>
      </div>
    );

  /* ── 로그인 화면 ── */
  if (!auth)
    return (
      <div className={styles.loginWrap}>
        <form className={styles.loginCard} onSubmit={handleLogin}>
          <div className={styles.loginLogo}>
            ㅌㅌㄷ<span>.</span>
          </div>
          <p className={styles.loginLabel}>관리자 로그인</p>
          <input
            type="password"
            className={styles.loginInput}
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p className={styles.loginError}>{error}</p>}
          <button type="submit" className={styles.loginBtn}>
            로그인
          </button>
        </form>
      </div>
    );

  /* ── 콘텐츠 로딩 ── */
  if (!content)
    return (
      <div className={styles.loginWrap}>
        <div className={styles.loginCard}>
          <p style={{ color: "#7a7680", textAlign: "center" }}>
            불러오는 중...
          </p>
        </div>
      </div>
    );

  const tabs = [
    { key: "intro", label: "소개" },
    { key: "slides", label: "슬라이더" },
    { key: "schedule", label: "일정" },
    { key: "prizes", label: "추첨 경품" },
    { key: "seller", label: "셀러 모집" },
    { key: "board", label: "게시판" },
  ];

  const dateDisplay = dateToDisplay(content.schedule?.date);

  return (
    <div className={styles.dashboard}>
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* ── 사이드바 ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          ㅌㅌㄷ<span>.</span>
        </div>
        <p className={styles.sidebarLabel}>Admin</p>
        <nav className={styles.sidebarNav}>
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`${styles.sidebarItem} ${activeTab === t.key ? styles.sidebarActive : ""}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className={styles.sidebarBottom}>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "저장 중..." : "💾 변경사항 저장"}
          </button>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </aside>

      {/* ── 메인 ── */}
      <main className={styles.main}>
        <div className={styles.mainHeader}>
          <h1>{tabs.find((t) => t.key === activeTab)?.label} 관리</h1>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.previewLink}
          >
            사이트로 이동 ↗
          </a>
        </div>

        {/* ════ 소개 ════ */}
        {activeTab === "intro" && (
          <div className={styles.section}>
            {/* 사이트 점검 모드 토글 */}
            <div
              className={styles.boardToggleRow}
              style={{
                background: content.maintenanceMode
                  ? "rgba(232,83,62,0.08)"
                  : undefined,
                borderRadius: 10,
                padding: "16px 20px",
                marginBottom: 8,
              }}
            >
              <div>
                <div className={styles.boardToggleLabel}>사이트 점검 모드</div>
                <div className={styles.boardToggleDesc}>
                  활성화하면 메인 페이지와 게시판이 점검 중 화면으로 전환됩니다.
                  (관리자 페이지는 유지)
                </div>
              </div>
              <button
                className={`${styles.toggle} ${content.maintenanceMode ? styles.toggleOn : ""}`}
                onClick={() =>
                  setContent((prev) => ({
                    ...prev,
                    maintenanceMode: !prev.maintenanceMode,
                  }))
                }
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>
            {content.maintenanceMode && (
              <p
                className={styles.boardPausedBadge}
                style={{
                  background: "rgba(232,83,62,0.12)",
                  color: "#e8533e",
                  borderColor: "rgba(232,83,62,0.25)",
                }}
              >
                현재 점검 모드가 활성화된 상태입니다. 변경사항 저장 버튼을
                눌러야 적용됩니다.
              </p>
            )}

            <div className={styles.divider} />

            <div className={styles.field}>
              <label>메인 헤드라인</label>
              <textarea
                rows={3}
                value={content.intro.headline}
                onChange={(e) =>
                  updateField("intro", "headline", e.target.value)
                }
              />
              <span className={styles.hint}>
                줄바꿈(Enter)과{" "}
                <code className={styles.code}>{"[[빨간색 단어]]"}</code> 마크업
                사용 가능
              </span>
              {content.intro.headline && (
                <div className={styles.headlinePreview}>
                  {parseHeadlinePreview(content.intro.headline)}
                </div>
              )}
            </div>
            <div className={styles.field}>
              <label>소개 텍스트 (단락 1)</label>
              <textarea
                rows={3}
                value={content.intro.description1}
                onChange={(e) =>
                  updateField("intro", "description1", e.target.value)
                }
              />
            </div>
            <div className={styles.field}>
              <label>소개 텍스트 (단락 2)</label>
              <textarea
                rows={3}
                value={content.intro.description2}
                onChange={(e) =>
                  updateField("intro", "description2", e.target.value)
                }
              />
              <span className={styles.hint}>줄바꿈(Enter) 사용 가능</span>
            </div>

            <div className={styles.divider} />

            <div className={styles.field}>
              <label>카카오톡 채널 URL</label>
              <input
                type="text"
                placeholder="https://pf.kakao.com/..."
                value={content.navbarKakaoUrl ?? ""}
                onChange={(e) =>
                  setContent((prev) => ({
                    ...prev,
                    navbarKakaoUrl: e.target.value,
                  }))
                }
              />
              <span className={styles.hint}>
                헤더 &apos;카카오톡 문의&apos; 버튼 및 푸터 &apos;카카오톡
                채널&apos; 링크에 공통 적용. 비워두면 버튼이 표시되지 않습니다.
              </span>
            </div>
            <div className={styles.divider} />

            <div className={styles.noticeSection}>
              <div className={styles.noticeSectionHeader}>
                <span className={styles.noticeTitle}>푸터 링크 관리</span>
                <button className={styles.addBtn} onClick={addFooterLink}>
                  + 링크 추가
                </button>
              </div>
              <p className={styles.sectionDesc} style={{ marginBottom: 12 }}>
                푸터에 표시될 링크 목록입니다. 표시 이름과 URL을 입력하세요.
                (예: Instagram, YouTube, X 등)
              </p>
              {(content.footerLinks || []).length === 0 && (
                <p style={{ color: "#7a7680", fontSize: 14 }}>
                  추가된 링크가 없습니다.
                </p>
              )}
              {(content.footerLinks || []).map((link, i) => (
                <div key={link.id} className={styles.noticeRow}>
                  <span className={styles.noticeNum}>{i + 1}</span>
                  <input
                    type="text"
                    className={styles.noticeInput}
                    style={{ width: 130, flexShrink: 0 }}
                    value={link.name}
                    onChange={(e) => updateFooterLink(i, "name", e.target.value)}
                    placeholder="표시 이름 (예: Instagram)"
                  />
                  <input
                    type="text"
                    className={styles.noticeInput}
                    value={link.url}
                    onChange={(e) => updateFooterLink(i, "url", e.target.value)}
                    placeholder="URL (https://...)"
                  />
                  <button
                    className={styles.deleteBtn}
                    onClick={() => removeFooterLink(i)}
                    title="삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ 슬라이더 ════ */}
        {activeTab === "slides" && (
          <div className={styles.section}>
            <p className={styles.sectionDesc}>
              슬라이더에 표시될 이미지·영상을 URL 입력 또는 파일 업로드로
              설정하세요. 이미지(JPG, PNG, GIF, WEBP) 및 영상(MP4, WEBM, MOV)
              지원.
            </p>
            {content.slides.map((slide, i) => (
              <div key={slide.id} className={styles.slideCard}>
                <div className={styles.slideNum}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className={styles.slideFields}>
                  <div className={styles.row2}>
                    <div className={styles.field}>
                      <label>라벨</label>
                      <input
                        type="text"
                        value={slide.label}
                        onChange={(e) =>
                          updateSlide(i, "label", e.target.value)
                        }
                      />
                    </div>
                    <div className={styles.field} style={{ flexShrink: 0, width: "auto" }}>
                      <label>미디어 타입</label>
                      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                        {["image", "video"].map((type) => (
                          <button
                            key={type}
                            onClick={() => updateSlide(i, "mediaType", type)}
                            style={{
                              padding: "5px 14px",
                              borderRadius: 6,
                              border: "1px solid",
                              fontSize: 13,
                              cursor: "pointer",
                              background: slide.mediaType === type ? "#e8533e" : "none",
                              borderColor: slide.mediaType === type ? "#e8533e" : "#3e3e46",
                              color: slide.mediaType === type ? "#fff" : "#7a7680",
                              transition: "all 0.15s",
                            }}
                          >
                            {type === "image" ? "이미지" : "영상"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* PC용 */}
                  <div className={styles.field}>
                    <label>PC용 URL</label>
                    <input
                      type="text"
                      placeholder="https://example.com/media.mp4"
                      value={slide.imageUrl}
                      onChange={(e) =>
                        updateSlide(i, "imageUrl", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.uploadRow}>
                    <span className={styles.uploadOr}>또는</span>
                    <label className={styles.uploadBtn}>
                      📁 PC용 파일 업로드
                      <input
                        type="file"
                        accept="image/*,video/mp4,video/webm,video/quicktime"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          if (e.target.files?.[0])
                            handleSlideUpload(i, e.target.files[0], "imageUrl");
                        }}
                      />
                    </label>
                  </div>
                  {slide.imageUrl && (
                    <div className={styles.preview}>
                      {getYoutubeId(slide.imageUrl) ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${getYoutubeId(slide.imageUrl)}?mute=1&rel=0`}
                          style={{ width: "100%", height: 160, border: "none" }}
                          allow="encrypted-media"
                          allowFullScreen
                        />
                      ) : slide.mediaType === "video" ? (
                        <video
                          src={slide.imageUrl}
                          style={{ width: "100%", height: 160, objectFit: "cover" }}
                          muted
                          playsInline
                          controls
                        />
                      ) : (
                        <img src={slide.imageUrl} alt={slide.label} />
                      )}
                    </div>
                  )}

                  {/* 모바일용 */}
                  <div className={styles.field} style={{ marginTop: 8 }}>
                    <label>
                      모바일용 URL{" "}
                      <span style={{ fontWeight: 400, color: "#7a7680", fontSize: 12 }}>
                        (선택 — 비우면 PC용 이미지 사용)
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="https://example.com/mobile.jpg"
                      value={slide.mobileUrl ?? ""}
                      onChange={(e) =>
                        updateSlide(i, "mobileUrl", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.uploadRow}>
                    <span className={styles.uploadOr}>또는</span>
                    <label className={styles.uploadBtn}>
                      📁 모바일용 파일 업로드
                      <input
                        type="file"
                        accept="image/*,video/mp4,video/webm,video/quicktime"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          if (e.target.files?.[0])
                            handleSlideUpload(i, e.target.files[0], "mobileUrl");
                        }}
                      />
                    </label>
                  </div>
                  {slide.mobileUrl && (
                    <div className={styles.preview}>
                      {slide.mediaType === "video" ? (
                        <video
                          src={slide.mobileUrl}
                          style={{ width: "100%", height: 160, objectFit: "cover" }}
                          muted
                          playsInline
                          controls
                        />
                      ) : (
                        <img src={slide.mobileUrl} alt={`${slide.label} 모바일`} />
                      )}
                    </div>
                  )}
                </div>
                {content.slides.length > 1 && (
                  <button
                    className={styles.deleteBtn}
                    onClick={() => removeSlide(i)}
                    title="슬라이드 삭제"
                    style={{ alignSelf: "flex-start", marginTop: 4 }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button className={styles.addBtn} onClick={addSlide}>
              + 슬라이드 추가
            </button>
          </div>
        )}

        {/* ════ 일정 ════ */}
        {activeTab === "schedule" && (
          <div className={styles.section}>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label>회차 (vol.XX)</label>
                <input
                  type="text"
                  value={content.schedule.vol}
                  onChange={(e) =>
                    updateField("schedule", "vol", e.target.value)
                  }
                />
              </div>
              <div className={styles.field}>
                <label>날짜</label>
                <input
                  type="date"
                  value={content.schedule.date || ""}
                  min={getTodayStr()}
                  onChange={(e) =>
                    updateField("schedule", "date", e.target.value)
                  }
                />
              </div>
            </div>
            {dateDisplay && (
              <div className={styles.datePreview}>
                <span className={styles.dateChip}>{dateDisplay.month}</span>
                <span className={styles.dateChip}>{dateDisplay.day}</span>
                <span className={styles.dateChip}>{dateDisplay.dow}</span>
              </div>
            )}
            <div className={styles.field}>
              <label>장소</label>
              <input
                type="text"
                value={content.schedule.location}
                onChange={(e) =>
                  updateField("schedule", "location", e.target.value)
                }
              />
            </div>
            <div className={styles.field}>
              <label>시간</label>
              <input
                type="text"
                value={content.schedule.time}
                onChange={(e) =>
                  updateField("schedule", "time", e.target.value)
                }
              />
            </div>
          </div>
        )}

        {/* ════ 추첨 경품 ════ */}
        {activeTab === "prizes" && (
          <div className={styles.section}>
            {content.prizes.map((prize, i) => (
              <div key={i} className={styles.prizeRow}>
                <div className={styles.prizeRank}>{prize.rank}등</div>
                <div className={styles.prizeFields}>
                  <div className={styles.prizeTopRow}>
                    <div className={styles.field} style={{ flex: 1 }}>
                      <label>경품명</label>
                      <textarea
                        rows={2}
                        value={prize.name}
                        onChange={(e) => updatePrize(i, "name", e.target.value)}
                        placeholder="Enter로 줄바꿈 가능"
                        style={{ resize: "vertical" }}
                      />
                    </div>
                    <div className={styles.field} style={{ width: 90 }}>
                      <label>인원</label>
                      <input
                        type="text"
                        value={prize.count}
                        onChange={(e) =>
                          updatePrize(i, "count", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label>링크 (선택)</label>
                    <input
                      type="text"
                      placeholder="https://example.com (없으면 비워두세요)"
                      value={prize.link ?? ""}
                      onChange={(e) => updatePrize(i, "link", e.target.value)}
                    />
                  </div>
                </div>
                <button
                  className={styles.deleteBtn}
                  onClick={() => removePrize(i)}
                  title="삭제"
                >
                  ✕
                </button>
              </div>
            ))}
            <button className={styles.addBtn} onClick={addPrize}>
              + 경품 추가
            </button>

            <div className={styles.divider} />

            <div className={styles.field}>
              <label>경품 이미지</label>
              <input
                type="text"
                placeholder="https://example.com/prize.jpg"
                value={content.prizeImageUrl}
                onChange={(e) =>
                  setContent((prev) => ({
                    ...prev,
                    prizeImageUrl: e.target.value,
                  }))
                }
              />
              <div className={styles.uploadRow}>
                <span className={styles.uploadOr}>또는</span>
                <label className={styles.uploadBtn}>
                  📁 파일 업로드
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files?.[0])
                        handlePrizeImageUpload(e.target.files[0]);
                    }}
                  />
                </label>
              </div>
              {content.prizeImageUrl && (
                <div className={styles.preview}>
                  <img src={content.prizeImageUrl} alt="경품 미리보기" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════ 셀러 모집 ════ */}
        {activeTab === "seller" && (
          <div className={styles.section}>
            <div className={styles.field}>
              <label>헤드라인</label>
              <textarea
                rows={2}
                value={content.seller.headline}
                onChange={(e) =>
                  updateField("seller", "headline", e.target.value)
                }
              />
              <span className={styles.hint}>줄바꿈(Enter) 사용 가능</span>
            </div>
            <div className={styles.field}>
              <label>설명 텍스트</label>
              <textarea
                rows={3}
                value={content.seller.description}
                onChange={(e) =>
                  updateField("seller", "description", e.target.value)
                }
              />
            </div>
            <div className={styles.field}>
              <label>카카오톡 채널 URL</label>
              <input
                type="text"
                placeholder="https://pf.kakao.com/..."
                value={content.seller.kakaoUrl}
                onChange={(e) =>
                  updateField("seller", "kakaoUrl", e.target.value)
                }
              />
              <span className={styles.hint}>
                셀러 신청 버튼 클릭 시 이동할 카카오톡 채널 주소
              </span>
            </div>

            <div className={styles.divider} />

            <div className={styles.noticeSection}>
              <div className={styles.noticeSectionHeader}>
                <span className={styles.noticeTitle}>유의 사항 목록</span>
                <button className={styles.addBtn} onClick={addNotice} style={{ width: "auto", padding: "8px 14px" }}>
                  + 항목 추가
                </button>
              </div>
              {(content.seller.notices || []).map((notice, i) => (
                <div key={i} className={styles.noticeRow} style={{ alignItems: "flex-start" }}>
                  <span className={styles.noticeNum} style={{ paddingTop: 6 }}>{i + 1}</span>
                  <textarea
                    rows={2}
                    className={styles.noticeInput}
                    value={notice}
                    onChange={(e) => updateNotice(i, e.target.value)}
                    placeholder="유의 사항 내용 (Enter로 줄바꿈 가능)"
                    style={{ resize: "vertical", lineHeight: "1.5" }}
                  />
                  <button
                    className={styles.deleteBtn}
                    onClick={() => removeNotice(i)}
                    title="삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* ════ 게시판 ════ */}
        {activeTab === "board" && (
          <div className={styles.section}>
            {/* 일시 중지 토글 */}
            <div className={styles.boardToggleRow}>
              <div>
                <div className={styles.boardToggleLabel}>
                  게시판 작성 일시 중지
                </div>
                <div className={styles.boardToggleDesc}>
                  활성화하면 모든 사용자의 글 및 댓글 작성이 차단됩니다.
                </div>
              </div>
              <button
                className={`${styles.toggle} ${content.boardPaused ? styles.toggleOn : ""}`}
                onClick={() =>
                  setContent((prev) => ({
                    ...prev,
                    boardPaused: !prev.boardPaused,
                  }))
                }
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>
            {content.boardPaused && (
              <p className={styles.boardPausedBadge}>
                현재 게시판 작성이 중지된 상태입니다. 변경사항 저장 버튼을
                눌러야 적용됩니다.
              </p>
            )}

            <div className={styles.divider} />

            {/* 게시글 목록 */}
            <div className={styles.noticeSectionHeader}>
              <span className={styles.noticeTitle}>게시글 관리</span>
              <button
                className={styles.addBtn}
                onClick={loadBoardPosts}
                style={{ width: "auto" }}
              >
                {boardLoading ? "불러오는 중..." : "게시글 불러오기"}
              </button>
            </div>

            {boardPosts.length > 0 && (
              <div className={styles.boardTable}>
                {boardPosts.map((post) => (
                  <div key={post.id}>
                    <div
                      className={`${styles.boardRow} ${post.hidden ? styles.boardRowHidden : ""} ${selectedPost?.id === post.id ? styles.boardRowSelected : ""}`}
                    >
                      <div
                        className={styles.boardRowInfo}
                        onClick={() => handleSelectPost(post)}
                      >
                        <span className={styles.boardRowId}>#{post.id}</span>
                        <span className={styles.boardRowTitle}>
                          {post.title}
                        </span>
                        <span className={styles.boardRowMeta}>
                          {post.author} · {post.created_at?.slice(0, 10)} · 댓글{" "}
                          {post.comment_count}
                        </span>
                      </div>
                      <button
                        className={`${styles.boardHideBtn} ${post.hidden ? styles.boardHideBtnActive : ""}`}
                        onClick={() =>
                          toggleHidden("post", post.id, post.hidden)
                        }
                      >
                        {post.hidden ? "숨김 해제" : "숨기기"}
                      </button>
                    </div>

                    {/* 선택된 게시글의 댓글 */}
                    {selectedPost?.id === post.id && (
                      <div className={styles.boardComments}>
                        {commentsLoading ? (
                          <p className={styles.boardCommentsEmpty}>
                            댓글 불러오는 중...
                          </p>
                        ) : postComments.length === 0 ? (
                          <p className={styles.boardCommentsEmpty}>
                            댓글이 없습니다.
                          </p>
                        ) : (
                          postComments.map((c) => (
                            <div
                              key={c.id}
                              className={`${styles.boardCommentRow} ${c.hidden ? styles.boardRowHidden : ""}`}
                            >
                              <div className={styles.boardCommentInfo}>
                                {c.parent_id && (
                                  <span className={styles.boardReplyBadge}>
                                    답글
                                  </span>
                                )}
                                <span className={styles.boardCommentAuthor}>
                                  {c.author}
                                </span>
                                <span className={styles.boardCommentContent}>
                                  {c.content}
                                </span>
                                <span className={styles.boardRowMeta}>
                                  {c.created_at?.slice(0, 10)}
                                </span>
                              </div>
                              <button
                                className={`${styles.boardHideBtn} ${c.hidden ? styles.boardHideBtnActive : ""}`}
                                onClick={() =>
                                  toggleHidden("comment", c.id, c.hidden)
                                }
                              >
                                {c.hidden ? "숨김 해제" : "숨기기"}
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
