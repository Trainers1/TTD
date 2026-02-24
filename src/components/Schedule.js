"use client";

import { useEffect, useRef } from "react";
import styles from "./Schedule.module.css";

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

/* date 문자열 → 표시용 값 (타임존 이슈 방지를 위해 T12:00:00 추가) */
function deriveFromDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T12:00:00");
  if (isNaN(d)) return null;
  return {
    month: `${MONTHS_EN[d.getMonth()]} ${d.getFullYear()}`,
    day: d.getDate(),
    dow: DAYS_EN[d.getDay()],
  };
}

const DEFAULT_PRIZES = [
  { rank: 1, name: "경품 이름 (임시)", count: "1명" },
  { rank: 2, name: "경품 이름 (임시)", count: "3명" },
  { rank: 3, name: "경품 이름 (임시)", count: "5명" },
  { rank: 4, name: "경품 이름 (임시)", count: "7명" },
  { rank: 5, name: "경품 이름 (임시)", count: "9명" },
];

export default function Schedule({ schedule, prizes, prizeImageUrl }) {
  const sectionRef = useRef(null);
  const imgAreaRef = useRef(null);
  const listRef = useRef(null);

  /* admin에서 설정한 날짜만 표시 */
  const derived = deriveFromDate(schedule?.date);

  const month = derived?.month ?? schedule?.month ?? "—";
  const day = derived?.day ?? schedule?.day ?? "—";
  const dow = derived?.dow ?? schedule?.dow ?? "—";
  const location =
    schedule?.location ?? "경기 안양시 동안구 평촌대로217번길 15 3층";
  const time = schedule?.time ?? "오전 12시 — 오후 6시";

  const prizeList = prizes?.length ? prizes : DEFAULT_PRIZES;
  const imgUrl = prizeImageUrl ?? "/images/TTD_prize.jpg";

  /* 이미지 영역 높이 → 리스트 높이 동기화 */
  useEffect(() => {
    const imgArea = imgAreaRef.current;
    const list = listRef.current;
    if (!imgArea || !list) return;
    const sync = () => {
      const h = imgArea.offsetHeight;
      if (h > 0) list.style.height = h + "px";
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(imgArea);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const els = sectionRef.current?.querySelectorAll(".reveal");
    if (!els) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section className={styles.schedule} id="schedule" ref={sectionRef}>
      {/* 헤더 */}
      <div className={`${styles.header} reveal`}>
        <div className={styles.label}>Schedule</div>
        <h2 className={styles.title}>
          매달 세번째 토요일,
          <br />
          ㅌㅌㄷ에서 만나요
        </h2>
        <p className={styles.subtitle}>
          정기적으로 열리는 ㅌㅌㄷ의 다음 일정을 확인하세요.
        </p>
      </div>

      {/* 캘린더 스트립 */}
      <div className={`${styles.calStrip} reveal`}>
        <div className={styles.calDate}>
          <div className={styles.calMonth}>{month}</div>
          <div className={styles.calDay}>{day}</div>
          <div className={styles.calDow}>{dow}</div>
        </div>
        <div className={styles.calDivider} />
        <div className={styles.calInfo}>
          {/* <h3>ㅌㅌㄷ 트레이너스 트레이닝 데이</h3> */}
          <p>
            {location}
            <br />
            {time}
            <br /> * 셀러 참가자분들은 미리 입장하여 준비 부탁드립니다
          </p>
          <div className={styles.calBadge}>
            <span className={styles.blink} />
            추첨 이벤트 진행
          </div>
        </div>
      </div>

      {/* 추첨 이벤트 */}
      <div className={styles.eventRow}>
        <div className={`${styles.eventCard} reveal`}>
          <div className={styles.evLabel}>🎁 Lucky Draw</div>
          <h3>구매자 추첨 이벤트</h3>
          <p>물품 구매시 응모 가능! 추첨을 통해 다양한 경품을 드려요.</p>
          <div className={styles.prizeList} ref={listRef}>
            {prizeList.map((p, idx) => {
              const hasLink = !!p.link;
              const inner = (
                <>
                  <div
                    className={`${styles.prizeRank} ${idx === 0 ? styles.first : ""}`}
                  >
                    {p.rank}
                  </div>
                  <span
                    className={styles.prizeName}
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {p.name}
                  </span>
                  {hasLink && <span className={styles.prizeLinkIcon}>↗</span>}
                  <span className={styles.prizeTag}>{p.count}</span>
                </>
              );
              return hasLink ? (
                <a
                  key={p.rank ?? idx}
                  href={p.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.prizeItem} ${idx === 0 ? styles.firstItem : ""} ${styles.prizeItemLink}`}
                >
                  {inner}
                </a>
              ) : (
                <div
                  key={p.rank ?? idx}
                  className={`${styles.prizeItem} ${idx === 0 ? styles.firstItem : ""}`}
                >
                  {inner}
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${styles.eventCard} reveal`}>
          <div className={styles.evLabel}>📸 Prize Preview</div>
          <h3>이달의 경품 미리보기</h3>
          <p>이번 달 추첨 이벤트의 경품을 확인해보세요.</p>
          <div className={styles.prizeImgArea} ref={imgAreaRef}>
            <img src={imgUrl} alt="이달의 경품" className={styles.prizeImg} />
          </div>
        </div>
      </div>
    </section>
  );
}
