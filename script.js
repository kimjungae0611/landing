/* ==========================================================
   script.js — PhysAI Lab 인터랙션 v2

   변경 내용:
   - 별을 3개 레이어로 분리 → 마우스 따라 다른 속도로 이동 (패럴랙스)
   - Canvas에 오로라 렌더링 (sin 곡선 + blur)
   - 유성 동적 생성 시스템 (12개 연속 스폰)
   - 행성 parallax는 그대로 유지
   ========================================================== */


/* ==========================================================
   Canvas 설정
   ========================================================== */
const canvas = document.getElementById('starCanvas');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    // 리사이즈 시 별 위치 재생성 (화면 밖으로 나가는 것 방지)
    initStars();
}

window.addEventListener('resize', resizeCanvas);


/* ==========================================================
   별 레이어 시스템
   --
   3개의 레이어로 분리 → 각각 다른 마우스 이동량을 적용해
   깊이감(패럴랙스)을 만듭니다.

   레이어 1 (far):   작고 희미, 마우스에 조금만 반응
   레이어 2 (mid):   중간 크기
   레이어 3 (close): 크고 밝음, 마우스에 많이 반응
   ========================================================== */

let starLayers = [];

function makeLayer(count, maxRadius, parallaxFactor) {
    return {
        parallax: parallaxFactor,
        stars: Array.from({ length: count }, () => ({
            x:     Math.random() * window.innerWidth,
            y:     Math.random() * window.innerHeight,
            r:     Math.random() * maxRadius + 0.2,
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.007 + 0.002,
        }))
    };
}

function initStars() {
    starLayers = [
        makeLayer(130, 0.9,  0.15),   // far   — 조금만 움직임
        makeLayer(80,  1.5,  0.35),   // mid
        makeLayer(40,  2.2,  0.65),   // close — 많이 움직임
    ];
}

initStars();


/* ==========================================================
   마우스 추적
   --
   targetMouse: 실제 마우스 위치 (-0.5 ~ +0.5 정규화)
   smoothMouse: lerp로 부드럽게 따라오는 값
   ========================================================== */

const targetMouse = { x: 0, y: 0 };
const smoothMouse = { x: 0, y: 0 };

document.addEventListener('mousemove', (e) => {
    targetMouse.x = e.clientX / window.innerWidth  - 0.5;
    targetMouse.y = e.clientY / window.innerHeight - 0.5;
});


/* ==========================================================
   오로라 (Aurora) 설정
   --
   각 band는 sin 곡선으로 그리는 굵은 선입니다.
   ctx.filter = 'blur()' 로 번지는 느낌을 줍니다.

   매개변수:
   - y:     화면 높이 대비 세로 위치 (0.0 ~ 1.0)
   - color: RGB 값 (투명도는 코드에서 조절)
   - w:     선 굵기 (px)
   - amp:   굴곡의 높이 (px)
   - freq:  굴곡의 빈도 (숫자가 크면 더 굽이침)
   - spd:   움직임 속도
   ========================================================== */

const AURORA_BANDS = [
    { y: 0.10, color: '124,58,237',  w: 160, amp: 55, freq: 0.0038, spd: 0.9,  phase: 0 },
    { y: 0.18, color: '6,182,212',   w: 110, amp: 70, freq: 0.0050, spd: 0.65, phase: 2.1 },
    { y: 0.13, color: '16,185,129',  w: 90,  amp: 45, freq: 0.0032, spd: 1.2,  phase: 4.5 },
    { y: 0.24, color: '139,92,246',  w: 100, amp: 60, freq: 0.0058, spd: 0.8,  phase: 1.3 },
    { y: 0.07, color: '59,130,246',  w: 75,  amp: 38, freq: 0.0042, spd: 1.05, phase: 3.7 },
];

function drawAurora(t) {
    // blur 필터 적용 — 오로라 특유의 번지는 느낌
    ctx.save();
    ctx.filter = 'blur(28px)';
    ctx.globalCompositeOperation = 'screen'; // 색이 겹치면 밝아지는 블렌딩

    AURORA_BANDS.forEach(band => {
        const baseY = canvas.height * band.y;

        ctx.beginPath();
        ctx.moveTo(-60, baseY);

        for (let x = -60; x <= canvas.width + 60; x += 5) {
            // sin 두 개를 합쳐서 불규칙한 파도 형태 만들기
            const y = baseY
                + Math.sin(x * band.freq + t * band.spd * 0.00028 + band.phase)         * band.amp
                + Math.sin(x * band.freq * 1.8 + t * band.spd * 0.00017 + band.phase)   * band.amp * 0.35;
            ctx.lineTo(x, y);
        }

        ctx.lineWidth   = band.w;
        ctx.strokeStyle = `rgba(${band.color}, 0.09)`;
        ctx.stroke();
    });

    ctx.restore(); // filter와 compositeOperation 초기화
}


/* ==========================================================
   별 그리기
   ========================================================== */

function drawStars(t) {
    starLayers.forEach(layer => {
        // 마우스 위치에 따른 오프셋 계산
        const ox = smoothMouse.x * layer.parallax * 80;
        const oy = smoothMouse.y * layer.parallax * 80;

        layer.stars.forEach(star => {
            // sin으로 반짝임 (0.15 ~ 0.95 범위)
            const alpha = 0.15 + Math.abs(Math.sin(t * star.speed + star.phase)) * 0.8;

            ctx.beginPath();
            ctx.arc(
                star.x + ox,   // 마우스 오프셋 더함
                star.y + oy,
                star.r,
                0, Math.PI * 2
            );
            ctx.fillStyle = `rgba(253, 230, 138, ${Math.min(1, alpha)})`;
            ctx.fill();
        });
    });
}


