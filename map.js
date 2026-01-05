// map.js 파일
document.addEventListener("DOMContentLoaded", () => {
    
    const mobileNavItems = document.querySelectorAll('#mobile-nav .nav-item');

    // 1. Kakao Maps API 로드
    kakao.maps.load(async () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLat = position.coords.latitude;
                    const userLng = position.coords.longitude;
                    initMap(userLat, userLng);
                    loadAndFilterNearbyEvents(userLat, userLng); 
                },
                (error) => {
                    console.error("위치 획득 실패:", error);
                    alert("위치 정보를 사용할 수 없어 기본 위치(서울)로 표시합니다.");
                    initMap(37.5668, 126.9785);
                    loadAndFilterNearbyEvents(37.5668, 126.9785);
                }
            );
        } else {
            initMap(37.5668, 126.9785);
            loadAndFilterNearbyEvents(37.5668, 126.9785);
        }
    });

    // 2. 지도 초기화 및 내 위치 마커
    function initMap(lat, lng) {
        const mapContainer = document.getElementById('map');
        const mapOption = {
            center: new kakao.maps.LatLng(lat, lng),
            level: 7 
        };
        window.map = new kakao.maps.Map(mapContainer, mapOption); 
        
        const imageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png'; 
        const imageSize = new kakao.maps.Size(24, 35); 
        const markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize);

        new kakao.maps.Marker({
            position: new kakao.maps.LatLng(lat, lng),
            map: window.map,
            image: markerImage, 
            title: "나의 현재 위치"
        });
    }

    // 3. 주변 이벤트 로드 및 마커 생성 (가장 가까운 4개만 리스트에 표시)
    async function loadAndFilterNearbyEvents(userLat, userLng) {
        const res = await fetch('data.json');
        const data = await res.json();
        const allEvents = data.events;
        const radiusKm = 500; 

        const calculateDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371; 
            const dLat = (lat2 - lat1) * (Math.PI / 180);
            const dLon = (lon2 - lon1) * (Math.PI / 180);
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
        };

        const nearbyEvents = [];
        const infowindow = new kakao.maps.InfoWindow({zIndex: 10});

        for (const event of allEvents) {
            if (typeof event.lat === 'number' && typeof event.lng === 'number') {
                const distance = calculateDistance(userLat, userLng, event.lat, event.lng);
                if (distance <= radiusKm) {
                    event.distanceNum = distance; 
                    event.distance = distance.toFixed(1);
                    nearbyEvents.push(event); 
                }
            }
        }

        // ✨ 거리순 정렬 후 상위 4개 추출
        nearbyEvents.sort((a, b) => a.distanceNum - b.distanceNum);
        const top4Events = nearbyEvents.slice(0, 4);
        
        const nearbyList = document.getElementById('nearby-list');
        if (nearbyEvents.length === 0) {
            nearbyList.innerHTML = '<p style="text-align:center; padding: 40px; grid-column: 1/-1;">주변에 이벤트가 없습니다.</p>';
            return;
        }

        // 4. 지도 마커 생성
        nearbyEvents.forEach(event => {
            const marker = new kakao.maps.Marker({
                position: new kakao.maps.LatLng(event.lat, event.lng),
                map: window.map,
                title: event.title
            });

            kakao.maps.event.addListener(marker, 'click', function() {
                const content = `
                    <div style="padding:15px; font-size:13px; min-width: 180px; border-radius:10px; text-align:left;">
                        <div style="font-weight:bold; margin-bottom:5px; color:#333;">${event.title}</div>
                        <div style="color:#666; font-size:11px; margin-bottom:8px;">${event.location}</div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="color:#FFC72C; font-weight:bold;">${event.distance} km</span>
                            <a href="detail.html?id=${event.id}" style="text-decoration:none; background:#FFC72C; color:#fff; padding:3px 8px; border-radius:4px; font-size:11px;">상세보기</a>
                        </div>
                    </div>
                `;
                infowindow.setContent(content);
                infowindow.open(window.map, marker);
            });
        });

        // 5. ✨ 하단 목록 UI (4개 가로 그리드 최적화)
        // 불필요한 태그와 ' 문자를 제거하여 깔끔하게 출력합니다.
        nearbyList.innerHTML = top4Events.map(event => `
            <div class="nearby-item" onclick="location.href='detail.html?id=${event.id}'">
                <img src="${event.image}" alt="${event.title}">
                <div class="nearby-info">
                    <h4>${event.title}</h4>
                    <div class="distance-tag">${event.distance} km</div>
                </div>
            </div>
        `).join('');
    }

    // 6. 네비게이션 이동 로직
    mobileNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const nav = item.getAttribute('data-nav');
            if (nav === 'home') window.location.href = 'index.html';
            else if (nav === 'save') window.location.href = 'index.html?view=favorites';
            else if (nav === 'community') window.location.href = 'community.html';
        });
    });
});