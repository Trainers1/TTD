import "@/styles/globals.css";

export const metadata = {
  metadataBase: new URL("https://www.ttd.kr"),
  title: "ㅌㅌㄷ - 트레이너스 트레이딩 데이",
  description: "카드를 좋아하는 사람들이 함께하는 TCG 플리마켓",
  openGraph: {
    title: "ㅌㅌㄷ - 트레이너스 트레이딩 데이",
    description: "카드를 좋아하는 사람들이 함께하는 TCG 플리마켓",
    type: "website",
    locale: "ko_KR",
    url: "https://www.ttd.kr",
  },
  icons: {
    icon: "/images/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
