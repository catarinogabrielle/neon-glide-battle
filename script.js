const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const aliveEl = document.getElementById('alive-txt');
const scoreEl = document.getElementById('score-txt');
const startScreen = document.getElementById('start-screen');
const goScreen = document.getElementById('game-over-screen');

let frames = 0;
let isRunning = false;
let score = 0;

const GRAVITY = 0.25;
const JUMP = 4.0;
const PIPE_SPEED = 3.0;
const PIPE_GAP = 160;

const neonColors = [
    { hex: '#00ffff' },
    { hex: '#ff00ff' },
    { hex: '#00ff00' },
    { hex: '#ffff00' },
    { hex: '#ff3300' }
];
let selectedColor = neonColors[0].hex;

const colorContainer = document.getElementById('color-options');
neonColors.forEach((c, i) => {
    let btn = document.createElement('div');
    btn.className = `c-btn ${i === 0 ? 'selected' : ''}`;
    btn.style.backgroundColor = c.hex;
    btn.style.color = c.hex;
    btn.onclick = () => {
        document.querySelectorAll('.c-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedColor = c.hex;
    };
    colorContainer.appendChild(btn);
});

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();


class Ball {
    constructor(isPlayer, name, color) {
        this.isPlayer = isPlayer;
        this.name = name;
        this.color = color;
        this.x = isPlayer ? 100 : 50 + Math.random() * 100;
        this.y = canvas.height / 2 + (Math.random() * 200 - 100);
        this.radius = 15;
        this.velocity = 0;
        this.dead = false;

        this.stupidity = Math.random() * 0.05;
    }

    update(pipes) {
        if (this.dead) return;

        this.velocity += GRAVITY;
        this.y += this.velocity;

        if (this.y + this.radius > canvas.height || this.y - this.radius < 0) this.die();

        if (!this.isPlayer) this.ai(pipes);
    }

    draw() {
        if (this.dead) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.beginPath();
        ctx.arc(-5, -5, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        if (this.isPlayer) {
            ctx.fillStyle = "#fff";
            ctx.font = "bold 14px Orbitron";
            ctx.textAlign = "center";
            ctx.shadowBlur = 4;
            ctx.shadowColor = "#000";
            ctx.fillText(this.name, this.x, this.y - 25);
            ctx.shadowBlur = 0;
        }
    }

    flap() {
        this.velocity = -JUMP;
    }

    die() {
        this.dead = true;
        if (this.isPlayer) endGame(false);
    }

    ai(pipes) {
        let next = pipes.find(p => p.x + p.w > this.x - 50);
        if (next) {
            let target = next.y + next.gap / 2 + (Math.random() - 0.5) * 80;
            if (this.y > target + 15 && Math.random() > this.stupidity) this.flap();
        } else if (this.y > canvas.height / 2) {
            this.flap();
        }
    }
}

const World = {
    gridOffset: 0,
    draw: function () {
        let grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, "#050510");
        grad.addColorStop(1, "#001a33");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        this.gridOffset = (this.gridOffset + 1) % 50;
        ctx.strokeStyle = "rgba(0, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < canvas.width; i += 50) {
            ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height);
        }
        for (let i = 0; i < canvas.height; i += 50) {
            let y = (i + this.gridOffset) % canvas.height;
            ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();
    }
};

let balls = [];
let pipes = [];

function init() {
    balls = []; pipes = []; frames = 0; score = 0;
    scoreEl.innerText = "0";

    let name = document.getElementById('player-name').value || "Player";
    balls.push(new Ball(true, name, selectedColor));

    for (let i = 0; i < 49; i++) {
        let rc = neonColors[Math.floor(Math.random() * neonColors.length)].hex;
        balls.push(new Ball(false, "Bot", rc));
    }
}

function updatePipes() {
    if (frames % 110 === 0) {
        let y = Math.random() * (canvas.height - 300) + 100;
        pipes.push({ x: canvas.width, y: y, w: 60, gap: PIPE_GAP, passed: false });
    }

    for (let i = 0; i < pipes.length; i++) {
        let p = pipes[i];
        p.x -= PIPE_SPEED;

        ctx.shadowBlur = 15;
        ctx.shadowColor = "#00ffff";
        ctx.fillStyle = "rgba(0, 255, 255, 0.2)";
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 2;

        ctx.fillRect(p.x, 0, p.w, p.y);
        ctx.strokeRect(p.x, 0, p.w, p.y);

        let by = p.y + p.gap;
        ctx.fillRect(p.x, by, p.w, canvas.height - by);
        ctx.strokeRect(p.x, by, p.w, canvas.height - by);

        ctx.shadowBlur = 0;

        let player = balls[0];
        if (!player.dead) {
            if (player.x + 10 > p.x && player.x - 10 < p.x + p.w) {
                if (player.y - 10 < p.y || player.y + 10 > by) player.die();
            }
        }

        if (p.x + p.w < player.x && !p.passed && !player.dead) {
            score++; scoreEl.innerText = score; p.passed = true;
        }

        if (p.x + p.w < -100) { pipes.shift(); i--; }
    }
}

function loop() {
    if (!isRunning) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    World.draw();
    updatePipes();

    let alive = 0;
    balls.forEach(b => {
        if (!b.isPlayer) {
            b.update(pipes); b.draw();
            if (!b.dead) alive++;
        }
    });
    balls[0].update(pipes);
    if (!balls[0].dead) { balls[0].draw(); alive++; }

    aliveEl.innerText = alive;

    if (alive === 1 && !balls[0].dead && pipes.length > 5) endGame(true);

    frames++;
    requestAnimationFrame(loop);
}

function startGame() {
    init();
    startScreen.classList.add('hidden');
    goScreen.classList.add('hidden');
    isRunning = true;
    loop();
}

function resetGame() {
    startScreen.classList.remove('hidden');
    goScreen.classList.add('hidden');
}

function endGame(win) {
    isRunning = false;
    let title = document.getElementById('go-title');
    let msg = document.getElementById('go-msg');

    if (win) {
        title.innerText = "VITÓRIA!";
        title.style.color = "#00ff00";
        msg.innerText = "Último sobrevivente!";
    } else {
        title.innerText = "BATIDO!";
        title.style.color = "#ff3333";
        msg.innerText = `Score Final: ${score}`;
    }
    goScreen.classList.remove('hidden');
}

const action = (e) => {
    if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
        if (e.type === 'touchstart') e.preventDefault();
        if (isRunning && !balls[0].dead) balls[0].flap();
    }
};

window.addEventListener('mousedown', action);
window.addEventListener('keydown', (e) => { if (e.code === 'Space') action(e); });
window.addEventListener('touchstart', action, { passive: false });