/* ==========================================================
   행성 패럴랙스
   ========================================================== */

const planetMain  = document.getElementById('planetMain');
const planetSmall = document.getElementById('planetSmall');
const planetTiny  = document.getElementById('planetTiny');

const planetPos = {
    main:  { x: 0, y: 0 },
    small: { x: 0, y: 0 },
    tiny:  { x: 0, y: 0 },
};

function updatePlanets() {
    const L = 0.042; // lerp 계수

    planetPos.main.x  += (targetMouse.x * 30  - planetPos.main.x)  * L;
    planetPos.main.y  += (targetMouse.y * 30  - planetPos.main.y)  * L;

    planetPos.small.x += (targetMouse.x * 60  - planetPos.small.x) * (L * 1.7);
    planetPos.small.y += (targetMouse.y * 60  - planetPos.small.y) * (L * 1.7);

    planetPos.tiny.x  += (targetMouse.x * 95  - planetPos.tiny.x)  * (L * 2.5);
    planetPos.tiny.y  += (targetMouse.y * 95  - planetPos.tiny.y)  * (L * 2.5);

    planetMain.style.transform  = `translateY(calc(-50% + ${planetPos.main.y}px)) translateX(${planetPos.main.x}px)`;
    planetSmall.style.transform = `translate(${planetPos.small.x}px, ${planetPos.small.y}px)`;
    planetTiny.style.transform  = `translate(${planetPos.tiny.x}px,  ${planetPos.tiny.y}px)`;
}


/* ==========================================================
   메인 애니메이션 루프
   --
   requestAnimationFrame(animate)이 호출되면
   모니터 주사율(보통 60fps)에 맞춰 매 프레임 animate()가 실행됩니다.
   ========================================================== */

function animate(timestamp) {
    // 매 프레임 캔버스 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 마우스 위치 부드럽게 보간
    smoothMouse.x += (targetMouse.x - smoothMouse.x) * 0.06;
    smoothMouse.y += (targetMouse.y - smoothMouse.y) * 0.06;

    // 순서대로 그리기 (뒤 → 앞)
    drawAurora(timestamp);    // 1. 오로라 (맨 뒤)
    drawStars(timestamp);     // 2. 별들
    updatePlanets();          // 3. 행성 DOM 이동

    requestAnimationFrame(animate);
}

// 초기 캔버스 크기 설정 후 루프 시작
canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;
requestAnimationFrame(animate);


/* ==========================================================
   동적 유성 생성 시스템
   --
   유성을 DOM 요소로 생성 → CSS animation으로 낙하 → 끝나면 삭제
   setInterval로 계속 새로 생성합니다.

   이렇게 JS로 생성하면 개수, 위치, 속도를 랜덤하게 제어할 수 있습니다.
   ========================================================== */

function spawnMeteor() {
    const el = document.createElement('div');

    const length   = Math.random() * 110 + 50;      // 50~160px 길이
    const duration = Math.random() * 1.8 + 0.9;     // 0.9~2.7초
    const startX   = Math.random() * (window.innerWidth + 500) - 100;
    const startY   = Math.random() * -150 - 20;
    const opacity  = Math.random() * 0.55 + 0.4;
    const thickness= Math.random() * 1.8 + 0.4;
    // 약간의 각도 변화 (-40 ~ -50도)
    const angle    = -(Math.random() * 10 + 40);

    el.style.cssText = `
        position: fixed;
        top:    ${startY}px;
        left:   ${startX}px;
        width:  ${thickness}px;
        height: ${length}px;
        background: linear-gradient(
            to bottom,
            rgba(255, 255, 255, ${opacity}),
            rgba(180, 210, 255, 0.4),
            transparent
        );
        border-radius: 3px;
        transform: rotate(${angle}deg);
        transform-origin: top center;
        pointer-events: none;
        z-index: 2;
        animation: meteorFall ${duration}s linear forwards;
    `;

    document.body.appendChild(el);

    // 애니메이션이 끝나면 DOM에서 제거 (메모리 누수 방지)
    setTimeout(() => el.remove(), duration * 1000 + 200);
}

// 페이지 열리자마자 8개 즉시 생성 (초기 화면이 비어보이지 않게)
for (let i = 0; i < 8; i++) {
    setTimeout(spawnMeteor, i * 300);
}

// 이후 0.6초마다 새 유성 생성 (약 분당 100개)
setInterval(spawnMeteor, 600);


/* ==========================================================
   스크롤 진입 애니메이션 (IntersectionObserver)
   ========================================================== */

const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            fadeObserver.unobserve(entry.target); // 한 번만 실행
        }
    });
}, {
    threshold:   0.15,
    rootMargin: '0px 0px -40px 0px'
});

document.querySelectorAll('.fade-up').forEach(el => fadeObserver.observe(el));


/* ==========================================================
   네비게이션 스크롤 효과
   ========================================================== */

const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    navbar.style.background = window.scrollY > 50
        ? 'rgba(3, 0, 20, 0.92)'
        : 'rgba(3, 0, 20, 0.60)';
});
