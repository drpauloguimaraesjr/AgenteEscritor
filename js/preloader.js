/**
 * Preloader — DNA Loading Screen
 * Vanilla JS version of the React Preloader from DiretorioSystemDesign.
 * Uses Lottie DNA animation + percentage counter.
 */

(function() {
    // Create preloader DOM
    const overlay = document.createElement('div');
    overlay.id = 'preloader';
    overlay.innerHTML = `
        <div class="preloader-content">
            <div class="preloader-lottie">
                <lottie-player
                    src="img/dna-loading.json"
                    background="transparent"
                    speed="2"
                    style="width:160px;height:160px;"
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

    // Inject styles
    const style = document.createElement('style');
    style.textContent = `
        #preloader {
            position: fixed;
            inset: 0;
            background: #0d0d11;
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
            filter: drop-shadow(0 0 30px hsla(45, 80%, 55%, 0.15));
        }
        .preloader-bar-track {
            width: 180px;
            height: 2px;
            background: hsla(45, 5%, 95%, 0.08);
            border-radius: 2px;
            overflow: hidden;
        }
        .preloader-bar-fill {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, hsl(45, 80%, 55%), hsl(45, 90%, 65%));
            border-radius: 2px;
            transition: width 0.05s linear;
        }
        .preloader-text {
            font-family: 'Inter', system-ui, sans-serif;
            font-size: 0.6rem;
            letter-spacing: 0.15em;
            color: hsla(45, 5%, 95%, 0.25);
            text-transform: uppercase;
        }
    `;
    document.head.appendChild(style);

    // Animate percentage 0→100
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
            // Fade content
            setTimeout(() => {
                content.classList.add('fade-out');
            }, 200);
            // Slide overlay up
            setTimeout(() => {
                overlay.classList.add('exit');
            }, 700);
            // Hide completely
            setTimeout(() => {
                overlay.classList.add('hidden');
            }, 1800);
        }
    }, 15);
})();
