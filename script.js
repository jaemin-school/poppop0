document.addEventListener("DOMContentLoaded", () => {
    // 1. HTML 요소 및 전역 상태 변수 설정
    const categoryButtons = document.querySelectorAll(".categories button");
    const regionSelect = document.getElementById("region-select");
    const searchInput = document.getElementById("search-input");
    const eventList = document.getElementById("event-list");
    const dateFilterButtons = document.querySelectorAll(".date-filters button");
    const sortSelect = document.getElementById("sort-select");
    const resetButton = document.getElementById("reset-button"); 
    const mobileNavButtons = document.querySelectorAll("#mobile-nav .nav-item"); 
    
    // 필터 영역 가시성 제어를 위한 요소
    const filterContainer = document.querySelector('.filter-container');
    const mainBannerContainer = document.querySelector('.main-banner-container');
    const headerParagraph = document.querySelector('header p');
    
    let allData = [];
    let selectedCategory = null;
    let selectedPeriod = 'all'; 
    let selectedSort = 'title_asc'; 
    let favorites = []; 
    let selectedStatusFilter = 'all'; 

    // --- 슬라이더 관련 변수 ---
    const availableSliderImages = [
        { url: 'images/sungsu.png', alt: '성수 핑크팝업', id: 1 }, 
        { url: 'images/부산.jpg', alt: '부산 불꽃축제', id: 2 },
        { url: 'images/대구.jpg', alt: '대구 여름 팝업', id: 3 },
        { url: 'images/신촌.jpg', alt: '신촌 물총 축제', id: 4 },
        { url: 'images/yeouido.jpg', alt: '더현대 크리스마스 팝업', id: 6 },
        { url: 'images/jinhae.jpg', alt: '진해 군항제', id: 7 },
        { url: 'images/jeju.jpg', alt: '제주 감성 소품샵 팝업', id: 8 },
        { url: 'images/pohang.jpg', alt: '포항 불빛축제', id: 9 },
        { url: 'images/jamsil.jpg', alt: '잠실 뷰티 체험존', id: 10 },
        { url: 'images/gangneung.jpg', alt: '강릉 커피축제', id: 11 },
        { url: 'images/daejeon.jpg', alt: '대전 성심당 팝업', id: 12 },
        { url: 'images/icheon.jpg', alt: '이천 도자기 축제', id: 13 },
        { url: 'images/myeongdong.jpg', alt: '명동 K-패션 팝업', id: 14 },
        { url: 'images/muju.jpg', alt: '무주 반딧불 축제', id: 15 }
    ];
    let selectedSliderImages = []; 
    let currentSlide = 0;
    let slideInterval; 
    const sliderTrack = document.getElementById('slider-track');
    const prevButton = document.querySelector('.slider-control.prev');
    const nextButton = document.querySelector('.slider-control.next');
    // -------------------------

    // 2. 찜 목록 관리 함수 
    const loadFavorites = () => {
        const storedFavorites = localStorage.getItem('eventFavorites');
        favorites = storedFavorites ? JSON.parse(storedFavorites) : [];
    };
    const saveFavorites = () => {
        localStorage.setItem('eventFavorites', JSON.stringify(favorites));
    };
    const toggleFavorite = (eventId) => {
        const id = parseInt(eventId);
        const index = favorites.indexOf(id);

        if (index > -1) {
            favorites.splice(index, 1);
        } else {
            favorites.push(id);
        }
        saveFavorites();
        renderEvents(); 
    };

    // 3. 데이터 로드 함수 
    async function loadData() {
        try {
            const res = await fetch('data.json');
            if (!res.ok) {
                throw new Error(`데이터 로드 실패: HTTP 상태 ${res.status}`);
            }
            const data = await res.json();
            allData = data.events;
            allData.sort((a, b) => a.title.localeCompare(b.title));
            loadFavorites();
            sortSelect.value = selectedSort; 
            
            selectRandomSliderImages(); 
            initSlider(); 
            renderEvents(); 

        } catch (error) {
            console.error("데이터 로딩 중 치명적인 오류 발생:", error);
            eventList.innerHTML = `<p style="text-align:center;">데이터를 불러오는 데 문제가 발생했습니다. (Console 확인 필요)</p>`;
        }
    }

    // 4. 날짜 헬퍼 함수 
    const parseDate = (dateStr) => {
        const parts = dateStr.includes('~') ? dateStr.split('~') : [dateStr, dateStr];
        const startDate = new Date(parts[0].trim());
        const endDate = new Date(parts[1].trim());
        return { startDate, endDate };
    };
    const getEventStatus = (event) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        const { startDate, endDate } = parseDate(event.date);

        if (today < startDate) { return '예정'; } 
        else if (today >= startDate && today <= endDate) { return '진행 중'; } 
        else { return '종료'; }
    };
    const getDateRange = (period) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const start = new Date(today);
        const end = new Date(today);

        if (period === 'week') {
            const dayOfWeek = today.getDay();
            start.setDate(today.getDate() - dayOfWeek);
            end.setDate(start.getDate() + 6);
        } else if (period === 'month') {
            start.setDate(1);
            end.setMonth(end.getMonth() + 1);
            end.setDate(0); 
        }
        end.setHours(23, 59, 59, 999); 
        return { start, end };
    };
    
    // 5. 복합 정렬 함수 
    const sortEventsByStatusAndDate = (a, b) => {
        const statusA = getEventStatus(a);
        const statusB = getEventStatus(b);

        const getStatusOrder = (status) => {
            if (status === '진행 중') return 1;
            if (status === '예정') return 2;
            return 3;
        };

        const orderA = getStatusOrder(statusA);
        const orderB = getStatusOrder(statusB);

        if (orderA !== orderB) {
            return orderA - orderB;
        }
        
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);

        if (statusA === '진행 중') { return dateA.endDate - dateB.endDate; } 
        else if (statusA === '예정') { return dateA.startDate - dateB.startDate; } 
        else { return dateB.endDate - dateA.endDate; }
    };
    
    // 6. 슬라이더 로직
    const selectRandomSliderImages = () => {
        if (allData.length === 0) return;
        
        const validEvents = allData.filter(e => e.image && e.id);
        if (validEvents.length === 0) return;

        const eventImages = validEvents.map(event => ({
            url: event.image,
            alt: event.title,
            id: event.id
        }));

        const shuffled = [...eventImages].sort(() => 0.5 - Math.random());
        selectedSliderImages = shuffled.slice(0, 4); // ✨ 4개 이미지 선택
        
        selectedSliderImages = selectedSliderImages.map(img => ({
            ...img,
            link: `detail.html?id=${img.id}` 
        }));
    };

    const moveSlide = (index) => {
        if (selectedSliderImages.length === 0 || !sliderTrack || !sliderTrack.querySelector('.slide-item')) return;
        const slideWidth = sliderTrack.querySelector('.slide-item').offsetWidth;
        sliderTrack.style.transform = `translateX(-${index * slideWidth}px)`;
        currentSlide = index;
    };
    const showNextSlide = () => {
        let nextIndex = currentSlide + 1;
        if (nextIndex >= selectedSliderImages.length) { nextIndex = 0; }
        moveSlide(nextIndex);
    };
    const showPrevSlide = () => {
        let prevIndex = currentSlide - 1;
        if (prevIndex < 0) { prevIndex = selectedSliderImages.length - 1; }
        moveSlide(prevIndex);
    };
    const initSlider = () => {
        if (!sliderTrack || !prevButton || !nextButton) {
             console.error("슬라이더 HTML 요소를 찾을 수 없습니다.");
             return;
        }
        
        // selectedSliderImages 배열을 사용하여 HTML 생성
        sliderTrack.innerHTML = selectedSliderImages.map(img => `
            <div class="slide-item" style="background-image: url('${img.url}')" onclick="window.location.href='${img.link}'">
            </div>
        `).join('');

        nextButton.addEventListener('click', showNextSlide);
        prevButton.addEventListener('click', showPrevSlide);
        
        if (selectedSliderImages.length > 1) {
             slideInterval = setInterval(showNextSlide, 10000); // ✨ 5000ms (5초)로 설정
             prevButton.style.display = 'block';
             nextButton.style.display = 'block';
             const sliderContainer = document.querySelector('.image-slider');
             if (sliderContainer) {
                 sliderContainer.addEventListener('mouseover', () => clearInterval(slideInterval));
                 sliderContainer.addEventListener('mouseleave', () => {
                     slideInterval = setInterval(showNextSlide, 10000); // ✨ 5000ms (5초)로 설정
                 });
             }
        } else {
             prevButton.style.display = 'none';
             nextButton.style.display = 'none';
        }
    };

    // 7. 이벤트 렌더링 함수 
    function renderEvents() {
        
        // 뷰 클래스 토글 및 요소 가시성 제어
        if (selectedStatusFilter === 'ended') {
             document.body.classList.add('mydining-view');
             if (filterContainer) filterContainer.style.display = 'none';
             if (mainBannerContainer) mainBannerContainer.style.display = 'none';
             if (headerParagraph) headerParagraph.style.display = 'none';
        } else {
             document.body.classList.remove('mydining-view');
             if (filterContainer) filterContainer.style.display = '';
             if (mainBannerContainer) mainBannerContainer.style.display = '';
             if (headerParagraph) headerParagraph.style.display = '';
        }

        let filtered = [...allData];

        if (selectedStatusFilter === 'ended') { filtered = filtered.filter(e => getEventStatus(e) === '종료'); }
        if (selectedCategory) {
            if (selectedCategory === 'favorites') { filtered = filtered.filter(e => favorites.includes(e.id)); } 
            else { filtered = filtered.filter(e => e.category === selectedCategory); }
        }
        const region = regionSelect.value;
        if (region !== "all") { filtered = filtered.filter(e => e.location.includes(region)); }
        const keyword = searchInput.value.trim().toLowerCase();
        if (keyword) {
            filtered = filtered.filter(e =>
                e.title.toLowerCase().includes(keyword) || e.location.toLowerCase().includes(keyword)
            );
        }
        if (selectedPeriod !== 'all') {
            const { start: filterStart, end: filterEnd } = getDateRange(selectedPeriod);
            filtered = filtered.filter(event => {
                const { startDate: eventStart, endDate: eventEnd } = parseDate(event.date);
                return eventStart <= filterEnd && eventEnd >= filterStart;
            });
        }

        const sortType = sortSelect.value;
        if (sortType === 'title_asc') { filtered.sort((a, b) => a.title.localeCompare(b.title)); } 
        else if (sortType === 'date_asc') { filtered.sort((a, b) => parseDate(a.date).startDate - parseDate(b.date).startDate); } 
        
        if (filtered.length === 0) {
            let message = `<p class="no-results">검색 결과가 없습니다.</p>`;
            if (selectedCategory === 'favorites' && allData.length > 0) {
                message = `<p class="no-results">찜 목록이 비어있습니다. 관심 있는 이벤트를 추가해 보세요!</p>`;
            } else if (selectedStatusFilter === 'ended') {
                message = `<p class="no-results">종료된 이벤트가 없거나, 필터링 결과가 없습니다.</p>`;
            }
            eventList.innerHTML = message;
            eventList.classList.remove("hidden");
            return;
        }

        // 홈 화면 콘텐츠 분리 로직 (세 구역 렌더링)
        let finalHtml = '';
        const isDefaultView = !selectedCategory && selectedPeriod === 'all' && region === 'all' && !keyword && selectedStatusFilter === 'all';

        const createEventHtml = (events, isListView = false) => events.map(event => {
            const status = getEventStatus(event);
            const statusClass = { '진행 중': 'status-ongoing', '예정': 'status-upcoming', '종료': 'status-ended' }[status];
            const isFavorite = favorites.includes(event.id);
            const favoriteClass = isFavorite ? 'is-favorite' : 'is-not-favorite';
            const heartSymbol = isFavorite ? '❤️' : '🤍';

            const cardContent = `
                <div class="favorite-icon ${favoriteClass}" data-id="${event.id}">
                    ${heartSymbol}
                </div>
                <img src="${event.image}" alt="${event.title}">
                <div class="status-tag ${statusClass}">${status}</div> 
                <h3>${event.title}</h3>
                <p>${event.date}</p>
                <p>${event.location}</p>
            `;
            
            if (isListView) {
                 return `
                    <div class="event-card" data-id="${event.id}">
                        <img src="${event.image}" alt="${event.title}">
                        <div class="event-card-content">
                            <div class="favorite-icon ${favoriteClass}" data-id="${event.id}">
                                ${heartSymbol}
                            </div>
                            <div class="status-tag ${statusClass}">${status}</div> 
                            <h3>${event.title}</h3>
                            <p>${event.date}</p>
                            <p>${event.location}</p>
                        </div>
                    </div>
                `;
            } else {
                 return `
                    <div class="event-card" data-id="${event.id}">
                        ${cardContent}
                    </div>
                `;
            }

        }).join("");


        if (isDefaultView) {
            const defaultSortedEvents = [...allData].sort(sortEventsByStatusAndDate);

            const top4 = [...defaultSortedEvents].slice(0, 4);
            const upcoming = defaultSortedEvents.filter(e => getEventStatus(e) === '예정').slice(0, 8); 
            const remaining = defaultSortedEvents;

            finalHtml += `<h2 class="content-section-title">🔥 인기 TOP 4 이벤트</h2>`;
            finalHtml += `<div class="event-list-grid">${createEventHtml(top4)}</div>`;

            finalHtml += `<h2 class="content-section-title">📅 다가오는 예정 이벤트</h2>`;
            finalHtml += `<div class="event-list-grid">${createEventHtml(upcoming)}</div>`;
            
            finalHtml += `<h2 class="content-section-title">🔍 전체 이벤트 목록</h2>`;
            finalHtml += `<div class="event-list-grid">${createEventHtml(remaining)}</div>`;

            eventList.innerHTML = finalHtml;
        } else {
            const isListView = selectedStatusFilter === 'ended';
            eventList.innerHTML = `<div class="event-list-grid">${createEventHtml(filtered, isListView)}</div>`;
        }

        eventList.classList.remove("hidden");

        // 이벤트 리스너 등록 (찜하기, 상세 이동)
        document.querySelectorAll('.favorite-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const eventId = icon.getAttribute('data-id');
                if (!favorites.includes(parseInt(eventId))) {
                    icon.classList.add('clicked');
                    setTimeout(() => icon.classList.remove('clicked'), 300);
                }
                toggleFavorite(eventId);
                renderEvents();
            });
        });

        document.querySelectorAll('.event-card').forEach(card => {
            card.addEventListener('click', () => {
                const eventId = card.getAttribute('data-id');
                window.location.href = `detail.html?id=${eventId}`;
            });
        });
    }

    // 8. 이벤트 리스너 등록 및 초기화
    const resetFilters = () => {
        selectedCategory = null;
        selectedPeriod = 'all';
        selectedSort = 'title_asc'; 
        selectedStatusFilter = 'all'; 

        regionSelect.value = 'all';
        searchInput.value = '';
        sortSelect.value = 'title_asc';

        categoryButtons.forEach(btn => btn.classList.remove('active'));
        dateFilterButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-period') === 'all') {
                btn.classList.add('active');
            }
        });
        
        document.querySelector('.nav-item[data-nav="save"]').classList.remove('active');
        document.querySelector('.nav-item[data-nav="mydining"]').classList.remove('active');
        document.querySelector('.nav-item[data-nav="home"]').classList.add('active');

        renderEvents();
    };

    categoryButtons.forEach(button => {
        button.addEventListener("click", () => {
            const clickedCategory = button.getAttribute("data-category");
            const isAlreadySelected = button.classList.contains('active') && selectedCategory === clickedCategory;
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            
            selectedStatusFilter = 'all';
            document.querySelector('.nav-item[data-nav="save"]').classList.remove('active');
            document.querySelector('.nav-item[data-nav="mydining"]').classList.remove('active');
            document.querySelector('.nav-item[data-nav="home"]').classList.add('active');


            if (!isAlreadySelected) {
                button.classList.add('active');
                selectedCategory = clickedCategory;
            } else {
                selectedCategory = null;
            }
            renderEvents();
        });
    });

    mobileNavButtons.forEach(navItem => {
        navItem.addEventListener('click', (e) => {
            const nav = navItem.getAttribute('data-nav');
            
            mobileNavButtons.forEach(item => item.classList.remove('active'));
            navItem.classList.add('active');
            
            selectedCategory = null; 
            selectedStatusFilter = 'all'; 
            categoryButtons.forEach(btn => btn.classList.remove('active')); 

            if (nav === 'save') {
                e.preventDefault(); 
                
                selectedCategory = 'favorites';
                categoryButtons.forEach(btn => {
                    if (btn.getAttribute('data-category') === 'favorites') {
                         btn.classList.add('active');
                    }
                });
                renderEvents();

            } else if (nav === 'mydining') {
                e.preventDefault(); 
                
                selectedStatusFilter = 'ended';
                renderEvents();

            } else if (nav === 'home') {
                 e.preventDefault(); 
                 resetFilters();
                 
            } else if (nav === 'nearby') {
                 window.location.href = 'map.html'; 
            }
        });
    });

    dateFilterButtons.forEach(button => {
        button.addEventListener("click", () => {
            selectedPeriod = button.getAttribute("data-period");
            dateFilterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            renderEvents();
        });
    });

    sortSelect.addEventListener("change", (e) => {
        selectedSort = e.target.value;
        renderEvents();
    });

    resetButton.addEventListener('click', resetFilters); 
    regionSelect.addEventListener("change", renderEvents);
    searchInput.addEventListener("input", renderEvents);

    // 9. 페이지 로드 시 초기화
    loadData().then(() => {
        selectRandomSliderImages(); 
        initSlider(); 
    });
});