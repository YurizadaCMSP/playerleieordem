/* ============================================
   SOS First Stream - Lei e Ordem: SVU
   Script Principal
   ============================================ */

// ============================================
// CONFIGURAÇÕES
// ============================================
const CONFIG = {
    baseUrl: 'https://www.embedplay.one/serie/tt0203259',
    totalSeasons: 26,
    episodesPerSeason: {
        1: 22, 2: 21, 3: 23, 4: 25, 5: 25, 6: 23, 7: 22, 8: 22,
        9: 19, 10: 22, 11: 24, 12: 24, 13: 23, 14: 24, 15: 24, 16: 23,
        17: 23, 18: 21, 19: 23, 20: 24, 21: 20, 22: 16, 23: 22, 24: 22,
        25: 13, 26: 22
    }
};

// ============================================
// ESTADO DA APLICAÇÃO
// ============================================
const state = {
    currentSeason: 1,
    currentEpisode: 1,
    isPlaying: false,
    isFullscreen: false,
    progress: 0,
    blockedAttempts: 0
};

// ============================================
// SISTEMA ANTI-REDIRECIONAMENTO / BLOQUEIO DE ANÚNCIOS
// ============================================
class AntiRedirectSystem {
    constructor() {
        this.overlay = document.getElementById('overlay');
        this.overlayClose = document.getElementById('overlay-close');
        this.init();
    }

    init() {
        // Bloquear redirecionamentos do iframe
        this.blockIframeRedirects();

        // Bloquear popups e novas janelas
        this.blockPopups();

        // Bloquear cliques em links externos dentro do iframe
        this.blockExternalLinks();

        // Monitorar mudanças de URL
        this.monitorUrlChanges();

        // Bloquear beforeunload suspeito
        this.blockBeforeUnload();

        // Evento para fechar overlay
        this.overlayClose.addEventListener('click', () => this.hideOverlay());

        // Bloquear teclas de atalho de redirecionamento
        this.blockShortcutKeys();

        console.log('[Anti-Redirect] Sistema de proteção ativado');
    }

    showOverlay(message) {
        this.overlay.classList.add('active');
        state.blockedAttempts++;

        // Tocar som de alerta (opcional, usando Web Audio API)
        this.playAlertSound();

        // Log
        console.warn('[Anti-Redirect] Tentativa #' + state.blockedAttempts + ' bloqueada!');
    }

    hideOverlay() {
        this.overlay.classList.remove('active');
    }

