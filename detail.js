// detail.js 파일 
document.addEventListener("DOMContentLoaded", async () => {
    // 1. URL에서 이벤트 ID를 가져옵니다.
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');
    const mobileNavItems = document.querySelectorAll('#mobile-nav .nav-item'); // 네비게이션 요소 추가

    if (!eventId) {
        window.location.href = 'index.html';
        return;
    }

    // 2. 데이터 및 리뷰 로직 
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
            reviewListDiv.innerHTML = '<p style="text-align:center;">아직 작성된 리뷰가 없습니다. 첫 리뷰를 남겨보세요!</p>';
            return;
        }

        reviewListDiv.innerHTML = reviews.map(review => `
            <div class="review-item">
                <div class="review-meta">
                    <strong>${review.user}</strong> <span>(${review.date})</span>
                    <button class="delete-review-btn" data-review-id="${review.id}">X 삭제</button>
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
        // HTML 템플릿 렌더링 
        const detailContainer = document.getElementById('detail-container');
        detailContainer.innerHTML = `
            <div class="detail-card">
                <div class="detail-card-image-area">
                    <img src="${event.image}" alt="${event.title}">
                    <div id="map-in-info" style="width:100%; height:300px; margin-top: 20px; border-radius: 8px;"></div>
                </div>

                <div class="detail-card-info-area">
                    <div class="detail-header">
                        <h2>${event.title}</h2>
                    </div>
                    
                    <p><strong>날짜:</strong> ${event.date}</p>
                    <p><strong>장소:</strong> ${event.location}</p>
                    <p><strong>카테고리:</strong> ${event.category}</p>
                    
                    <hr>
                    
                    <p class="description-text">
                        ${event.description}
                    </p>
                    
                    <a href="https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(event.title + ' 블로그 후기')}" 
                       target="_blank" class="naver-button">
                        🔍 네이버 블로그 후기 보러가기
                    </a>
                    
                    <div class="review-section">
                        <h3>💬 사용자 리뷰 (${loadReviews().length}개)</h3>
                        
                        <div class="review-list" id="review-list"></div>
                        <form class="review-form" id="review-form">
                            <textarea id="review-text" placeholder="솔직한 리뷰를 남겨주세요! (최대 100자)" maxlength="100"></textarea>
                            <button type="submit">리뷰 등록</button>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        // 3. 리뷰 기능 연결 및 초기 렌더링
        renderReviews();
        const reviewForm = document.getElementById('review-form');
        reviewForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const reviewText = document.getElementById('review-text').value.trim();
            if (reviewText) {
                saveReview(reviewText);
                document.getElementById('review-text').value = ''; 
            } else {
                alert("리뷰 내용을 입력해주세요.");
            }
        });


        // 4. Kakao Maps API가 로드되면 지도 표시
        if (window.kakao && window.kakao.maps) {
            kakao.maps.load(() => {
                const mapContainer = document.getElementById('map-in-info'); 
                const mapOption = { center: new kakao.maps.LatLng(event.lat, event.lng), level: 3 };
                const map = new kakao.maps.Map(mapContainer, mapOption);

                const markerPosition = new kakao.maps.LatLng(event.lat, event.lng);
                const marker = new kakao.maps.Marker({ position: markerPosition });
                marker.setMap(map);
            });
        } else {
             console.error("Kakao Maps SDK is not loaded.");
        }
        
        // 5. 페이지 하단에 있던 전역 지도 숨기기
        const globalMapDiv = document.getElementById('map');
        if (globalMapDiv) globalMapDiv.style.display = 'none';
        
        
        //  6. 하단 내비게이션 버튼 이벤트 연결 (핵심)
        mobileNavItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const nav = item.getAttribute('data-nav');
                
                // 홈으로 돌아가는 버튼이 아닌 경우에만 페이지 이동을 강제합니다.
                if (nav === 'save' || nav === 'mydining' || nav === 'home') {
                    e.preventDefault(); // 기본 이동을 막고
                    
                    let targetUrl = 'index.html';
                    if (nav === 'save') {
                        targetUrl += '?filter=favorites';
                    } else if (nav === 'mydining') {
                        targetUrl += '?filter=ended';
                    }
                    
                    window.location.href = targetUrl; // 쿼리를 포함하여 메인 페이지로 이동
                }
            });
        });


    } else {
        document.getElementById('detail-container').innerHTML = `
            <p>이벤트 정보를 찾을 수 없습니다.</p>
        `;
    }
});