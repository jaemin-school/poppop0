// map.js 파일 
document.addEventListener("DOMContentLoaded", () => {
    
    // 하단 네비게이션 요소 가져오기
    const mobileNavItems = document.querySelectorAll('#mobile-nav .nav-item');

    // 1. Kakao Maps API 로드 보장 
    kakao.maps.load(async () => {
        // 2. Geolocation API를 사용하여 현재 위치 가져오기 
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLat = position.coords.latitude;
                    const userLng = position.coords.longitude;
                    
                    initMap(userLat, userLng);
                    loadAndFilterNearbyEvents(userLat, userLng); 
                },
                (error) => {
                    console.error("위치 정보를 가져오는 데 실패했습니다:", error);
                    alert("위치 정보를 사용할 수 없습니다. 기본 위치(서울)로 지도를 표시합니다. (Console 확인 필요)");
                    initMap(37.5668, 126.9785);
                    loadAndFilterNearbyEvents(37.5668, 126.9785);
                }
            );
        } else {
            alert("이 브라우저는 Geolocation을 지원하지 않습니다.");
            initMap(37.5668, 126.9785);
            loadAndFilterNearbyEvents(37.5668, 126.9785);
        }
    });

    // 지도 초기화 함수 
    function initMap(lat, lng) {
        const mapContainer = document.getElementById('map');
        const mapOption = {
            center: new kakao.maps.LatLng(lat, lng),
            level: 7 
        };
        window.map = new kakao.maps.Map(mapContainer, mapOption); 
        
        new kakao.maps.Marker({
            position: new kakao.maps.LatLng(lat, lng),
            map: window.map,
            title: "현재 나의 위치"
        });
    }

    // 5. 주변 이벤트 필터링 및 지도 표시 로직 
    async function loadAndFilterNearbyEvents(userLat, userLng) {
        const res = await fetch('data.json');
        const data = await res.json();
        const allEvents = data.events;
        const radiusKm = 500; // 테스트를 위해 500km로 임시 확장

        // Haversine 공식 (거리 계산)
        const calculateDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371; 
            const dLat = (lat2 - lat1) * (Math.PI / 180);
            const dLon = (lon2 - lon1) * (Math.PI / 180);
            const a = 
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c; 
        };

        const nearbyEvents = [];
        const infowindow = new kakao.maps.InfoWindow({zIndex: 1});

        for (const event of allEvents) {
            if (typeof event.lat === 'number' && typeof event.lng === 'number') {
                const distance = calculateDistance(userLat, userLng, event.lat, event.lng);
                
                if (distance <= radiusKm) {
                    event.distance = distance.toFixed(2);
                    nearbyEvents.push(event); 
                }
            } else {
                 console.warn(`[좌표 누락/오류] ID:${event.id}, 주소: ${event.location} - data.json에 유효한 lat/lng 값이 없습니다.`);
            }
        }
        
        const nearbyList = document.getElementById('nearby-list');
        
        if (nearbyEvents.length === 0) {
            nearbyList.innerHTML = `<p style="text-align:center;">현재 위치 주변 (${radiusKm}km 이내)에 이벤트가 없습니다. (data.json의 좌표 확인 필요)</p>`;
            window.map.setLevel(10); 
            return;
        }

        // 마커 생성 및 정보창 리스너 연결 
        nearbyEvents.forEach(event => {
            const markerPosition = new kakao.maps.LatLng(event.lat, event.lng);

            const marker = new kakao.maps.Marker({
                position: markerPosition,
                map: window.map,
                title: event.title
            });

            kakao.maps.event.addListener(marker, 'click', function() {
                const content = `
                    <div style="padding:10px; font-size:12px; min-width: 150px;">
                        <b>${event.title}</b><br>
                        ${event.location}<br>
                        ${event.distance} km 거리
                        <br><a href="detail.html?id=${event.id}" style="color: blue;">상세보기</a>
                    </div>
                `;
                infowindow.setContent(content);
                infowindow.open(window.map, marker);
            });
        });

        // 지도 중심 및 레벨 조정
        window.map.setCenter(new kakao.maps.LatLng(userLat, userLng));
        window.map.setLevel(5); 
        
        // 목록 영역 업데이트 
        nearbyList.innerHTML = `
            <h3>${radiusKm}km 이내 이벤트 (${nearbyEvents.length}개)</h3>
            ${nearbyEvents.map(event => `
                <div style="border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 8px;">
                    <a href="detail.html?id=${event.id}" style="text-decoration: none; color: inherit;">
                        <h4>${event.title} (${event.distance} km)</h4>
                    </a>
                    <p>${event.location} (${event.date})</p>
                </div>
            `).join('')}
        `;
    }

    // 6. 하단 네비게이션 버튼에 이벤트 리스너 추가 
    mobileNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const nav = item.getAttribute('data-nav');
            
            // 페이지 이동을 막고, JavaScript로 이동 경로를 설정합니다.
            e.preventDefault(); 
            
            if (nav === 'save') {
                // '저장' 버튼 클릭: 찜 목록 필터 쿼리와 함께 index.html로 이동
                window.location.href = 'index.html?filter=favorites';
            } else if (nav === 'mydining') {
                // '마이다이닝' 버튼 클릭: 종료된 이벤트 필터 쿼리와 함께 index.html로 이동
                window.location.href = 'index.html?filter=ended';
            } else if (nav === 'home') {
                // '홈' 버튼 클릭: 필터 없이 index.html로 이동 (초기화)
                window.location.href = 'index.html';
            }
            // 'nearby'는 현재 페이지이므로, href="#" 상태로 아무 작업도 하지 않습니다.
        });
    });
});