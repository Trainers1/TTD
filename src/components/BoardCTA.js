"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./BoardCTA.module.css";

const MOCK_POSTS = [
  { title: "홀로라이브 카드 판매해요!", author: "익명" },
  { title: "포켓몬 한정판 레어카드", author: "수집 마스터1" },
  { title: "오늘 ㅌㅌㄷ 후기!", author: "모푸" },
];

export default function BoardCTA() {
  const ref = useRef(null);

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
    <section className={styles.section} id="board">
      <div className={`${styles.card} reveal`} ref={ref}>
        {/* 왼쪽: 게시글 미리보기 */}
        <div className={styles.visualSide}>
          <div className={styles.postList}>
            {MOCK_POSTS.map((post, i) => (
              <div key={i} className={styles.postCard}>
                <span className={styles.postTitle}>{post.title}</span>
                <span className={styles.postAuthor}>{post.author}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 오른쪽: 텍스트 + 버튼 */}
        <div className={styles.textSide}>
          <div className={styles.label}>Community Board</div>
          <h2>게시판을{"\n"}구경해보세요</h2>
          <p className={styles.desc}>
            게시판에서 자신의 판매 상품을 홍보하고{"\n"}
            다른 사람과 후기를 나누세요!!!
          </p>
          <Link href="/board" className={styles.boardBtn}>
            게시판 바로가기
            <span className={styles.arrow}>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
