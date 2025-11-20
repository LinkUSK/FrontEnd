// src/pages/MyReviews.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/mypage/myReviews.css";
import BottomNav from "../components/BottomNav";
import backIcon from "/images/back-icon.png";

const API_BASE = "http://localhost:8080";
const TOKEN_KEY = "access_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
async function apiGet(path) {
  const token = getToken();
  const res = await fetch(API_BASE + path, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const raw = await res.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }
  if (!res.ok)
    throw new Error(data.message || `GET ${path} failed (${res.status})`);
  return data;
}

function formatYmd(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

export default function MyReviews() {
  const nav = useNavigate();
  const loc = useLocation();

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const data = await apiGet("/api/chat/linku/reviews/me");
        const list = Array.isArray(data) ? data : data?.content || [];
        setList(Array.isArray(list) ? list : []);
      } catch (e) {
        setErr(e.message || "받은 후기를 불러오지 못했어요.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function ReviewCard({ item }) {
    const reviewer = item.reviewer || {};
    const name =
      item.reviewerName ||
      reviewer.name ||
      reviewer.username ||
      item.reviewerUserId ||
      "익명";
    const major =
      item.reviewerMajor ||
      reviewer.major ||
      reviewer.department ||
      "전공 미입력";

    const rawScore =
      typeof item.score === "number"
        ? item.score
        : typeof item.rating === "number"
        ? item.rating
        : typeof item.kindnessScore === "number"
        ? item.kindnessScore
        : null;
    const rating =
      rawScore == null ? 0 : Math.max(0, Math.min(5, Number(rawScore) || 0));

    const comment = item.comment || item.content || "내용이 없습니다.";
    const createdAt = item.createdAt;

    return (
      <div className="myreviews-review-card">
        <div className="myreviews-review-header-row">
          <div className="myreviews-review-name">
            {name} · {major}
          </div>
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={
                  i < rating
                    ? "myreviews-star myreviews-star-active"
                    : "myreviews-star"
                }
              >
                ★
              </span>
            ))}
          </div>
        </div>
        <div className="myreviews-review-body">{comment}</div>
        <div className="myreviews-review-date">{formatYmd(createdAt)}</div>
      </div>
    );
  }

  return (
    <div className="myreviews-frame">
      <div className="myreviews-wrap">
        {/* 상단 뒤로가기 바 */}
        <div className="myreviews-top-bar">
          <img
            src={backIcon}
            alt="back"
            className="myreviews-back-btn"
            onClick={() => nav(-1)} // 또는 nav("/my")
          />
          <div className="myreviews-top-title">받은 후기</div>
        </div>

        <div className="inner-scroll myreviews-inner">
          <div className="myreviews-section-title">나에게 달린 후기</div>

          {loading && (
            <div className="myreviews-small-muted myreviews-small-muted-margin">
              불러오는 중…
            </div>
          )}

          {err && <div className="myreviews-error-text">{err}</div>}

          {!loading && !err && list.length === 0 && (
            <div className="myreviews-small-muted">
              아직 받은 후기가 없습니다.
            </div>
          )}

          {list.map((r) => (
            <ReviewCard key={r.id} item={r} />
          ))}
        </div>

        <BottomNav />
      </div>
    </div>
  );
}