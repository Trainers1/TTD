"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./SellerCTA.module.css";

const DEFAULT_NOTICES = [
  "오리파 셀러 구역은 일반 셀러 구역과 별도로 운영됩니다.",
  "오리파 상품은 사전 승인된 상품만 판매 가능합니다.",
  "부스 설치 및 철거 시간을 반드시 준수해 주세요.",
  "미성년자에게의 오리파 상품 판매는 엄격히 금지됩니다.",
  "행사 당일 신분증 지참이 필수입니다.",
  "기타 문의 사항은 카카오톡 채널을 통해 사전에 문의해 주세요.",
];

export default function SellerCTA({ seller }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  const headline = seller?.headline ?? "오리파 셀러는\n사전 예약 부탁드립니다";
  const description =
    seller?.description ??
    "오리파 셀러는 일반 셀러와 구역이 나뉘어져 있습니다.\n오리파 셀러분들은 아래 버튼을 눌러 유의사항을 확인해주세요.";
  const kakaoUrl = seller?.kakaoUrl ?? "https://pf.kakao.com/";
  const notices = seller?.notices?.length ? seller.notices : DEFAULT_NOTICES;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <section className={styles.section} id="seller">
        <div className={`${styles.card} reveal`} ref={ref}>
          <div className={styles.label}>Become a Oripa Seller</div>
          <h2 style={{ whiteSpace: "pre-line" }}>{headline}</h2>
          <p className={styles.desc} style={{ whiteSpace: "pre-line" }}>
            {description}
          </p>

          <div className={styles.benefits}>
            <button className={styles.noticeBtn} onClick={() => setOpen(true)}>
              <span className={styles.pillIcon}>★</span>
              <span>유의 사항 필독!</span>
            </button>
          </div>

          <a
            href={kakaoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.kakaoBtn}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M12 3C6.48 3 2 6.58 2 10.9c0 2.78 1.86 5.22 4.65 6.6l-.96 3.56c-.08.3.25.55.52.38l4.2-2.8c.52.06 1.04.1 1.59.1 5.52 0 10-3.58 10-7.84C22 6.58 17.52 3 12 3z" />
            </svg>
            오리파 셀러 신청하기
            <span className={styles.arrow}>→</span>
          </a>

          <p className={styles.note}>
            카카오톡 채널에서 신청 방법을 안내받으실 수 있어요
          </p>
        </div>
      </section>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalIcon}>★</span>
              <h3>오리파 셀러 유의 사항</h3>
            </div>
            <ul className={styles.noticeList}>
              {notices.map((notice, i) => (
                <li key={i} style={{ whiteSpace: "pre-line" }}>{notice}</li>
              ))}
            </ul>
            <button className={styles.closeBtn} onClick={() => setOpen(false)}>
              확인했습니다
            </button>
          </div>
        </div>
      )}
    </>
  );
}
