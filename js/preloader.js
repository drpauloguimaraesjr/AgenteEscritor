/**
 * Preloader — DNA Loading Screen (Eva Effects Light Theme)
 * Uses the AnimatedLogo (Lottie dna-loading.json) — scaled up to crop margins.
 */

(function() {
    const overlay = document.createElement('div');
    overlay.id = 'preloader';
    overlay.innerHTML = `
        <div class="preloader-content">
            <div class="preloader-lottie">
                <lottie-player
                    src="img/dna-loading.json"
                    background="transparent"
                    speed="2"
                    style="width:340px;height:340px;"
                    loop autoplay>
                </lottie-player>
            </div>
            <div class="preloader-bar-track">
                <div class="preloader-bar-fill" id="preloaderBar"></div>
            </div>
            <div class="preloader-text">
                LOADING EXPERIENCE... <span id="preloaderPct">0</span>%
            </div>
        </div>
    `;
    document.body.prepend(overlay);

    const style = document.createElement('style');
    style.textContent = `
        #preloader {
            position: fixed;
            inset: 0;
            background: #F8F6F2;
            z-index: 20000;
            display: flex;
            justify-content: center;
            align-items: center;
            transition: transform 0.9s cubic-bezier(0.76, 0, 0.24, 1);
        }
        #preloader.exit {
            transform: translateY(-100%);
        }
        #preloader.hidden { display: none; }
        .preloader-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.5rem;
            transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .preloader-content.fade-out {
            opacity: 0;
            transform: translateY(-30px);
        }
        .preloader-lottie {
            width: 120px;
            height: 120px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .preloader-lottie lottie-player {
            transform: scale(2.8);
        }
        .preloader-bar-track {
            width: 120px;
            height: 1px;
            background: rgba(0, 0, 0, 0.08);
            overflow: hidden;
        }
        .preloader-bar-fill {
            height: 100%;
            width: 0%;
            background: #1a1a1a;
            transition: width 0.05s linear;
        }
        .preloader-text {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.5rem;
            letter-spacing: 0.2em;
            color: rgba(0, 0, 0, 0.18);
            text-transform: uppercase;
        }
    `;
    document.head.appendChild(style);

    let pct = 0;
    const pctEl = document.getElementById('preloaderPct');
    const barEl = document.getElementById('preloaderBar');
    const content = overlay.querySelector('.preloader-content');

    const interval = setInterval(() => {
        pct += 1;
        if (pct > 100) pct = 100;
        pctEl.textContent = pct;
        barEl.style.width = pct + '%';

        if (pct >= 100) {
            clearInterval(interval);
            setTimeout(() => { content.classList.add('fade-out'); }, 200);
            setTimeout(() => { overlay.classList.add('exit'); }, 700);
            setTimeout(() => { overlay.classList.add('hidden'); }, 1800);
        }
    }, 15);
})();
