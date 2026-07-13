// 차량 운행일지 서비스 워커 — 오프라인 사용 지원
const CACHE_NAME = 'driving-log-v260714';
const APP_SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET') return;

    // version.json은 항상 네트워크에서 (업데이트 확인용)
    if (url.pathname.endsWith('version.json')) return;

    // API 호출(카카오/구글)은 캐시하지 않음
    if (url.hostname.includes('dapi.kakao.com') || url.hostname.includes('googleapis.com')) return;

    // 앱 셸: 네트워크 우선, 실패 시 캐시 (항상 최신 유지 + 오프라인 대비)
    if (url.origin === self.location.origin) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // CDN 라이브러리: 캐시 우선, 없으면 네트워크 후 캐시 (오프라인에서도 라이브러리 사용 가능)
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                if (response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                }
                return response;
            });
        })
    );
});