    playAlertSound() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.1;

            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.15);
        } catch (e) {
            // Silenciosamente falha se audio não for suportado
        }
    }

    blockIframeRedirects() {
        const iframe = document.getElementById('video-iframe');
        if (!iframe) return;

        // Monitorar mudanças no iframe
        setInterval(() => {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                if (iframeDoc) {
                    // Bloquear todos os links que tentam sair
                    const links = iframeDoc.querySelectorAll('a');
                    links.forEach(link => {
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            this.showOverlay();
                            return false;
                        });
                        link.setAttribute('target', '_self');
                        link.style.pointerEvents = 'none';
                    });

                    // Bloquear formulários
                    const forms = iframeDoc.querySelectorAll('form');
                    forms.forEach(form => {
                        form.addEventListener('submit', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            this.showOverlay();
                            return false;
                        });
                    });

                    // Bloquear clicks em elementos clicáveis
                    const clickableElements = iframeDoc.querySelectorAll('[onclick], [data-href], [data-url]');
                    clickableElements.forEach(el => {
                        el.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            this.showOverlay();
                            return false;
                        });
                    });
                }
            } catch (e) {
                // Cross-origin, não conseguimos acessar - isso é esperado
            }
        }, 500);
    }

    blockPopups() {
        // Sobrescrever window.open
        const originalOpen = window.open;
        window.open = function(...args) {
            console.warn('[Anti-Redirect] Tentativa de popup bloqueada:', args);
            this.showOverlay();
            return null;
        }.bind(this);

        // Bloquear window.location changes
        let lastHref = window.location.href;
        Object.defineProperty(window, 'location', {
            configurable: false,
            enumerable: true,
            get: function() { 
                return { 
                    href: lastHref,
                    toString: function() { return lastHref; },
                    assign: function() { this.showOverlay(); }.bind(this),
                    replace: function() { this.showOverlay(); }.bind(this)
                };
            }.bind(this),
            set: function(value) {
                if (value !== lastHref) {
                    console.warn('[Anti-Redirect] Tentativa de mudança de URL bloqueada');
                    this.showOverlay();
                }
            }.bind(this)
        });
    }

    blockExternalLinks() {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('a');
            if (target) {
                const href = target.getAttribute('href');
                if (href && (href.startsWith('http') || href.startsWith('//'))) {
                    // Permitir apenas links internos do nosso site
                    if (!href.includes(window.location.hostname) && !href.includes('embedplay')) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.showOverlay();
                        return false;
                    }
                }
            }
        }, true);
    }

    monitorUrlChanges() {
        // Bloquear history.pushState e history.replaceState
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function(...args) {
            console.warn('[Anti-Redirect] pushState bloqueado');
            return null;
        };

        history.replaceState = function(...args) {
            // Permitir replaceState apenas para nosso próprio uso
            if (args[2] && args[2].includes('temporada')) {
                return originalReplaceState.apply(history, args);
            }
            console.warn('[Anti-Redirect] replaceState bloqueado');
            return null;
        };

        // Monitorar hash changes
        window.addEventListener('hashchange', (e) => {
            if (!e.newURL.includes('#temporada')) {
                e.preventDefault();
                this.showOverlay();
                window.location.hash = e.oldURL.split('#')[1] || '';
            }
        });
    }

    blockBeforeUnload() {
        // Bloquear páginas que tentam impedir a saída (exceto nosso próprio aviso)
        window.addEventListener('beforeunload', (e) => {
            // Se o usuário está tentando sair propositalmente, permitir
            // Se é um redirecionamento forçado, bloquear
            if (e.target.activeElement && e.target.activeElement.tagName !== 'A') {
                e.preventDefault();
                e.returnValue = '';
                this.showOverlay();
                return '';
            }
        });
    }

    blockShortcutKeys() {
        document.addEventListener('keydown', (e) => {
            // Bloquear Ctrl+Click em links
            if (e.ctrlKey && e.target.tagName === 'A') {
                e.preventDefault();
                this.showOverlay();
                return false;
            }

            // Bloquear Alt+Left/Right (navegação forçada)
            if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                e.preventDefault();
                return false;
            }
        });
    }
}

// ============================================
// PLAYER
// ============================================
class Player {
    constructor() {
        this.iframe = document.getElementById('video-iframe');
        this.wrapper = document.getElementById('player-wrapper');
        this.overlay = document.getElementById('player-overlay');
        this.loading = document.getElementById('player-loading');
        this.title = document.getElementById('player-title');
        this.playBig = document.getElementById('play-big');
        this.barPlay = document.getElementById('bar-play');
        this.progressBar = document.getElementById('progress-bar');
        this.progressFill = document.getElementById('progress-fill');
        this.progressThumb = document.getElementById('progress-thumb');
        this.timeDisplay = document.getElementById('time-display');
        this.btnFullscreen = document.getElementById('btn-fullscreen');
        this.btnPip = document.getElementById('btn-pip');

        this.init();
    }

    init() {
        // Eventos do player
        this.playBig.addEventListener('click', () => this.playEpisode());
        this.overlay.addEventListener('click', () => this.playEpisode());
        this.barPlay.addEventListener('click', () => this.togglePlay());
        this.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
        this.btnPip.addEventListener('click', () => this.togglePip());

        // Progress bar
        this.progressBar.addEventListener('click', (e) => this.seek(e));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Scroll header
        window.addEventListener('scroll', () => this.handleScroll());
    }

