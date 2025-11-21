// src/App.jsx
import React, { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import CreateTalent from "./pages/CreateTalent.jsx";
import My from "./pages/My.jsx";
import Chat from "./pages/Chat.jsx";
import ChatRoom from "./pages/ChatRoom.jsx";
import TalentDetail from "./pages/TalentDetail.jsx";
import ChatReview from "./pages/ChatReview.jsx";
import UserProfile from "./pages/UserProfile.jsx";
import OnboardingLanding from "./pages/OnboardingLanding.jsx";

// 새 프로필 수정 페이지
import ProfileEdit from "./pages/ProfileEdit.jsx";

// 마이페이지 하위 페이지들
import MyReviews from "./pages/MyReviews.jsx";
import MyPosts from "./pages/MyPosts.jsx";
import MyLinks from "./pages/MyLinks.jsx";
import MyFavorites from "./pages/MyFavorites.jsx";

const TOKEN_KEY = "access_token";
const API_BASE = "http://localhost:8080";

// 토큰 실검증 가드
function RequireAuth() {
  const nav = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const t = localStorage.getItem(TOKEN_KEY);
      if (!t) {
        nav("/login", { replace: true, state: { from: location } });
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/me`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${t}`,
          },
          credentials: "include",
        });
        if (!res.ok) throw new Error("auth-failed");
        setChecking(false);
      } catch (e) {
        try {
          localStorage.removeItem(TOKEN_KEY);
        } catch {}
        nav("/login", { replace: true });
      }
    })();
  }, [location, nav]);

  if (checking) return null;
  return <Outlet />;
}

// 로그인 상태면 /login, /signup 막기
function PublicOnlyRoute({ children }) {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? <Navigate to="/home" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      {/* 공개 라우트 */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnlyRoute>
            <Signup />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/landing"
        element={
          <PublicOnlyRoute>
            <OnboardingLanding />
          </PublicOnlyRoute>
        }
      />

      {/* 보호 라우트 */}
      <Route element={<RequireAuth />}>
        <Route path="/home" element={<Home />} />
        <Route path="/create" element={<CreateTalent />} />
        <Route path="/my" element={<My />} />
        <Route path="/my/reviews" element={<MyReviews />} />
        <Route path="/my/posts" element={<MyPosts />} />
        <Route path="/my/links" element={<MyLinks />} />
        <Route path="/my/favorites" element={<MyFavorites />} />
        <Route path="/profile/edit" element={<ProfileEdit />} />
        <Route path="/profile/:userId" element={<UserProfile />} />
        <Route path="/chat/:roomId" element={<ChatRoom />} />
        <Route path="/chat/review/:chatId" element={<ChatReview />} />
        <Route path="/my/edit" element={<UserProfile />} />
        {/* 로그인 필요하면 여기로 */}
        <Route path="/talent/:id" element={<TalentDetail />} />
        <Route path="/chat" element={<Chat />} />
      </Route>

      {/* 404: 토큰 여부로 분기 */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

function RootRedirect() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token
    ? <Navigate to="/home" replace />
    : <Navigate to="/landing" replace />;
}