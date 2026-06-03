"use client";

export default function Error({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page-shell">
      <section className="state-panel" role="alert">
        <h1>공약 정보를 불러오지 못했습니다.</h1>
        <p>잠시 후 다시 시도해주세요.</p>
        <button onClick={reset} type="button">
          다시 시도
        </button>
      </section>
    </main>
  );
}