    loadEpisode(season, episode) {
        state.currentSeason = season;
        state.currentEpisode = episode;

        const url = CONFIG.baseUrl + '/' + season + '/' + episode;

        // Mostrar loading
        this.loading.classList.add('active');
        this.overlay.classList.remove('visible');

        // Atualizar título
        this.title.textContent = 'Temporada ' + season + ' - Episódio ' + episode;

        // Carregar iframe
        this.iframe.src = url;

        // Simular progresso de carregamento
        this.simulateLoading();

        // Atualizar URL hash
        history.replaceState(null, null, '#temporada=' + season + '&episodio=' + episode);

        // Atualizar cards ativos
        app.updateActiveCard(season, episode);

        // Scroll para o player
        this.wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });

        console.log('[Player] Carregando: ' + url);
    }

    simulateLoading() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                this.loading.classList.remove('active');
                this.overlay.classList.add('visible');
                state.isPlaying = true;
                this.barPlay.textContent = '⏸';
            }
            this.progressFill.style.width = progress + '%';
            this.progressThumb.style.left = progress + '%';
        }, 200);
    }

    playEpisode() {
        this.overlay.classList.remove('visible');
        state.isPlaying = true;
        this.barPlay.textContent = '⏸';

        // Tentar focar no iframe para capturar teclas de mídia
        try {
            this.iframe.focus();
        } catch (e) {}
    }

    togglePlay() {
        if (state.isPlaying) {
            state.isPlaying = false;
            this.barPlay.textContent = '▶';
            this.overlay.classList.add('visible');
        } else {
            this.playEpisode();
        }
    }

    seek(e) {
        const rect = this.progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.progressFill.style.width = (percent * 100) + '%';
        this.progressThumb.style.left = (percent * 100) + '%';

        // Atualizar tempo (simulado)
        const totalSeconds = 45 * 60; // 45 minutos
        const currentSeconds = Math.floor(percent * totalSeconds);
        this.timeDisplay.textContent = this.formatTime(currentSeconds) + ' / ' + this.formatTime(totalSeconds);
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            if (this.wrapper.requestFullscreen) this.wrapper.requestFullscreen();
            else if (this.wrapper.webkitRequestFullscreen) this.wrapper.webkitRequestFullscreen();
            state.isFullscreen = true;
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            state.isFullscreen = false;
        }
    }

    async togglePip() {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                if (this.wrapper.requestPictureInPicture) {
                    await this.wrapper.requestPictureInPicture();
                }
            }
        } catch (e) {
            console.log('Picture in Picture não suportado');
        }
    }

    handleKeyboard(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

        switch(e.key) {
            case ' ':
            case 'k':
                e.preventDefault();
                this.togglePlay();
                break;
            case 'f':
                e.preventDefault();
                this.toggleFullscreen();
                break;
            case 'ArrowRight':
                // Avançar (simulado)
                break;
            case 'ArrowLeft':
                // Voltar (simulado)
                break;
            case 'm':
                // Mute (simulado)
                break;
        }
    }

    handleScroll() {
        const header = document.querySelector('.header');
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
    }
}

// ============================================
// EPISODES MANAGER
// ============================================
class EpisodesManager {
    constructor() {
        this.grid = document.getElementById('episodes-grid');
        this.seasonSelect = document.getElementById('season-select');
        this.searchInput = document.getElementById('search-input');

        this.init();
    }

    init() {
        // Carregar temporada inicial
        this.loadSeason(1);

        // Evento de mudança de temporada
        this.seasonSelect.addEventListener('change', (e) => {
            this.loadSeason(parseInt(e.target.value));
        });

        // Evento de busca
        this.searchInput.addEventListener('input', (e) => {
            this.filterEpisodes(e.target.value);
        });

        // Verificar URL hash
        this.checkUrlHash();
    }

    loadSeason(season) {
        state.currentSeason = season;
        this.seasonSelect.value = season;

        const episodesCount = CONFIG.episodesPerSeason[season] || 22;
        this.grid.innerHTML = '';

        for (let i = 1; i <= episodesCount; i++) {
            const card = this.createEpisodeCard(season, i);
            this.grid.appendChild(card);
        }

        // Animação de entrada
        this.animateGrid();
    }

