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
    let selectedSliderImages = []; 
    let currentSlide = 0;
    let slideInterval; 
    const sliderTrack = document.getElementById('slider-track');
    const prevButton = document.querySelector('.slider-control.prev');
    const nextButton = document.querySelector('.slider-control.next');

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
        if (index > -1) { favorites.splice(index, 1); } else { favorites.push(id); }
        saveFavorites();
        renderEvents(); 
    };

    // 3. 데이터 로드 함수 
    async function loadData() {
        try {
            const res = await fetch('data.json');
            if (!res.ok) throw new Error(`데이터 로드 실패: HTTP 상태 ${res.status}`);
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
            eventList.innerHTML = `<p style="text-align:center;">데이터를 불러오는 데 문제가 발생했습니다.</p>`;
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
        if (today < startDate) return '예정';
        else if (today >= startDate && today <= endDate) return '진행 중';
        else return '종료';
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
        if (orderA !== orderB) return orderA - orderB;
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        if (statusA === '진행 중') return dateA.endDate - dateB.endDate;
        else if (statusA === '예정') return dateA.startDate - dateB.startDate;
        else return dateB.endDate - dateA.endDate;
    };
    
    const selectRandomSliderImages = () => {
        if (allData.length === 0) return;
        const validEvents = allData.filter(e => e.image && e.id);
        const eventImages = validEvents.map(event => ({
            url: event.image, alt: event.title, id: event.id
        }));
        const shuffled = [...eventImages].sort(() => 0.5 - Math.random());
        selectedSliderImages = shuffled.slice(0, 4);
        selectedSliderImages = selectedSliderImages.map(img => ({
            ...img, link: `detail.html?id=${img.id}` 
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
        if (nextIndex >= selectedSliderImages.length) nextIndex = 0;
        moveSlide(nextIndex);
    };
    const showPrevSlide = () => {
        let prevIndex = currentSlide - 1;
        if (prevIndex < 0) prevIndex = selectedSliderImages.length - 1;
        moveSlide(prevIndex);
    };
    const initSlider = () => {
        if (!sliderTrack || !prevButton || !nextButton) return;
        sliderTrack.innerHTML = selectedSliderImages.map(img => `
            <div class="slide-item" style="background-image: url('${img.url}')" onclick="window.location.href='${img.link}'"></div>
        `).join('');
        nextButton.addEventListener('click', showNextSlide);
        prevButton.addEventListener('click', showPrevSlide);
        if (selectedSliderImages.length > 1) {
            slideInterval = setInterval(showNextSlide, 10000);
            const sliderContainer = document.querySelector('.image-slider');
            if (sliderContainer) {
                sliderContainer.addEventListener('mouseover', () => clearInterval(slideInterval));
                sliderContainer.addEventListener('mouseleave', () => {
                    slideInterval = setInterval(showNextSlide, 10000);
                });
            }
        }
    };

    // 7. 이벤트 렌더링 함수 (더보기/접기 토글 포함)
    function renderEvents() {
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
        if (selectedStatusFilter === 'ended') filtered = filtered.filter(e => getEventStatus(e) === '종료');
        if (selectedCategory) {
            if (selectedCategory === 'favorites') filtered = filtered.filter(e => favorites.includes(e.id));
            else filtered = filtered.filter(e => e.category === selectedCategory);
        }
        const region = regionSelect.value;
        if (region !== "all") filtered = filtered.filter(e => e.location.includes(region));
        const keyword = searchInput.value.trim().toLowerCase();
        if (keyword) {
            filtered = filtered.filter(e => e.title.toLowerCase().includes(keyword) || e.location.toLowerCase().includes(keyword));
        }
        if (selectedPeriod !== 'all') {
            const { start: filterStart, end: filterEnd } = getDateRange(selectedPeriod);
            filtered = filtered.filter(event => {
                const { startDate: eventStart, endDate: eventEnd } = parseDate(event.date);
                return eventStart <= filterEnd && eventEnd >= filterStart;
            });
        }

        const sortType = sortSelect.value;
        if (sortType === 'title_asc') filtered.sort((a, b) => a.title.localeCompare(b.title));
        else if (sortType === 'date_asc') filtered.sort((a, b) => parseDate(a.date).startDate - parseDate(b.date).startDate);

        if (filtered.length === 0) {
            eventList.innerHTML = `<p class="no-results">검색 결과가 없습니다.</p>`;
            eventList.classList.remove("hidden");
            return;
        }

        let finalHtml = '';
        const isDefaultView = !selectedCategory && selectedPeriod === 'all' && region === 'all' && !keyword && selectedStatusFilter === 'all';

        const createEventHtml = (events, isListView = false) => events.map(event => {
            const status = getEventStatus(event);
            const statusClass = { '진행 중': 'status-ongoing', '예정': 'status-upcoming', '종료': 'status-ended' }[status];
            const isFavorite = favorites.includes(event.id);
            const heartSymbol = isFavorite ? '❤️' : '🤍';
            return `
                <div class="event-card" data-id="${event.id}">
                    <div class="favorite-icon ${isFavorite ? 'is-favorite' : 'is-not-favorite'}" data-id="${event.id}">${heartSymbol}</div>
                    <img src="${event.image}" alt="${event.title}">
                    <div class="${isListView ? 'event-card-content' : ''}">
                        <div class="status-tag ${statusClass}">${status}</div> 
                        <h3>${event.title}</h3>
                        <p>${event.date}</p>
                        <p>${event.location}</p>
                    </div>
                </div>`;
        }).join("");

        if (isDefaultView) {
            const defaultSortedEvents = [...allData].sort(sortEventsByStatusAndDate);
            const top4 = [...defaultSortedEvents].slice(0, 4);
            
            // 데이터 준비
            const upcomingAll = defaultSortedEvents.filter(e => getEventStatus(e) === '예정');
            const upcomingDisplay = upcomingAll.slice(0, 5);
            const remaining = defaultSortedEvents;

            finalHtml += `<h2 class="content-section-title">🔥 인기 TOP 4 이벤트</h2>`;
            finalHtml += `<div class="event-list-grid">${createEventHtml(top4)}</div>`;

            //  예정 이벤트 헤더와 '더보기/접기' 토글 버튼
            finalHtml += `
                <div style="display: flex; justify-content: space-between; align-items: flex-end; max-width: 1200px; margin: 2.5rem auto 1rem auto; padding: 0 2rem; border-bottom: 2px solid #FFC72C; padding-bottom: 8px;">
                    <h2 style="margin: 0; font-size: 1.8rem; font-weight: 700; color: #333;">📅 다가오는 예정 이벤트</h2>
                    ${upcomingAll.length > 5 ? `<span id="btn-toggle-upcoming" style="cursor: pointer; font-size: 0.9rem; color: #888; font-weight: bold;">더보기 +</span>` : ''}
                </div>
                <div id="upcoming-container" class="event-list-grid">${createEventHtml(upcomingDisplay)}</div>
            `;
            
            finalHtml += `<h2 class="content-section-title">🔍 전체 이벤트 목록</h2>`;
            finalHtml += `<div class="event-list-grid">${createEventHtml(remaining)}</div>`;
            eventList.innerHTML = finalHtml;

            //  토글 리스너 바인딩
            const toggleBtn = document.getElementById('btn-toggle-upcoming');
            if (toggleBtn) {
                toggleBtn.onclick = () => {
                    const container = document.getElementById('upcoming-container');
                    if (toggleBtn.innerText.includes('더보기')) {
                        container.innerHTML = createEventHtml(upcomingAll);
                        toggleBtn.innerText = '접기 -';
                    } else {
                        container.innerHTML = createEventHtml(upcomingDisplay);
                        toggleBtn.innerText = '더보기 +';
                        toggleBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    addEventListenersToCards(); // 카드 재생성 후 리스너 다시 연결
                };
            }
        } else {
            const isListView = selectedStatusFilter === 'ended';
            eventList.innerHTML = `<div class="event-list-grid">${createEventHtml(filtered, isListView)}</div>`;
        }

        addEventListenersToCards();
    }

    function addEventListenersToCards() {
        document.querySelectorAll('.favorite-icon').forEach(icon => {
            icon.onclick = (e) => {
                e.stopPropagation();
                toggleFavorite(icon.getAttribute('data-id'));
            };
        });
        document.querySelectorAll('.event-card').forEach(card => {
            card.onclick = () => {
                window.location.href = `detail.html?id=${card.getAttribute('data-id')}`;
            };
        });
    }

    const resetFilters = () => {
        selectedCategory = null; selectedPeriod = 'all'; selectedSort = 'title_asc'; selectedStatusFilter = 'all'; 
        regionSelect.value = 'all'; searchInput.value = ''; sortSelect.value = 'title_asc';
        categoryButtons.forEach(btn => btn.classList.remove('active'));
        dateFilterButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-period') === 'all') btn.classList.add('active');
        });
        document.body.classList.remove('mydining-view');
        if (filterContainer) filterContainer.style.display = 'flex';
        if (mainBannerContainer) mainBannerContainer.style.display = 'flex';
        if (headerParagraph) headerParagraph.style.display = 'block';
        mobileNavButtons.forEach(item => item.classList.remove('active'));
        const homeNav = document.querySelector('.nav-item[data-nav="home"]');
        if (homeNav) homeNav.classList.add('active');
        renderEvents();
    };

    categoryButtons.forEach(button => {
        button.addEventListener("click", () => {
            selectedCategory = button.getAttribute("data-category");
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            selectedStatusFilter = 'all';
            renderEvents();
        });
    });

    mobileNavButtons.forEach(navItem => {
        navItem.addEventListener('click', (e) => {
            const nav = navItem.getAttribute('data-nav');
            mobileNavButtons.forEach(item => item.classList.remove('active'));
            navItem.classList.add('active');
            if (nav === 'save') { e.preventDefault(); selectedCategory = 'favorites'; renderEvents(); }
            else if (nav === 'mydining') { e.preventDefault(); selectedStatusFilter = 'ended'; renderEvents(); }
            else if (nav === 'home') { e.preventDefault(); resetFilters(); }
            else if (nav === 'nearby') { window.location.href = 'map.html'; }
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

    const logoLink = document.querySelector('header h1 a');
    if (logoLink) {
        logoLink.addEventListener('click', (e) => {
            if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
                e.preventDefault(); resetFilters(); window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    loadData();
});