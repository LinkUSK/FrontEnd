// src/pages/CreateTalent.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";

const API_BASE = "http://localhost:8080";
const TOKEN_KEY = "access_token";

// 🔹 공통 스타일 주입
(function injectInnerScrollStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById("inner-scroll-style")) return;
  const s = document.createElement("style");
  s.id = "inner-scroll-style";
  s.textContent = `
    body {
      margin: 0;
      background: #eef2f7;
      overflow: hidden;
    }
    .inner-scroll {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .inner-scroll::-webkit-scrollbar {
      display: none;
    }
  `;
  document.head.appendChild(s);
})();

function toPreviewUrl(u) {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  const path = u.startsWith("/") ? u : `/${u}`;
  return API_BASE + path;
}

export default function CreateTalent() {
  const nav = useNavigate();
  const loc = useLocation();

  const [categories, setCategories] = useState([]);
  const [availTags, setAvailTags] = useState([]);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [aiTagIds, setAiTagIds] = useState([]); // 🔹 AI로 추가된 태그 id 모음
  const [extraNote, setExtraNote] = useState("");

  const [imageUrls, setImageUrls] = useState([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 🔥 AI 태그
  const [aiLoading, setAiLoading] = useState(false);

  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");

  const fileInputRef = useRef(null);

  const authHeaders = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  async function apiGet(path, params = {}) {
    const url = new URL(API_BASE + path);
    Object.entries(params).forEach(
      ([k, v]) => (v ?? "") !== "" && url.searchParams.set(k, v)
    );
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json", ...authHeaders() },
    });
    if (!res.ok) throw new Error(`GET ${path} ${res.status}`);
    return res.json();
  }

  async function apiPost(path, body) {
    const res = await fetch(API_BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    const raw = await res.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { message: raw };
    }
    if (!res.ok) throw new Error(data.message || `POST ${path} ${res.status}`);
    return data;
  }

  async function apiUpload(file) {
    const fd = new FormData();
    fd.append("file", file);
    const token = localStorage.getItem(TOKEN_KEY);
    const endpoint = token ? "/api/files/upload" : "/api/files/upload-public";
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const res = await fetch(API_BASE + endpoint, {
      method: "POST",
      headers,
      body: fd,
    });
    const raw = await res.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { message: raw };
    }
    if (!res.ok) throw new Error(data.message || `UPLOAD ${res.status}`);
    return data;
  }

  // 🔥 AI 자동 태그 생성 & 적용
  async function applyAiTags() {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 먼저 입력하세요.");
      return;
    }
    if (!category) {
      alert("카테고리를 먼저 선택하세요.");
      return;
    }

    setAiLoading(true);

    try {
      const res = await fetch(API_BASE + "/api/ai/suggest-tags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          major: null,
        }),
      });

      const data = await res.json();
      const tags = Array.isArray(data) ? data : [];

      if (!tags.length) {
        alert("AI가 태그를 생성하지 못했습니다.");
        return;
      }

      // 태그 목록 불러오기 (비어있을 시)
      let baseTags = availTags;
      if (baseTags.length === 0) {
        const temp = await apiGet("/api/meta/tags", { category });
        baseTags = temp;
        setAvailTags(temp);
      }

      const addedIds = [];
      const newAiIds = [];

      for (const t of tags) {
        const name = String(t).trim();
        if (!name) continue;

        const exists = baseTags.find(
          (x) => x.name.toLowerCase() === name.toLowerCase()
        );

        if (exists) {
          addedIds.push(exists.id);
          newAiIds.push(exists.id);
        } else {
          try {
            const created = await apiPost("/api/meta/tags", {
              category,
              name,
            });
            const newTag = {
              id: Number(created.id),
              name: created.name,
            };
            baseTags = [...baseTags, newTag];
            setAvailTags((prev) => [...prev, newTag]);
            addedIds.push(newTag.id);
            newAiIds.push(newTag.id);
          } catch {
            console.warn("태그 생성 실패:", name);
          }
        }
      }

      if (addedIds.length > 0) {
        setSelectedTagIds((prev) => [...new Set([...prev, ...addedIds])]);
        setAiTagIds((prev) => [...new Set([...prev, ...newAiIds])]);
      }
    } catch (e) {
      console.error(e);
      alert("AI 태그 생성 실패");
    } finally {
      setAiLoading(false);
    }
  }

  // 초기 데이터 로드
  useEffect(() => {
    apiGet("/api/meta/categories").then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setAvailTags([]);
    setSelectedTagIds([]);
    setAiTagIds([]); // 카테고리 바뀔 때 AI 태그 표시도 초기화
    setNewTagInput("");
  }, [category]);

  function toggleTagById(id) {
    id = Number(id);
    setSelectedTagIds((prev) => {
      if (prev.includes(id)) {
        // 선택 해제하면 AI 태그 표시도 같이 제거
        setAiTagIds((aiPrev) => aiPrev.filter((x) => x !== id));
        return prev.filter((x) => x !== id);
      } else {
        return [...prev, id];
      }
    });
  }

  function removeTagById(id) {
    setSelectedTagIds((prev) => prev.filter((x) => x !== id));
    setAiTagIds((prev) => prev.filter((x) => x !== id));
  }

  function openTagModal() {
    if (!category) return alert("카테고리 먼저 선택!");
    setNewTagInput("");
    setTagModalOpen(true);
  }
  function closeTagModal() {
    setTagModalOpen(false);
  }

  async function createNewTag() {
    const name = String(newTagInput).trim().replace(/^#/, "");
    if (!name) {
      alert("태그 이름을 입력하세요.");
      return;
    }
    const dup = availTags.find(
      (t) => t.name.toLowerCase() === name.toLowerCase()
    );
    if (dup) {
      setSelectedTagIds((p) =>
        p.includes(dup.id) ? p : [...p, dup.id]
      );
      setNewTagInput("");
      return;
    }
    try {
      const created = await apiPost("/api/meta/tags", { category, name });
      const add = { id: Number(created.id), name: created.name };
      setAvailTags((prev) => [...prev, add]);
      setSelectedTagIds((prev) => [...prev, add.id]);
      setNewTagInput("");
    } catch {
      alert("태그 추가 실패");
    }
  }

  async function onUploadMultiple(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainSlots = 10 - imageUrls.length;
    const targetFiles = files.slice(0, remainSlots);

    if (!targetFiles.length) {
      alert("이미지는 최대 10장까지 업로드 가능");
      return;
    }

    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const f of targetFiles) {
        const { url } = await apiUpload(f);
        if (url) uploadedUrls.push(url);
      }
      if (uploadedUrls.length) {
        setImageUrls((prev) => [...prev, ...uploadedUrls]);
      }
    } catch {
      alert("이미지 업로드 실패");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeImage(idx) {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  const selectedTags = useMemo(
    () => availTags.filter((t) => selectedTagIds.includes(t.id)),
    [availTags, selectedTagIds]
  );

  async function onSubmit() {
    if (!localStorage.getItem(TOKEN_KEY)) return alert("로그인 필요");
    if (!title.trim()) return alert("제목 입력");
    if (!content.trim()) return alert("설명 입력");
    if (!category) return alert("카테고리 선택");
    if (selectedTagIds.length < 1) return alert("태그 하나 이상 선택");
    if (!extraNote.trim()) return alert("추가 내용 입력");

    const body = {
      title: title.trim(),
      content: content.trim(),
      category,
      tagId: selectedTagIds[0],
      tagIds: selectedTagIds,
      extraNote: extraNote.trim(),
      portfolioImageUrl: imageUrls[0] || null,
      portfolioImageUrls: imageUrls,
      price: 0,
      location: null,
    };

    setBusy(true);
    try {
      await apiPost("/api/talents", body);
      alert("등록 완료!");
      nav("/home");
    } catch (e) {
      alert("등록 실패: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  //
  // ===== CSS =====
  //
  const styles = {
    frame: {
      background: "#eef2f7",
      minHeight: "100vh",
      width: "100vw",
      overflow: "hidden",
      display: "flex",
      justifyContent: "center",
    },
    wrap: {
      maxWidth: 420,
      width: "100%",
      maxHeight: "100vh",
      background: "#f8fafc",
      display: "flex",
      flexDirection: "column",
      position: "relative",
    },
    inner: {
      flex: 1,
      overflowY: "auto",
      padding: "0 16px 140px",
      boxSizing: "border-box",
    },
    top: {
      fontWeight: 800,
      fontSize: 22,
      padding: "18px 2px 10px",
      textAlign: "center",
      flexShrink: 0,
    },

    label: {
      fontSize: 13,
      color: "#475569",
      marginTop: 12,
      fontWeight: 700,
      display: "block",
    },
    field: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: 12,
      border: "1px solid #e5e7eb",
      background: "#fff",
      boxSizing: "border-box",
    },
    area: {
      width: "100%",
      minHeight: 110,
      padding: "12px 14px",
      borderRadius: 12,
      border: "1px solid #e5e7eb",
      background: "#fff",
      resize: "vertical",
      boxSizing: "border-box",
    },
    btn: {
      width: "100%",
      border: 0,
      borderRadius: 12,
      padding: "14px 14px",
      fontWeight: 700,
      cursor: "pointer",
      background: "#4f46e5",
      color: "#fff",
      marginTop: 20,
    },

    chipWrap: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 10,
      alignItems: "center",
    },
    // 일반 태그 & AI 태그 둘 다 여기서 처리
    chip: (isActive, isAi) => ({
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      fontSize: 13,
      borderRadius: 999,
      border: isAi
        ? "1px solid #38bdf8"
        : isActive
        ? "1px solid #4f46e5"
        : "1px solid #e5e7eb",
      background: isAi
        ? "#e0f2fe"
        : isActive
        ? "#eef2ff"
        : "#fff",
      color: isAi
        ? "#0369a1"
        : isActive
        ? "#3730a3"
        : "#111827",
      whiteSpace: "nowrap",
    }),
    chipText: { cursor: "pointer" },
    chipX: {
      fontWeight: 900,
      color: "#9ca3af",
      cursor: "pointer",
    },

    addBtn: {
  border: 0,
  padding: "8px 12px",
  borderRadius: 999,
  background: "#0f172a",  // 짙은 검은색 느낌
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
  fontSize: 13,
},

    // 🔵 AI 버튼 - 흰 배경 + 파란 포인트
    aiBtn: {
      border: "1px solid rgba(59,130,246,0.8)",
      padding: "8px 18px",
      borderRadius: 999,
      background: "#ffffff",
      color: "#1d4ed8",
      fontWeight: 800,
      fontSize: 14,
      cursor: "pointer",
      whiteSpace: "nowrap",
      letterSpacing: "0.3px",
      boxShadow: "0 0 8px rgba(59,130,246,0.45)",
      textShadow: "0 0 4px rgba(59,130,246,0.45)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      transition: "transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease",
    },

    uploadBox: {
      marginTop: 10,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    },
    uploadArea: {
      width: 160,
      height: 160,
      borderRadius: 24,
      border: "1px solid #d1d5db",
      background: "#f9fafb",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
    },
    thumbRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
    },
    thumbItem: {
      width: 80,
      height: 80,
      borderRadius: 16,
      overflow: "hidden",
      position: "relative",
      background: "#e5e7eb",
    },
    thumbImg: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },
    thumbRemoveBtn: {
      position: "absolute",
      right: 4,
      top: 4,
      border: 0,
      width: 20,
      height: 20,
      borderRadius: "50%",
      background: "rgba(0,0,0,.5)",
      color: "#fff",
      cursor: "pointer",
    },

    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(15,23,42,.35)",
      display: "grid",
      placeItems: "center",
      padding: 16,
      zIndex: 999,
    },
    modal: {
      width: "100%",
      maxWidth: 560,
      background: "#fff",
      borderRadius: 18,
      border: "2px solid #2563eb",
      padding: 16,
      position: "relative",
      boxSizing: "border-box",
    },
    modalClose: {
      position: "absolute",
      right: 10,
      top: 10,
      width: 30,
      height: 30,
      borderRadius: 999,
      border: "1px solid #ddd",
      background: "#fff",
      cursor: "pointer",
    },
    modalRow: {
      display: "grid",
      gridTemplateColumns: "1fr auto",
      gap: 10,
      marginTop: 10,
    },
    modalList: {
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 14,
    },

    bottomWrap: {
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      background: "#fff",
      borderTop: "1px solid #e5e7eb",
    },
    bottomInner: {
      maxWidth: 420,
      margin: "0 auto",
      display: "flex",
    },
    tab: (active) => ({
      flex: 1,
      textAlign: "center",
      padding: "8px 0",
      borderTop: active ? "2px solid #4f46e5" : "2px solid transparent",
      color: active ? "#4f46e5" : "#94a3b8",
      fontSize: 12,
      fontWeight: active ? 700 : 400,
      cursor: "pointer",
    }),
  };

  function BottomBar() {
    const is = (p) =>
      p === "/home" ? loc.pathname === "/home" : loc.pathname.startsWith(p);

    return (
      <div style={styles.bottomWrap}>
        <div style={styles.bottomInner}>
          <div style={styles.tab(is("/home"))} onClick={() => nav("/home")}>
            <div style={{ fontSize: 20 }}>🏠</div>
            <div>홈</div>
          </div>
          <div style={styles.tab(is("/create"))} onClick={() => nav("/create")}>
            <div style={{ fontSize: 20 }}>✏️</div>
            <div>재능 등록</div>
          </div>
          <div style={styles.tab(is("/chat"))} onClick={() => nav("/chat")}>
            <div style={{ fontSize: 20 }}>💬</div>
            <div>채팅</div>
          </div>
          <div style={styles.tab(is("/my"))} onClick={() => nav("/my")}>
            <div style={{ fontSize: 20 }}>👤</div>
            <div>마이페이지</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.frame}>
      <div style={styles.wrap}>
        <div className="inner-scroll" style={styles.inner}>
          <div style={styles.top}>재능 등록하기</div>

          <label style={styles.label}>제목 *</label>
          <input
            style={styles.field}
            placeholder="예: 포스터 디자인"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <label style={styles.label}>상세 설명 *</label>
          <textarea
            style={styles.area}
            placeholder="내용을 입력하세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <label style={styles.label}>카테고리 *</label>
          <select
            style={styles.field}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">선택</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <label style={styles.label}>태그 선택</label>

          <div style={styles.chipWrap}>
            {/* 🔹 AI 버튼: 항상 맨 앞 */}
            <button
              style={styles.aiBtn}
              disabled={aiLoading}
              onClick={applyAiTags}
            >
              {aiLoading ? "…" : "AI"}
            </button>

            {/* 🔹 선택된 태그들 (AI 태그는 파란 레이아웃) */}
            {selectedTags.map((t) => {
              const isAi = aiTagIds.includes(t.id);
              return (
                <div
                  key={`sel-${t.id}`}
                  style={styles.chip(true, isAi)}
                >
                  <span
                    style={styles.chipText}
                    onClick={() => toggleTagById(t.id)}
                  >
                    {t.name.startsWith("#") ? t.name : `#${t.name}`}
                  </span>
                  <span
                    style={styles.chipX}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTagById(t.id);
                    }}
                  >
                    ×
                  </span>
                </div>
              );
            })}

            {/* 🔹 새 태그 버튼 (맨 뒤) */}
            <button style={styles.addBtn} onClick={openTagModal}>
              + 새 태그
            </button>
          </div>

          {/* 이미지 섹션 */}
          <label style={styles.label}>포트폴리오 이미지</label>
          <div style={styles.uploadBox}>
            <div
              style={styles.uploadArea}
              onClick={() => fileInputRef.current?.click()}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  border: "1px dashed #aaa",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                ⬆
              </div>
              <div>이미지 업로드</div>
              <div style={{ fontSize: 11, color: "#868e96" }}>
                클릭하여 사진 선택 (최대 10장)
              </div>
              {uploading && (
                <div style={{ marginTop: 6, fontSize: 11, color: "#6366f1" }}>
                  업로드 중...
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={onUploadMultiple}
            />

            {imageUrls.length > 0 && (
              <div style={styles.thumbRow}>
                {imageUrls.map((url, idx) => (
                  <div key={idx} style={styles.thumbItem}>
                    <img
                      src={toPreviewUrl(url)}
                      alt="미리보기"
                      style={styles.thumbImg}
                    />
                    <button
                      type="button"
                      style={styles.thumbRemoveBtn}
                      onClick={() => removeImage(idx)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <label style={styles.label}>추가 내용 *</label>
          <textarea
            style={styles.area}
            placeholder="가격, 일정 등 추가 내용을 입력하세요."
            value={extraNote}
            onChange={(e) => setExtraNote(e.target.value)}
          />

          <button
            disabled={busy || uploading}
            onClick={onSubmit}
            style={styles.btn}
          >
            {busy ? "작성 중…" : "등록 완료"}
          </button>
        </div>

        {/* 태그 모달 */}
        {tagModalOpen && (
          <div
            style={styles.overlay}
            onClick={(e) => {
              if (e.target === e.currentTarget) closeTagModal();
            }}
          >
            <div style={styles.modal}>
              <button style={styles.modalClose} onClick={closeTagModal}>
                ✖
              </button>

              <div style={{ fontSize: 14, fontWeight: 800 }}>
                태그 추가
              </div>

              <div style={styles.modalRow}>
                <input
                  style={styles.field}
                  placeholder="예: #포스터 / #3D / #디자인"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      createNewTag();
                    }
                  }}
                />
                <button
                  type="button"
                  style={styles.aiBtn}
                  onClick={createNewTag}
                >
                  + 추가
                </button>
              </div>

              <div style={styles.modalList}>
                {availTags.map((t) => {
                  const active = selectedTagIds.includes(t.id);
                  return (
                    <div
                      key={`modal-${t.id}`}
                      onClick={() => toggleTagById(t.id)}
                      style={{
                        padding: "8px 12px",
                        fontSize: 13,
                        borderRadius: 999,
                        border: active
                          ? "1px solid #4f46e5"
                          : "1px solid #e5e7eb",
                        background: active ? "#eef2ff" : "#fff",
                        cursor: "pointer",
                      }}
                    >
                      {t.name.startsWith("#") ? t.name : `#${t.name}`}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <BottomBar />
      </div>
    </div>
  );
}
