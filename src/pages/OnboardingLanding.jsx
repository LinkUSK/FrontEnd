import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/onboardingLanding.css";

const slides = [
  {
    title: "교내 인증으로\n신뢰할 수 있는 사람과\n협업할 수 있습니다",
    image: "/images/onboarding-1.png", 
  },
  {
    title: "키워드로 원하는 재능을\n손쉽게 검색해보세요",
    image: "/images/onboarding-2.png",
  },
  {
    title: "1:1 매칭으로 부담없이\n나에게 맞는 협업자를\n만나보세요.",
    image: "/images/onboarding-3.png",
  },
  {
    title: "LinkU로 무한한 가능성을\n실현시켜 보세요",
    image: "/images/onboarding-4.png",
  },
];

export default function OnboardingLanding() {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();

  const isLast = index === slides.length - 1;

  const handleNext = () => {
    if (isLast) {
      // 🔹 마지막 슬라이드에서 "다음" 누르면 로그인 페이지로 이동
      navigate("/login");
    } else {
      setIndex((prev) => prev + 1);
    }
  };

  const currentSlide = slides[index];

  return (
    <div className="onb-root">
      <div className="onb-card">
        {/* 로고 영역 */}
        <div className="onb-logo">LinkU</div>

        {/* 텍스트 */}
        <div className="onb-title">
          {currentSlide.title.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              <br />
            </span>
          ))}
        </div>

        {/* 이미지 (페이드 인) */}
        <div key={index} className="onb-image-wrap fade-in-up">
          <img
            src={currentSlide.image}
            alt="onboarding"
            className="onb-image"
          />
        </div>

        {/* 하단 인디케이터 + 버튼 */}
        <div className="onb-bottom">
          <div className="onb-dots">
            {slides.map((_, i) => (
              <div key={i} className="onb-dot" />
            ))}
            <div
              className="onb-dot-active"
              style={{ left: `${index * 18}px` }} // 부드럽게 옆으로 이동
            />
          </div>

          <button className="onb-next-btn" onClick={handleNext}>
              {isLast ? "로그인" : "다음"}
          </button>
        </div>
      </div>
    </div>
  );
}