    createEpisodeCard(season, episode) {
        const card = document.createElement('div');
        card.className = 'episode-card';
        card.dataset.season = season;
        card.dataset.episode = episode;

        // Gerar título fictício baseado no episódio
        const titles = [
            'Presa Fácil', 'Testemunha Ocular', 'Justiça Negada', 'Silêncio Doloroso',
            'Verdade Oculta', 'Trauma Infantil', 'Cicatrizes', 'Sombra do Passado',
            'Falsa Alegação', 'Proteção Frágil', 'Vozes Silenciadas', 'Pacto de Sangue',
            'Inocência Perdida', 'Máscaras', 'Segredos de Família', 'Linha Tênue',
            'Justiça por Vingança', 'Rastros de Dor', 'Confronto Final', 'Redenção'
        ];

        const title = titles[(episode - 1) % titles.length];
        const duration = '45 min';

        card.innerHTML = `
            <div class="episode-thumb">
                <span class="episode-number">EP ${episode}</span>
                <div class="episode-play">
                    <div class="episode-play-icon">▶</div>
                </div>
                <span class="episode-duration">${duration}</span>
            </div>
            <div class="episode-info">
                <h3>${title}</h3>
                <p>Um novo caso desafia a equipe da Unidade de Vítimas Especiais enquanto eles investigam um crime chocante na cidade de Nova York.</p>
                <div class="episode-meta">
                    <span>T${season} &bull; E${episode}</span>
                    <span>1999</span>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            app.player.loadEpisode(season, episode);
        });

        return card;
    }

    animateGrid() {
        const cards = this.grid.querySelectorAll('.episode-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.transition = 'all 0.4s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }

    filterEpisodes(query) {
        const cards = this.grid.querySelectorAll('.episode-card');
        const lowerQuery = query.toLowerCase();

        cards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const epNum = card.dataset.episode;

            if (title.includes(lowerQuery) || epNum.includes(lowerQuery)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    }

    checkUrlHash() {
        const hash = window.location.hash;
        if (hash.includes('temporada=') && hash.includes('episodio=')) {
            const seasonMatch = hash.match(/temporada=(\d+)/);
            const episodeMatch = hash.match(/episodio=(\d+)/);
            const season = seasonMatch ? parseInt(seasonMatch[1]) : 1;
            const episode = episodeMatch ? parseInt(episodeMatch[1]) : 1;

            this.seasonSelect.value = season;
            this.loadSeason(season);

            setTimeout(() => {
                app.player.loadEpisode(season, episode);
            }, 500);
        }
    }

    updateActiveCard(season, episode) {
        const cards = this.grid.querySelectorAll('.episode-card');
        cards.forEach(card => {
            card.classList.remove('active');
            if (parseInt(card.dataset.season) === season && 
                parseInt(card.dataset.episode) === episode) {
                card.classList.add('active');
            }
        });
    }
}

// ============================================
// APP PRINCIPAL
// ============================================
class App {
    constructor() {
        this.antiRedirect = new AntiRedirectSystem();
        this.player = new Player();
        this.episodes = new EpisodesManager();

        this.initHeroButton();
    }

    initHeroButton() {
        const btnHero = document.getElementById('btn-play-hero');
        if (btnHero) {
            btnHero.addEventListener('click', () => {
                // Carregar último episódio disponível (simulado como T1E1)
                this.player.loadEpisode(1, 1);
            });
        }
    }

    updateActiveCard(season, episode) {
        this.episodes.updateActiveCard(season, episode);
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new App();

    // Mensagem no console
    console.log('%c🚑 SOS First Stream', 'color: #e50914; font-size: 24px; font-weight: bold;');
    console.log('%cLei e Ordem: Unidade de Vítimas Especiais', 'color: #b3b3b3; font-size: 14px;');
    console.log('%cSistema anti-redirecionamento ativo ✅', 'color: #46d369; font-size: 12px;');
});
