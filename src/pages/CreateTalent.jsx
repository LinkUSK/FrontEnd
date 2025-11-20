// src/pages/CreateTalent.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/talent/createTalent.css";
import backIcon from '/images/back-icon.png'

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
  const loc = useLocation(); // (필요하면 나중에 탭바용으로 사용)

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

      // 태그 목록 없으면 먼저 불러오기
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
    setAiTagIds([]);
    setNewTagInput("");
  }, [category]);

  function toggleTagById(id) {
    id = Number(id);
    setSelectedTagIds((prev) => {
      if (prev.includes(id)) {
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

  return (
    <div className="ct-frame">
      <div className="ct-wrap">
        <div className="inner-scroll ct-inner">
          <div className="ct-top">
            <img
              src={backIcon}
              alt="back"
              className="ct-back-btn"
              onClick={() => nav("/home")}
            />
            재능 등록하기
          </div>

          <label className="ct-label">제목 *</label>
          <input
            className="ct-field"
            placeholder="예: 포스터 디자인"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <label className="ct-label">상세 설명 *</label>
          <textarea
            className="ct-area"
            placeholder="내용을 입력하세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <label className="ct-label">카테고리 *</label>
          <select
            className="ct-field"
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

          <label className="ct-label">태그 선택</label>

          <div className="ct-chip-wrap">
            {/* 🔹 AI 버튼 */}
            <button
              type="button"
              className="ct-ai-btn"
              disabled={aiLoading}
              onClick={applyAiTags}
            >
              {aiLoading ? "…" : "AI"}
            </button>

            {/* 🔹 선택된 태그 목록 */}
            {selectedTags.map((t) => {
              const isAi = aiTagIds.includes(t.id);
              const chipClass = [
                "ct-chip",
                "active",
                isAi ? "ai" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <div key={`sel-${t.id}`} className={chipClass}>
                  <span
                    className="ct-chip-text"
                    onClick={() => toggleTagById(t.id)}
                  >
                    {t.name.startsWith("#") ? t.name : `#${t.name}`}
                  </span>
                  <span
                    className="ct-chip-x"
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

            {/* 🔹 새 태그 버튼 */}
            <button
              type="button"
              className="ct-add-btn"
              onClick={openTagModal}
            >
              + 새 태그
            </button>
          </div>

          {/* 이미지 섹션 */}
          <label className="ct-label">포트폴리오 이미지</label>
          <div className="ct-upload-box">
            <div
              className="ct-upload-area"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="ct-upload-icon">⬆</div>
              <div>이미지 업로드</div>
              <div className="ct-upload-guide">
                클릭하여 사진 선택 (최대 10장)
              </div>
              {uploading && (
                <div className="ct-upload-loading">업로드 중...</div>
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
              <div className="ct-thumb-row">
                {imageUrls.map((url, idx) => (
                  <div key={idx} className="ct-thumb-item">
                    <img
                      src={toPreviewUrl(url)}
                      alt="미리보기"
                      className="ct-thumb-img"
                    />
                    <button
                      type="button"
                      className="ct-thumb-remove"
                      onClick={() => removeImage(idx)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <label className="ct-label">추가 내용 *</label>
          <textarea
            className="ct-area"
            placeholder="가격, 일정 등 추가 내용을 입력하세요."
            value={extraNote}
            onChange={(e) => setExtraNote(e.target.value)}
          />

          <button
            type="button"
            disabled={busy || uploading}
            onClick={onSubmit}
            className="ct-submit-btn"
          >
            {busy ? "작성 중…" : "등록 완료"}
          </button>
        </div>

        {/* 태그 모달 */}
        {tagModalOpen && (
          <div
            className="ct-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeTagModal();
            }}
          >
            <div className="ct-modal">
              <button
                type="button"
                className="ct-modal-close"
                onClick={closeTagModal}
              >
                ✖
              </button>

              <div className="ct-modal-title">태그 추가</div>

              <div className="ct-modal-row">
                <input
                  className="ct-field"
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
                  className="ct-modal-add-btn"
                  onClick={createNewTag}
                >
                  + 추가
                </button>
              </div>

              <div className="ct-modal-list">
                {availTags.map((t) => {
                  const active = selectedTagIds.includes(t.id);
                  const cls = [
                    "ct-modal-chip",
                    active ? "active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <div
                      key={`modal-${t.id}`}
                      className={cls}
                      onClick={() => toggleTagById(t.id)}
                    >
                      {t.name.startsWith("#") ? t.name : `#${t.name}`}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}