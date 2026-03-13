"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import styles from "./ImageSlider.module.css";

const DEFAULT_SLIDES = [
  { id: 1, label: "로고", imageUrl: "/images/TTD_logo.png", mediaType: "image" },
  { id: 2, label: "포스터", imageUrl: "/images/TTD_poster.png", mediaType: "image" },
  { id: 3, label: "이벤트 현장", imageUrl: "/images/TTD_pic1.jpg", mediaType: "image" },
];

/* YouTube URL에서 영상 ID 추출 */
function getYoutubeId(url) {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export default function ImageSlider({ slides }) {
  const data = slides?.length ? slides : DEFAULT_SLIDES;
  const [current, setCurrent] = useState(0);
  const total = data.length;
  const videoRefs = useRef({});

  const goTo = useCallback(
    (i) => setCurrent(((i % total) + total) % total),
    [total],
  );

  const currentSlide = data[current];
  const isVideo = currentSlide?.mediaType === "video";
  const isYoutube = !!getYoutubeId(currentSlide?.imageUrl);
  // YouTube·일반영상은 타이머 없이 수동 전환 또는 onEnded 처리
  const isAutoAdvance = !isVideo && !isYoutube;

  /* 자동 슬라이드: 이미지만 5초 자동 전환 */
  useEffect(() => {
    if (!isAutoAdvance) return;
    const timer = setInterval(() => goTo(current + 1), 5000);
    return () => clearInterval(timer);
  }, [current, goTo, isAutoAdvance]);

  /* 슬라이드 전환 시 해당 영상을 처음부터 재생 */
  useEffect(() => {
    const vid = videoRefs.current[current];
    if (vid) {
      vid.currentTime = 0;
      vid.play().catch(() => {});
    }
    Object.entries(videoRefs.current).forEach(([idx, el]) => {
      if (Number(idx) !== current && el) {
        el.pause();
        el.currentTime = 0;
      }
    });
  }, [current]);

  return (
    <div className={styles.wrap}>
      <div
        className={styles.track}
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {data.map((s, i) => {
          const ytId = getYoutubeId(s.imageUrl);
          return (
            <div key={s.id} className={styles.slide}>
              {ytId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}?autoplay=${i === current ? 1 : 0}&mute=1&playsinline=1&rel=0&enablejsapi=0`}
                  className={styles.slideVideo}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  style={{ border: "none" }}
                />
              ) : s.mediaType === "video" ? (
                <video
                  ref={(el) => { videoRefs.current[i] = el; }}
                  src={s.imageUrl}
                  className={styles.slideVideo}
                  muted
                  playsInline
                  onEnded={() => goTo(current + 1)}
                />
              ) : (
                <picture>
                  {s.mobileUrl && (
                    <source media="(max-width: 768px)" srcSet={s.mobileUrl} />
                  )}
                  <img
                    src={s.imageUrl || "/images/TTD_logo.png"}
                    alt={s.label}
                    className={styles.slideImage}
                  />
                </picture>
              )}
            </div>
          );
        })}
      </div>

      {/* 도트 인디케이터 */}
      <div className={styles.dots}>
        {data.map((_, i) => (
          <button
            key={i}
            className={`${styles.dot} ${i === current ? styles.dotActive : ""}`}
            onClick={() => goTo(i)}
            aria-label={`슬라이드 ${i + 1}`}
          />
        ))}
      </div>

      {/* 좌우 버튼 + 카운터 */}
      <div className={styles.controls}>
        <button className={styles.btn} onClick={() => goTo(current - 1)}>
          ←
        </button>
        <span className={styles.counter}>
          {current + 1} / {total}
        </span>
        <button className={styles.btn} onClick={() => goTo(current + 1)}>
          →
        </button>
      </div>
    </div>
  );
}
