document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');
    const mobileNavItems = document.querySelectorAll('#mobile-nav .nav-item');

    if (!eventId) {
        window.location.href = 'index.html';
        return;
    }

    const res = await fetch('data.json');
    const data = await res.json();
    const eventData = data.events;
    
    const event = eventData.find(e => e.id === parseInt(eventId));
    const eventKey = `reviews_${eventId}`; 

    const loadReviews = () => {
        const storedReviews = localStorage.getItem(eventKey);
        return storedReviews ? JSON.parse(storedReviews) : [];
    };

    const saveReview = (reviewText) => {
        const reviews = loadReviews();
        const newReview = { id: Date.now(), text: reviewText, user: '익명 사용자', date: new Date().toLocaleDateString('ko-KR') };
        reviews.push(newReview);
        localStorage.setItem(eventKey, JSON.stringify(reviews));
        renderReviews();
    };
    
    const deleteReview = (reviewId) => {
        if (!confirm("정말로 이 리뷰를 삭제하시겠습니까?")) { return; }
        let reviews = loadReviews();
        reviews = reviews.filter(review => review.id !== parseInt(reviewId));
        localStorage.setItem(eventKey, JSON.stringify(reviews));
        renderReviews();
    };

    const renderReviews = () => {
        const reviews = loadReviews();
        const reviewListDiv = document.getElementById('review-list');
        if (!reviewListDiv) return;
        if (reviews.length === 0) {
            reviewListDiv.innerHTML = '<p style="text-align:center; color:#999; font-size:0.9rem;">아직 작성된 리뷰가 없습니다.</p>';
            return;
        }
        reviewListDiv.innerHTML = reviews.map(review => `
            <div class="review-item">
                <div class="review-meta">
                    <strong>${review.user}</strong> <span>${review.date}</span>
                    <button class="delete-review-btn" data-review-id="${review.id}">삭제</button>
                </div>
                <p>${review.text}</p>
            </div>
        `).join('');
        document.querySelectorAll('.delete-review-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reviewId = e.target.getAttribute('data-review-id');
                deleteReview(reviewId);
            });
        });
    };

    if (event) {
        // formatDescription 함수 부분 수정
const formatDescription = (text) => {
    if (!text) return "";
    
    const sections = text.split('\n\n');
    
    return sections.map(section => {
        const trimmed = section.trim();

        // [제목] 처리
        if (trimmed.startsWith('[')) {
            const title = trimmed.replace(/[\[\]]/g, '');
            return `<h4 class="desc-section-title">${title}</h4>`;
        }
        
        // 목록 형태
        if (trimmed.includes('\n') || trimmed.startsWith('-') || /^\d+\./.test(trimmed)) {
            const lines = trimmed.split('\n').map(line => `<li>${line}</li>`).join('');
            return `<ul class="desc-list">${lines}</ul>`;
        }
        
        // 일반 문단
        return `<p class="desc-paragraph">${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).join('');
};
        const formattedDesc = formatDescription(event.description);

        const detailContainer = document.getElementById('detail-container');
        detailContainer.innerHTML = `
            <div class="detail-card">
                <div class="detail-card-image-area">
                    <img src="${event.image}" alt="${event.title}">
                    <div class="map-guide-container">
                        <span class="map-tip">📍 지도 클릭 시 네이버 길찾기 연결</span>
                    </div>
                    <div id="map-in-info" style="width:100%; height:300px; margin-top: 5px; border-radius: 8px; cursor: pointer; border: 1px solid #eee;"></div>
                </div>

                <div class="detail-card-info-area">
                    <div class="detail-header">
                        <h2>${event.title}</h2>
                    </div>
                    <div class="meta-info">
                        <p><strong>날짜</strong> ${event.date}</p>
                        <p><strong>장소</strong> ${event.location}</p>
                        <p><strong>분류</strong> ${event.category}</p>
                    </div>
                    <hr class="thin-hr">
                    
                    <div class="minimal-description">
                        ${formattedDesc}
                    </div>

                    <a href="https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(event.title + ' 블로그 후기')}" 
                       target="_blank" class="naver-button">블로그 후기 검색</a>
                    
                    <div class="review-section">
                        <h3>리뷰 (${loadReviews().length})</h3>
                        <div class="review-list" id="review-list"></div>
                        <form class="review-form" id="review-form">
                            <textarea id="review-text" placeholder="리뷰를 입력하세요." maxlength="100"></textarea>
                            <button type="submit">등록</button>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        renderReviews();
        
        // --- 리뷰 등록 이벤트 ---
        const reviewForm = document.getElementById('review-form');
        reviewForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const reviewText = document.getElementById('review-text').value.trim();
            if (reviewText) {
                saveReview(reviewText);
                document.getElementById('review-text').value = ''; 
            }
        });

        // --- 지도 로직 ---
        if (window.kakao && window.kakao.maps) {
            kakao.maps.load(() => {
                const mapContainer = document.getElementById('map-in-info'); 
                const centerPos = new kakao.maps.LatLng(event.lat, event.lng);
                const mapOption = { center: centerPos, level: 3 };
                const map = new kakao.maps.Map(mapContainer, mapOption);
                
                setTimeout(() => {
                    map.relayout();
                    map.setCenter(centerPos);
                }, 200);

                const marker = new kakao.maps.Marker({ position: centerPos });
                marker.setMap(map);

                const openNaverNav = () => {
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((position) => {
                            const slat = position.coords.latitude; 
                            const slng = position.coords.longitude;
                            const naverNavUrl = `https://map.naver.com/index.nhn?slng=${slng}&slat=${slat}&stext=현재위치&elng=${event.lng}&elat=${event.lat}&etext=${encodeURIComponent(event.title)}&menu=route&pathType=1`;
                            window.open(naverNavUrl, '_blank');
                        }, () => {
                            const naverNavUrl = `https://map.naver.com/index.nhn?elng=${event.lng}&elat=${event.lat}&etext=${encodeURIComponent(event.title)}&menu=route&pathType=1`;
                            window.open(naverNavUrl, '_blank');
                        });
                    }
                };
                kakao.maps.event.addListener(map, 'click', openNaverNav);
                kakao.maps.event.addListener(marker, 'click', openNaverNav);
            });
        }
        
        const globalMapDiv = document.getElementById('map');
        if (globalMapDiv) globalMapDiv.style.display = 'none';
        
        // --- 네비게이션 ---
        mobileNavItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const nav = item.getAttribute('data-nav');
                if (nav === 'save' || nav === 'mydining' || nav === 'home') {
                    e.preventDefault();
                    let targetUrl = 'index.html';
                    if (nav === 'save') targetUrl += '?filter=favorites';
                    else if (nav === 'mydining') targetUrl += '?filter=ended';
                    window.location.href = targetUrl;
                }
            });
        });

    } else {
        document.getElementById('detail-container').innerHTML = `<p>이벤트 정보를 찾을 수 없습니다.</p>`;
    }
});