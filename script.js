document.addEventListener('DOMContentLoaded', () => {
    const radioListContainer = document.getElementById('radio-list');
    const player = document.getElementById('player');
    const playerLogo = document.getElementById('player-logo');
    const playerName = document.getElementById('player-name');
    const playerTrack = document.getElementById('player-track');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const tabAll = document.getElementById('tab-all');
    const tabFav = document.getElementById('tab-fav');
    const searchInput = document.getElementById('search-input');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const playerInfoWrapper = document.getElementById('player-info-wrapper');

    const bigPlayer = document.getElementById('big-player');
    const bigPlayerName = document.getElementById('big-player-station-name');
    const bigPlayerLogo = document.getElementById('big-player-logo');
    const bigPlayerTrack = document.getElementById('big-player-track');
    const bigPrevBtn = document.getElementById('big-prev-btn');
    const bigNextBtn = document.getElementById('big-next-btn');
    const bigPlayPauseBtn = document.getElementById('big-play-pause-btn');

    // НОВЕ: елементи гучності
    const volumeBtn = document.getElementById('volume-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const volumeContainer = document.querySelector('.volume-container');

    let radioStations = [];
    let currentStationIndex = null;
    let isPlaying = false;
    const audio = new Audio();
    let favourites = JSON.parse(localStorage.getItem('favourites')) || [];

    let trackUpdateTimer = null;
    let currentUpdateController = null;
    let currentUpdateToken = 0;

    // Показ/приховування повзунка гучності
    volumeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        volumeContainer.classList.toggle('show-slider');
    });

    // Зміна гучності
    volumeSlider.addEventListener('input', () => {
        audio.volume = volumeSlider.value / 100;
    });

    // Закриття повзунка при кліку поза ним
    document.addEventListener('click', (e) => {
        if (!volumeContainer.contains(e.target)) {
            volumeContainer.classList.remove('show-slider');
        }
    });

    function updateMediaSession(stationName, trackTitle, logo) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: trackTitle || stationName,
                artist: stationName,
                artwork: [{ src: logo, sizes: '192x192', type: 'image/png' }]
            });
        }
    }

    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('previoustrack', () => playPrevStation());
        navigator.mediaSession.setActionHandler('nexttrack', () => playNextStation());
        navigator.mediaSession.setActionHandler('play', () => { if (!isPlaying) togglePlayPause(); });
        navigator.mediaSession.setActionHandler('pause', () => { if (isPlaying) togglePlayPause(); });
    }

    fetch('radio-playlist.txt')
        .then(r => r.text())
        .then(data => {
            radioStations = data.trim().split('\n').map(line => {
                const [name, logo, stream, api] = line.split(',').map(s => s.trim());
                return { name, logo, stream, api };
            });
            displayRadioStations();
        });

    function displayRadioStations(showFavourites = false, filter = '') {
        radioListContainer.innerHTML = '';
        let list = showFavourites
            ? radioStations.filter((_, idx) => favourites.includes(idx))
            : radioStations;

        if (filter) {
            list = list.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()));
        }

        list.forEach((station, idx) => {
            const realIndex = showFavourites ? radioStations.indexOf(station) : idx;
            const item = document.createElement('div');
            item.classList.add('radio-item');
            item.innerHTML = `
                <img src="${station.logo}" alt="${station.name}" class="radio-logo">
                <div>
                    <strong>${station.name}</strong>
                    <span class="fav-btn" style="cursor:pointer; margin-left:5px;">
                        ${favourites.includes(realIndex) ? '★' : '☆'}
                    </span>
                </div>
            `;
            item.addEventListener('click', e => {
                if (e.target.classList.contains('fav-btn')) {
                    e.stopPropagation();
                    toggleFavourite(realIndex);
                } else {
                    playStation(realIndex);
                }
            });
            radioListContainer.appendChild(item);
        });
    }

    function toggleFavourite(index) {
        if (favourites.includes(index)) {
            favourites = favourites.filter(i => i !== index);
        } else {
            favourites.push(index);
        }
        localStorage.setItem('favourites', JSON.stringify(favourites));
        const favTabActive = tabFav.classList.contains('active');
        displayRadioStations(favTabActive, searchInput.value);
    }

    tabAll.addEventListener('click', () => {
        tabAll.classList.add('active');
        tabFav.classList.remove('active');
        displayRadioStations(false, searchInput.value);
    });

    tabFav.addEventListener('click', () => {
        tabFav.classList.add('active');
        tabAll.classList.remove('active');
        displayRadioStations(true, searchInput.value);
    });

    searchInput.addEventListener('input', () => {
        const favTabActive = tabFav.classList.contains('active');
        displayRadioStations(favTabActive, searchInput.value);
    });

    function playStation(index) {
        currentStationIndex = index;
        clearTimeout(trackUpdateTimer);
        if (currentUpdateController) { try { currentUpdateController.abort(); } catch {} }
        currentUpdateToken++;
        const station = radioStations[index];
        audio.src = station.stream;
        playerLogo.src = station.logo;
        playerName.textContent = station.name;
        playerTrack.textContent = 'Завантаження треку...';
        document.title = station.name;
        isPlaying = true;
        audio.play().catch(() => {});
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        player.classList.remove('hidden');

        updateMediaSession(station.name, '', station.logo);
        startTrackUpdates(station.api);
        updateBigPlayer();
    }

    function startTrackUpdates(apiUrl) {
        if (!apiUrl) {
            playerTrack.textContent = '—';
            bigPlayerTrack.textContent = 'Немає даних';
            return;
        }
        let lastUpdated = 0;
        const myToken = ++currentUpdateToken;
        const poll = async () => {
            if (myToken !== currentUpdateToken) return;
            currentUpdateController = new AbortController();
            try {
                const res = await fetch(`${apiUrl}?l=${lastUpdated}`, { signal: currentUpdateController.signal });
                if (!res.ok) throw new Error();
                const data = await res.json();
                if (myToken !== currentUpdateToken) return;
                if (data.updated && data.updated !== lastUpdated) {
                    lastUpdated = data.updated;
                    const title = data.title || 'Немає даних';
                    playerTrack.textContent = title;
                    bigPlayerTrack.textContent = title;
                    document.title = `${title} — ${radioStations[currentStationIndex].name}`;
                    updateMediaSession(title, radioStations[currentStationIndex].name, radioStations[currentStationIndex].logo);
                }
                trackUpdateTimer = setTimeout(poll, 1000);
            } catch {
                playerTrack.textContent = '—';
                bigPlayerTrack.textContent = 'Немає даних';
                trackUpdateTimer = setTimeout(poll, 2000);
            }
        };
        poll();
    }

    function togglePlayPause() {
        if (isPlaying) {
            audio.pause();
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            bigPlayPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            audio.play().catch(() => {});
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            bigPlayPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
        isPlaying = !isPlaying;
    }

    function playNextStation() {
        if (!radioStations.length) return;
        const nextIndex = currentStationIndex === null ? 0 : (currentStationIndex + 1) % radioStations.length;
        playStation(nextIndex);
    }

    function playPrevStation() {
        if (!radioStations.length) return;
        const prevIndex = currentStationIndex === null ? 0 : (currentStationIndex - 1 + radioStations.length) % radioStations.length;
        playStation(prevIndex);
    }

    function updateBigPlayer() {
        if (currentStationIndex === null) return;
        const station = radioStations[currentStationIndex];
        bigPlayerName.textContent = station.name;
        bigPlayerLogo.src = station.logo;
        bigPlayerTrack.textContent = playerTrack.textContent || 'Немає даних';
        bigPlayPauseBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    }

    // Відкривати великий плеєр при кліку на область з логотипом та назвою
    playerInfoWrapper.addEventListener('click', () => {
        if (!player.classList.contains('hidden')) {
            updateBigPlayer();
            bigPlayer.classList.add('show');
        }
    });

    // Кнопки керування у малому плеєрі
    prevBtn.addEventListener('click', playPrevStation);
    playPauseBtn.addEventListener('click', togglePlayPause);
    nextBtn.addEventListener('click', playNextStation);

    // Кнопки керування у великому плеєрі
    bigPrevBtn.addEventListener('click', playPrevStation);
    bigNextBtn.addEventListener('click', playNextStation);
    bigPlayPauseBtn.addEventListener('click', togglePlayPause);

    // Закриття великого плеєра при кліку на фон
    bigPlayer.addEventListener('click', (e) => {
        if (e.target === bigPlayer) {
            bigPlayer.classList.remove('show');
        }
    });

    // Перемикання теми ☀ / ☾
    function updateThemeElements(isDark) {
        document.body.classList.toggle('dark-theme', isDark);
        themeToggleBtn.textContent = isDark ? '☾' : '☀';
    }

    themeToggleBtn.addEventListener('click', () => {
        const isDark = !document.body.classList.contains('dark-theme');
        updateThemeElements(isDark);
        localStorage.setItem('isDarkTheme', isDark);
    });

    // Відновлення теми з LocalStorage
    const savedTheme = localStorage.getItem('isDarkTheme') === 'true';
    updateThemeElements(savedTheme);

    // Подія після завершення треку
    audio.addEventListener('ended', () => {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        bigPlayPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        isPlaying = false;
    });
});
