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
      newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
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
