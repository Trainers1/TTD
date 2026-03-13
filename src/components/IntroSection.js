import styles from "./IntroSection.module.css";

/* [[빨간색]] 마크업 파싱 */
function parseHeadline(text) {
  if (!text) return null;
  const parts = text.split(/(\[\[[\s\S]*?\]\])/);
  const result = [];
  parts.forEach((part, i) => {
    if (part.startsWith("[[") && part.endsWith("]]")) {
      result.push(<em key={i}>{part.slice(2, -2)}</em>);
    } else {
      part.split("\n").forEach((line, j) => {
        if (j > 0) result.push(<br key={`${i}-${j}`} />);
        if (line) result.push(line);
      });
    }
  });
  return result;
}

function parseLineBreaks(text) {
  if (!text) return null;
  return text.split("\n").map((line, i, arr) => (
    <span key={i}>
      {line}
      {i < arr.length - 1 && <br />}
    </span>
  ));
}

export default function IntroSection({ intro }) {
  const headline = intro?.headline ?? "ㅌㅌㄷ의\n메인 [[캐치프레이즈]]를 적는 위치";
  const description1 = intro?.description1 ?? "ㅌㅌㄷ 상세 설명 1";
  const description2 = intro?.description2 ?? "ㅌㅌㄷ 상세 설명 2";

  return (
    <div className={styles.desc}>
      <div className={styles.brand}>
        <div className={styles.brandName}>
          ㅌㅌㄷ<span className={styles.dot}>.</span>
        </div>
        <span className={styles.brandTag}>TTD : Trainers Trading Day</span>
      </div>
      <div className={styles.text}>
        <h2>{parseHeadline(headline)}</h2>
        <p>{description1}</p>
        <p>{parseLineBreaks(description2)}</p>
      </div>
    </div>
  );
}
