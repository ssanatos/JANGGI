// coi-serviceworker.js
// GitHub Pages처럼 응답 헤더를 직접 설정할 수 없는 정적 호스팅에서,
// 이 파일을 서비스워커로 등록하면 모든 응답에 Cross-Origin-Opener-Policy /
// Cross-Origin-Embedder-Policy 헤더를 강제로 붙여서 페이지를
// "cross-origin isolated" 상태로 만든다. 이 상태여야만 브라우저가
// SharedArrayBuffer 생성을 허용하며, pthread(멀티스레드)로 빌드된
// Fairy-Stockfish WASM이 정상적으로 초기화된다.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', function (event) {
  const req = event.request;
  // 캐시 전용 요청은 그대로 통과시킨다 (서비스워커가 없으면 실패하는 요청들).
  if (req.cache === 'only-if-cached' && req.mode !== 'same-origin') return;

  event.respondWith(
    fetch(req).then(function (response) {
      // opaque 응답(교차 출처 리소스 등)은 헤더를 건드릴 수 없으므로 그대로 반환.
      if (response.status === 0) return response;

      const newHeaders = new Headers(response.headers);
      // require-corp는 모든 교차 출처 리소스가 CORP 헤더를 갖고 있어야만
      // 통과시키는데, 쿠팡 파트너스 광고 스크립트가 불러오는 리소스들은
      // 그 헤더가 없어서 require-corp 아래서는 조용히 차단된다.
      // credentialless는 스레드용 cross-origin isolation은 동일하게 제공하면서,
      // 협조하지 않는 교차 출처 리소스는 자격증명(쿠키 등) 없이 익명으로라도
      // 통과시켜 준다 — 광고/서드파티 스크립트와 공존 가능.
      newHeaders.set('Cross-Origin-Embedder-Policy', 'credentialless');
      newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }).catch(function (err) {
      console.error('[coi-serviceworker] fetch 실패:', err);
      throw err;
    })
  );
});
