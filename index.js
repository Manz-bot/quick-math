// ========== Sound Manager ==========
const SoundManager = {
    audioCtx: null,
    isMuted: false,

    init() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    },

    playTone(freq, type, duration, volume = 0.1) {
        if (this.isMuted || !this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.frequency.value = freq;
        osc.type = type;
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        gain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, this.audioCtx.currentTime + duration);

        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
    },

    click() { this.playTone(800, 'sine', 0.1, 0.05); },
    success() {
        this.playTone(523.25, 'sine', 0.1, 0.1); // C5
        setTimeout(() => this.playTone(659.25, 'sine', 0.2, 0.1), 100); // E5
    },
    error() {
        this.playTone(150, 'sawtooth', 0.3, 0.1);
    },
    levelUp() {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major
        notes.forEach((f, i) => setTimeout(() => this.playTone(f, 'square', 0.3, 0.05), i * 100));
    }
};

// ========== Persistence & Levels ==========
const Persistence = {
    save() {
        const data = {
            xp: GameState.xp,
            level: GameState.level,
            highScores: GameState.highScores,
            sessionHistory: GameState.sessionHistory,
            bestStreak: GameState.bestStreak || 0,
            powerups: GameState.powerups,
            selectedChapters: GameState.selectedChapters
        };
        localStorage.setItem('matematica_rapida_save', JSON.stringify(data));
    },
    load() {
        const saved = localStorage.getItem('matematica_rapida_save');
        if (saved) {
            const data = JSON.parse(saved);
            GameState.xp = data.xp || 0;
            GameState.level = data.level || 1;
            GameState.highScores = data.highScores || [];
            GameState.sessionHistory = data.sessionHistory || [];
            GameState.bestStreak = data.bestStreak || 0;
            GameState.selectedChapters = data.selectedChapters || [1, 2, 3, 4, 5, 6, 7];
            if (data.powerups) {
                GameState.powerups = data.powerups;
            }
            updateLevelUI();
            updateExtremeModeLock();
        }
    }
};

// Update extreme mode button based on level
function updateExtremeModeLock() {
    const extremeBtn = document.getElementById('extreme-btn');
    const lockIndicator = document.getElementById('extreme-lock');
    if (!extremeBtn || !lockIndicator) return;

    const isUnlocked = GameState.level >= 5;
    extremeBtn.classList.toggle('locked', !isUnlocked);
    lockIndicator.classList.toggle('unlocked', isUnlocked);
}

function updateLevelUI() {
    const nextLevelXp = GameState.level * 500;
    document.getElementById('user-level').textContent = GameState.level;
    document.getElementById('user-xp-bar').style.width = `${(GameState.xp / nextLevelXp) * 100}%`;
    document.getElementById('user-xp').textContent = GameState.xp;
    document.getElementById('next-level-xp').textContent = nextLevelXp;
}

function checkLevelUp() {
    const nextLevelXp = GameState.level * 500;
    if (GameState.xp >= nextLevelXp) {
        GameState.xp -= nextLevelXp;
        GameState.level++;
        Persistence.save();
        updateLevelUI();
        SoundManager.levelUp();

        // Award power-ups on level up
        if (typeof PowerUpManager !== 'undefined') {
            PowerUpManager.awardLevelUp();
        }

        // Update extreme mode lock (may unlock at level 5)
        updateExtremeModeLock();

        // Show notification
        const notif = document.getElementById('notification');
        notif.classList.add('show');
        setTimeout(() => notif.classList.remove('show'), 3000);
    }
}

// ========== Game State ==========
const GameState = {
    xp: 0,
    level: 1,
    highScores: [],
    sessionHistory: [],

    difficulty: 'medium',
    mode: 'write',
    lives: 3, // New lives system

    difficultySettings: {
        easy: { time: 60, multiplier: 0.5 },
        medium: { time: 30, multiplier: 1 },
        hard: { time: 18, multiplier: 1.5 },
        extreme: { time: 18, multiplier: 2.5 } // Extreme: 15s avg but harder questions
    },

    chapters: [
        { id: 1, name: 'Resta', icon: '➖', exerciseCount: 3 },
        { id: 2, name: 'Mult. *ab', icon: '✖️', exerciseCount: 5 },
        { id: 3, name: 'Mult. *abc', icon: '✖️', exerciseCount: 5 },
        { id: 4, name: 'Potenciación', icon: '²', exerciseCount: 5 },
        { id: 5, name: 'Raíz', icon: '√', exerciseCount: 4 },
        { id: 6, name: 'Porcentaje', icon: '%', exerciseCount: 4 },
        { id: 7, name: 'División', icon: '÷', exerciseCount: 3 },
        { id: 8, name: 'Trigonometría', icon: '📐', exerciseCount: 5 },
        { id: 9, name: 'Ecuaciones', icon: 'x²', exerciseCount: 2 },
        { id: 10, name: 'Triángulos', icon: '△', exerciseCount: 3 },
        { id: 11, name: 'Fracciones', icon: '½', exerciseCount: 5 },
        { id: 12, name: 'Áreas', icon: '⬛', exerciseCount: 4 },
        { id: 13, name: 'Op. Combinadas', icon: '🔢', exerciseCount: 4 },
        { id: 14, name: 'Estimación', icon: '≈', exerciseCount: 4 },
        { id: 15, name: 'Fracción→Decimal', icon: '🔄', exerciseCount: 4 },
        { id: 16, name: 'Decimal→Fracción', icon: '↩️', exerciseCount: 4 },
        { id: 17, name: 'MCM y MCD', icon: '🔗', exerciseCount: 4 },
        { id: 18, name: 'Potencias de 10', icon: '10ⁿ', exerciseCount: 4 },
        { id: 19, name: 'Logaritmos', icon: 'log', exerciseCount: 4 },
        { id: 20, name: 'Regla de Tres', icon: '⚖️', exerciseCount: 4 }
    ],

    // Selected chapters for gameplay (default: first 7)
    selectedChapters: localStorage.getItem('matematica_rapida_save') ? JSON.parse(localStorage.getItem('matematica_rapida_save')).selectedChapters : [1, 2, 3, 4, 5, 6, 7],

    currentChapter: 0,
    currentExercise: 0,
    chapterExercises: [],
    allResults: [],
    chapterResults: [],
    totalCorrect: 0,
    totalExercises: 0,

    timeRemaining: 0,
    timerInterval: null,
    questionStartTime: null,
    totalStartTime: null,
    selectedChoice: null,

    // Power-ups and streak
    streak: 0,
    bestStreak: 0,
    currentMargin: null,
    powerups: {
        x2: 0,
        shield: 0,
        freeze: 0,
        '5050': 0,
        retry: 0
    },
    activePowerup: null,
    retryAvailable: false
};

// ========== Utility Functions ==========
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ========== Screen Management ==========
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// ========== Exercise Generators ==========
function generateExercise(chapterId) {
    const mult = GameState.difficultySettings[GameState.difficulty].multiplier;
    const isHard = GameState.difficulty === 'hard' || GameState.difficulty === 'extreme';
    let question, answer, alternatives;

    switch (chapterId) {
        case 1: // Resta
            const a1 = random(Math.floor(100 * mult), Math.floor(999 * mult));
            const b1 = random(Math.floor(100 * mult), Math.floor(a1));
            answer = a1 - b1;
            question = `${a1} − ${b1}`;
            alternatives = generateSimilarNumbers(answer, 4);
            break;

        case 2: // Multiplicación *ab (xy * ab or xyz * ab)
            const b2 = random(13, 99);
            // 50% chance of 2-digit, 50% chance of 3-digit
            const a2 = random(0, 1) === 0 ? random(13, 99) : random(101, 999);
            answer = a2 * b2;
            question = `${a2} × ${b2}`;
            alternatives = generateSimilarNumbers(answer, 4);
            break;

        case 3: // Multiplicación *abc (xyz * abc)
            const a3 = random(101, 999);
            const b3 = random(101, 999);
            answer = a3 * b3;
            question = `${a3} × ${b3}`;
            alternatives = generateSimilarNumbers(answer, 4);
            break;

        case 4: // Potenciación
            const a4 = random(Math.floor(10 * mult), Math.floor(30 * mult));
            answer = a4 * a4;
            question = `${a4}²`;
            alternatives = generateSimilarNumbers(answer, 4);
            break;

        case 5: // Raíz
            const r5 = random(Math.floor(10 * mult), Math.floor(30 * mult));
            answer = r5;
            question = `√${r5 * r5}`;
            alternatives = generateSimilarNumbers(answer, 4);
            break;

        case 6: // Porcentaje
            let perc, val;
            if (isHard) {
                perc = [5, 12, 15, 8, 35, 45, 95][random(0, 6)];
                val = random(100, 900);
            } else {
                perc = [10, 20, 25, 50, 75][random(0, 4)];
                val = random(Math.floor(100 * mult), Math.floor(500 * mult));
            }
            answer = (perc / 100) * val;
            if (!Number.isInteger(answer)) answer = parseFloat(answer.toFixed(2));
            question = `${perc}% de ${val}`;
            alternatives = generateSimilarNumbers(answer, 4);
            break;

        case 7: // División
            let divisor, quotient;
            if (isHard) {
                divisor = random(13, 30);
                quotient = random(50, 300);
            } else {
                divisor = random(2, 12);
                quotient = random(Math.floor(10 * mult), Math.floor(100 * mult));
            }
            const dividend = divisor * quotient;
            answer = quotient;
            question = `${dividend} ÷ ${divisor}`;
            alternatives = generateSimilarNumbers(answer, 4);
            break;

        case 8: // Trigonometría
            const trigTable = [
                { q: 'Sen(30°)', a: '1/2' },
                { q: 'Sen(45°)', a: '√2/2' },
                { q: 'Sen(60°)', a: '√3/2' },
                { q: 'Cos(30°)', a: '√3/2' },
                { q: 'Cos(45°)', a: '√2/2' },
                { q: 'Cos(60°)', a: '1/2' },
                { q: 'Tan(45°)', a: '1' },
                { q: 'Sen(90°)', a: '1' },
                { q: 'Cos(0°)', a: '1' }
            ];
            if (isHard) {
                trigTable.push(
                    { q: 'Tan(30°)', a: '√3/3' },
                    { q: 'Tan(60°)', a: '√3' },
                    { q: 'Sen(0°)', a: '0' },
                    { q: 'Cos(90°)', a: '0' },
                    { q: 'Sec(60°)', a: '2' },
                    { q: 'Csc(30°)', a: '2' }
                );
            }
            const trig = trigTable[random(0, trigTable.length - 1)];
            answer = trig.a;
            question = trig.q;
            alternatives = shuffle([trig.a, '1/2', '√2/2', '√3/2', '1', '0', '√3', '√3/3', '2'].filter(x => x !== trig.a)).slice(0, 3);
            alternatives.push(trig.a);
            alternatives = shuffle(alternatives);
            break;

        case 9: // Ecuaciones cuadráticas
            let x1, x2, aCoeff = 1;
            x1 = random(-5, 5);
            x2 = random(-5, 5);
            if (isHard) {
                aCoeff = random(2, 4);
            }
            // (ax - x1')(x - x2') ?? No, roots are x1, x2.
            // Eq: a(x-x1)(x-x2) = a(x^2 - (x1+x2)x + x1x2) = ax^2 - a(x1+x2)x + a(x1x2)
            const sumRoots = x1 + x2;
            const prodRoots = x1 * x2;

            const termB = -aCoeff * sumRoots;
            const termC = aCoeff * prodRoots;

            answer = `${x1}, ${x2}`; // Roots don't change just by multiplying eq by a constant, but for presentation:

            let eq = `${aCoeff > 1 ? aCoeff : ''}x² `;
            eq += termB >= 0 ? `+ ${termB === 1 ? '' : termB}x ` : `- ${Math.abs(termB) === 1 ? '' : Math.abs(termB)}x `;
            eq += termC >= 0 ? `+ ${termC}` : `- ${Math.abs(termC)}`;
            eq += ` = 0`;
            question = eq;

            alternatives = [
                `${x1}, ${x2}`,
                `${x1 + 1}, ${x2 - 1}`,
                `${-x1}, ${-x2}`,
                `${x2}, ${x1}` // Duplicate?
            ];
            // Better alts
            const alt1 = `${-x1}, ${-x2}`;
            const alt2 = `${x1 + 1}, ${x2 - 1}`;
            const alt3 = `${x1 - 1}, ${x2 + 1}`;
            alternatives = shuffle([answer, alt1, alt2, alt3]);
            break;

        case 10: // Triángulos notables
            const triangles = [
                { q: '30°-60°: Hipotenusa si cateto menor = K', a: '2K' },
                { q: '45°-45°: Hipotenusa si cateto = K', a: 'K√2' },
                { q: '37°-53°: Hipotenusa si cateto menor = 3K', a: '5K' }
            ];
            if (isHard) {
                triangles.push(
                    { q: '30°-60°: Cateto mayor si cateto menor = K', a: 'K√3' },
                    { q: '37°-53°: Cateto mayor si cateto menor = 3K', a: '4K' },
                    { q: '15°-75°: Altura relativa a hipotenusa (4h=c)', a: 'c/4' }
                );
            }
            const tri = triangles[random(0, triangles.length - 1)];
            answer = tri.a;
            question = tri.q;
            alternatives = shuffle(['2K', 'K√2', 'K√3', '5K', '4K', '3K', 'c/4', 'h*4'].filter(x => x !== tri.a)).slice(0, 3);
            alternatives.push(tri.a);
            alternatives = shuffle(alternatives);
            break;

        case 11: // Fracciones
            const num1 = random(1, 9);
            const den1 = random(2, 10);
            const num2 = random(1, 9);
            const den2 = random(2, 10);
            let fracOp = random(0, 1) ? '+' : '−';
            if (isHard) fracOp = ['+', '−', '×', '÷'][random(0, 3)];

            let resultNum, resultDen;
            if (fracOp === '+') {
                resultNum = num1 * den2 + num2 * den1;
                resultDen = den1 * den2;
            } else if (fracOp === '−') {
                resultNum = num1 * den2 - num2 * den1;
                resultDen = den1 * den2;
            } else if (fracOp === '×') {
                resultNum = num1 * num2;
                resultDen = den1 * den2;
            } else { // ÷
                resultNum = num1 * den2;
                resultDen = den1 * num2;
            }

            // Simplify fraction not implemented, but maybe expected?
            // For game simplicity, we stick to raw result or simplified if possible
            // Let's just ask simpler questions or rely on exact match? 
            // The generator creates similar fractions.
            answer = `${resultNum}/${resultDen}`;
            question = `${num1}/${den1} ${fracOp} ${num2}/${den2}`;
            alternatives = generateSimilarFractions(resultNum, resultDen, 4);
            break;

        case 12: // Áreas
            const shapes = [
                () => {
                    const l = random(5, 20);
                    return { q: `Área cuadrado (lado=${l})`, a: l * l };
                },
                () => {
                    const l = random(5, 15);
                    const w = random(5, 15);
                    return { q: `Área rectángulo (${l}×${w})`, a: l * w };
                },
                () => {
                    const b = random(5, 15);
                    const h = random(5, 15);
                    return { q: `Área triángulo (b=${b}, h=${h})`, a: (b * h) / 2 };
                }
            ];
            if (isHard) {
                shapes.push(
                    () => { const r = random(2, 10); return { q: `Área círculo (r=${r}, π≈3)`, a: 3 * r * r } }, // Pi approx 3
                    () => { const d1 = random(6, 12); const d2 = random(6, 12); return { q: `Área rombo (D=${d1}, d=${d2})`, a: (d1 * d2) / 2 } }
                );
            }
            const shape = shapes[random(0, shapes.length - 1)]();
            answer = shape.a;
            question = shape.q;
            alternatives = generateSimilarNumbers(answer, 4);
            break;

        case 13: // Operaciones Combinadas (PEMDAS)
            const opTypes = [
                () => {
                    const a = random(4, 12);
                    const b = random(2, 10);
                    const c = random(2, 5);
                    const d = random(5, 25);
                    const result = (a + b) * c - d;
                    return { q: `(${a} + ${b}) × ${c} - ${d}`, a: result };
                },
                () => {
                    const a = random(20, 50);
                    const b = random(2, 6);
                    const c = random(3, 9);
                    const d = random(5, 15);
                    const result = a - b * c + d;
                    return { q: `${a} - ${b} × ${c} + ${d}`, a: result };
                }
            ];

            if (isHard) {
                opTypes.push(() => {
                    const a = random(5, 15);
                    const b = random(2, 5);
                    const c = random(2, 5);
                    // (a^2 - b) * c
                    return { q: `(${a}² - ${b}) × ${c}`, a: (a * a - b) * c };
                });
                opTypes.push(() => {
                    const a = random(2, 5);
                    const b = random(2, 5);
                    // 3 * (4 + 5*2) = 3*(14) = 42
                    return { q: `${a} × (${b} + ${a}×2)`, a: a * (b + a * 2) };
                });
            } else {
                opTypes.push(
                    () => {
                        const a = random(2, 6);
                        const b = random(2, 6);
                        const c = random(2, 4);
                        const result = a * b + c * c;
                        return { q: `${a} × ${b} + ${c}²`, a: result };
                    },
                    () => {
                        const a = random(20, 50);
                        const b = random(2, 5);
                        const c = random(3, 8);
                        const result = a / b + c;
                        return { q: `${a} ÷ ${b} + ${c}`, a: result };
                    });
            }
            const combinedOp = opTypes[random(0, opTypes.length - 1)]();
            answer = combinedOp.a;
            question = combinedOp.q;
            alternatives = generateSimilarNumbers(answer, 4);
            break;

        case 14: // Estimación - números grandes y operaciones variadas
            // Margin of error based on difficulty
            const marginPercent = isHard ? 5 : 10; // 5% for hard, 10% for easy/medium

            const estTypes = [
                // Large multiplication estimation
                () => {
                    const a = random(800, 999);
                    const b = random(400, 600);
                    const exact = a * b;
                    const rounded = Math.round(exact / 10000) * 10000;
                    return { q: `${a} × ${b} ≈ ?`, a: rounded, exact };
                },
                // Division estimation
                () => {
                    const dividend = random(8000, 15000);
                    const divisor = random(7, 15);
                    const exact = dividend / divisor;
                    const rounded = Math.round(exact / 100) * 100;
                    return { q: `${dividend} ÷ ${divisor} ≈ ?`, a: rounded, exact };
                },
                // Percentage of large number
                () => {
                    const percent = [15, 17, 23, 33, 47][random(0, 4)];
                    const value = random(2000, 5000);
                    const exact = (percent / 100) * value;
                    const rounded = Math.round(exact / 100) * 100;
                    return { q: `${percent}% de ${value} ≈ ?`, a: rounded, exact };
                },
                // Sum of large numbers
                () => {
                    const a = random(2500, 4500);
                    const b = random(3500, 6500);
                    const c = random(1000, 2000);
                    const exact = a + b + c;
                    const rounded = Math.round(exact / 1000) * 1000;
                    return { q: `${a} + ${b} + ${c} ≈ ?`, a: rounded, exact };
                },
                // Square root estimation
                () => {
                    const perfect = [400, 625, 900, 1600, 2500, 3600, 4900][random(0, 6)];
                    const offset = random(-50, 50);
                    const num = perfect + offset;
                    const exact = Math.sqrt(num);
                    const rounded = Math.round(exact);
                    return { q: `√${num} ≈ ?`, a: rounded, exact };
                }
            ];

            if (isHard) {
                estTypes.push(
                    // Complex multi-operation
                    () => {
                        const a = random(150, 300);
                        const b = random(50, 100);
                        const c = random(20, 50);
                        const exact = a * b - c * c;
                        const rounded = Math.round(exact / 1000) * 1000;
                        return { q: `${a} × ${b} - ${c}² ≈ ?`, a: rounded, exact };
                    },
                    // Fraction of large number
                    () => {
                        const fraction = ['3/4', '2/3', '5/8'][random(0, 2)];
                        const value = random(8000, 15000);
                        const frac = fraction === '3/4' ? 0.75 : fraction === '2/3' ? 0.667 : 0.625;
                        const exact = frac * value;
                        const rounded = Math.round(exact / 500) * 500;
                        return { q: `${fraction} de ${value} ≈ ?`, a: rounded, exact };
                    }
                );
            }

            const est = estTypes[random(0, estTypes.length - 1)]();
            answer = est.a;
            question = est.q;
            // Store margin for answer validation
            GameState.currentMargin = { exact: est.exact, percent: marginPercent };
            alternatives = generateSimilarNumbers(answer, 4);
            break;

        case 15: // Fracción a Decimal
            const fracToDecTable = [
                { q: '1/2', a: '0.5' },
                { q: '1/4', a: '0.25' },
                { q: '3/4', a: '0.75' },
                { q: '1/5', a: '0.2' },
                { q: '2/5', a: '0.4' },
                { q: '3/5', a: '0.6' },
                { q: '4/5', a: '0.8' },
                { q: '1/8', a: '0.125' },
                { q: '3/8', a: '0.375' },
                { q: '5/8', a: '0.625' },
                { q: '7/8', a: '0.875' },
                { q: '1/10', a: '0.1' },
                { q: '1/3', a: '0.333' },
                { q: '2/3', a: '0.666' }
            ];
            if (isHard) {
                fracToDecTable.push(
                    { q: '1/20', a: '0.05' },
                    { q: '3/20', a: '0.15' },
                    { q: '7/20', a: '0.35' },
                    { q: '1/16', a: '0.0625' },
                    { q: '1/25', a: '0.04' },
                    { q: '1/50', a: '0.02' },
                    { q: '1/100', a: '0.01' },
                    { q: '4/3', a: '1.333' },
                    { q: '3/2', a: '1.5' },
                    { q: '5/2', a: '2.5' }
                );
            }
            const f2d = fracToDecTable[random(0, fracToDecTable.length - 1)];
            answer = f2d.a;
            question = `${f2d.q} = ?`;
            const decAlts = ['0.125', '0.25', '0.333', '0.375', '0.4', '0.5', '0.625', '0.666', '0.75', '0.8', '0.875'];
            alternatives = shuffle([f2d.a, ...shuffle(decAlts.filter(x => x !== f2d.a)).slice(0, 3)]);
            break;

        case 16: // Decimal a Fracción
            const decToFracTable = [
                { q: '0.5', a: '1/2' },
                { q: '0.25', a: '1/4' },
                { q: '0.75', a: '3/4' },
                { q: '0.2', a: '1/5' },
                { q: '0.4', a: '2/5' },
                { q: '0.6', a: '3/5' },
                { q: '0.8', a: '4/5' },
                { q: '0.125', a: '1/8' },
                { q: '0.375', a: '3/8' },
                { q: '0.625', a: '5/8' },
                { q: '0.875', a: '7/8' },
                { q: '0.1', a: '1/10' },
                { q: '0.333', a: '1/3' },
                { q: '0.666', a: '2/3' }
            ];
            if (isHard) {
                decToFracTable.push(
                    { q: '0.05', a: '1/20' },
                    { q: '0.15', a: '3/20' },
                    { q: '0.35', a: '7/20' },
                    { q: '0.04', a: '1/25' },
                    { q: '0.02', a: '1/50' },
                    { q: '1.5', a: '3/2' },
                    { q: '1.25', a: '5/4' },
                    { q: '2.5', a: '5/2' }
                );
            }
            const d2f = decToFracTable[random(0, decToFracTable.length - 1)];
            answer = d2f.a;
            question = `${d2f.q} = ?`;
            const fracAlts = ['1/2', '1/3', '1/4', '1/5', '2/5', '3/4', '3/5', '1/8', '3/8', '5/8', '7/8', '2/3'];
            alternatives = shuffle([d2f.a, ...shuffle(fracAlts.filter(x => x !== d2f.a)).slice(0, 3)]);
            break;

        case 17: // MCM y MCD
            // Helper function for GCD
            const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
            const lcm = (a, b) => (a * b) / gcd(a, b);

            const mcmMcdTypes = [
                () => {
                    const nums = [[12, 18], [15, 20], [8, 12], [6, 9], [10, 15], [14, 21], [16, 24], [18, 27]];
                    if (isHard) {
                        nums.push([24, 30], [36, 48], [42, 56], [45, 60], [32, 48], [60, 90], [75, 100]);
                    }
                    const [a, b] = nums[random(0, nums.length - 1)];
                    return { q: `MCM(${a}, ${b})`, a: lcm(a, b) };
                },
                () => {
                    const nums = [[12, 18], [15, 20], [24, 36], [48, 60], [30, 45], [28, 42], [36, 54]];
                    if (isHard) {
                        nums.push([72, 96], [80, 100], [48, 72], [54, 81], [56, 70], [84, 108]);
                    }
                    const [a, b] = nums[random(0, nums.length - 1)];
                    return { q: `MCD(${a}, ${b})`, a: gcd(a, b) };
                }
            ];
            const mcmMcd = mcmMcdTypes[random(0, mcmMcdTypes.length - 1)]();
            answer = mcmMcd.a;
            question = `${mcmMcd.q} = ?`;
            alternatives = generateSimilarNumbers(answer, 4);
            break;

        case 18: // Potencias de 10
            const pow10Types = [
                () => {
                    const coef = [1.5, 2.5, 3.5, 4.5, 2, 3, 5, 7][random(0, 7)];
                    const exp = random(2, 4);
                    return { q: `${coef} × 10${exp === 2 ? '²' : exp === 3 ? '³' : '⁴'}`, a: coef * Math.pow(10, exp) };
                },
                () => {
                    const base = [100, 1000, 10000][random(0, 2)];
                    const mult = random(2, 9);
                    return { q: `${mult} × ${base}`, a: mult * base };
                },
                () => {
                    const exp = random(2, 5);
                    return { q: `10${exp === 2 ? '²' : exp === 3 ? '³' : exp === 4 ? '⁴' : '⁵'}`, a: Math.pow(10, exp) };
                }
            ];
            if (isHard) {
                pow10Types.push(
                    () => {
                        // Negative exponents: 10^-n
                        const exp = random(1, 3);
                        return { q: `10⁻${exp === 1 ? '¹' : exp === 2 ? '²' : '³'}`, a: Math.pow(10, -exp) };
                    },
                    () => {
                        // Decimal multiplication: 0.5 x 100
                        const coef = [0.1, 0.5, 0.25, 0.01][random(0, 3)];
                        const exp = random(1, 3); // 10, 100, 1000
                        const base = Math.pow(10, exp);
                        return { q: `${coef} × 10${exp === 1 ? '¹' : exp === 2 ? '²' : '³'}`, a: coef * base };
                    },
                    () => {
                        // Division: 10^5 / 10^2
                        const exp1 = random(4, 6);
                        const exp2 = random(1, 3);
                        return { q: `10${exp1} ÷ 10${exp2}`, a: Math.pow(10, exp1 - exp2) };
                    }
                );
            }
            const pow10 = pow10Types[random(0, pow10Types.length - 1)]();
            answer = pow10.a;
            question = `${pow10.q} = ?`;
            alternatives = generateSimilarNumbers(answer, 4);
            break;

        case 19: // Logaritmos básicos
            const logTable = [
                { q: 'log₂(8)', a: 3 },
                { q: 'log₂(16)', a: 4 },
                { q: 'log₂(32)', a: 5 },
                { q: 'log₂(64)', a: 6 },
                { q: 'log₂(4)', a: 2 },
                { q: 'log₁₀(100)', a: 2 },
                { q: 'log₁₀(1000)', a: 3 },
                { q: 'log₁₀(10000)', a: 4 },
                { q: 'log₁₀(10)', a: 1 },
                { q: 'log₃(9)', a: 2 },
                { q: 'log₃(27)', a: 3 },
                { q: 'log₅(25)', a: 2 },
                { q: 'log₅(125)', a: 3 }
            ];
            if (isHard) {
                logTable.push(
                    { q: 'log₂(128)', a: 7 },
                    { q: 'log₂(256)', a: 8 },
                    { q: 'log₃(81)', a: 4 },
                    { q: 'log₄(64)', a: 3 },
                    { q: 'log₄(256)', a: 4 },
                    { q: 'log₆(36)', a: 2 },
                    { q: 'log₇(49)', a: 2 },
                    { q: 'log₂(0.5)', a: -1 },
                    { q: 'log₁₀(0.1)', a: -1 }
                );
            }
            const logQ = logTable[random(0, logTable.length - 1)];
            answer = logQ.a;
            question = `${logQ.q} = ?`;
            alternatives = shuffle([logQ.a, logQ.a + 1, logQ.a - 1, logQ.a + 2].filter(x => x > 0));
            break;

        case 20: // Regla de Tres Check
            /* 
               Format: "a : b ≡ c : ?"
               Refers to a/b = c/x  => x = (b*c)/a
               We want integer results.
               Let ratio = b/a. Or x = c * (b/a).
               Generate a, b, c such that result is integer.
            */
            const r3Types = [
                () => {
                    // Direct integer scaling
                    const a = random(2, 6);
                    const factor = random(2, 5);
                    const b = a * factor;  // b is multiple of a
                    const c = random(2, 6) * a; // c is also multiple of a? Not necessarily, but result (b*c)/a must be int.
                    // x = (b*c)/a = (a*factor * c)/a = factor * c.
                    // So if b is multiple of a, result is integer.
                    return { q: `${a} : ${b} ≡ ${c} : ?`, a: (b * c) / a };
                },
                () => {
                    // b not multiple of a, but c is multiple of a
                    const a = random(3, 9);
                    const b = random(2, 20); // arbitrary
                    const k = random(2, 5);
                    const c = a * k; // c is multiple of a
                    // x = (b*c)/a = (b * a*k)/a = b*k
                    return { q: `${a} : ${b} ≡ ${c} : ?`, a: (b * c) / a };
                },
                () => {
                    // Simple classic: 2 is to 4 as 5 is to 10
                    const a = random(2, 5);
                    const b = random(2, 5) * 2;
                    const c = a * 10;
                    return { q: `${a} : ${b} ≡ ${c} : ?`, a: (b * c) / a };
                }
            ];
            if (isHard) {
                r3Types.push(() => {
                    // Harder scaling: a=4, b=6, c=10 => x=15
                    // (b*c)/a = integer.
                    // Let a, b, c be multiples of some factor
                    const f = random(2, 4);
                    const a = f * random(2, 5); // 8
                    const b = f * random(3, 7); // 12
                    // c needs to make (b*c)/a integer.
                    // x = b*c/a = (kb * kc)/ka ...
                    // random gen: a, b. c = multiple of a / gcd(a,b)
                    const c = (a / gcd(a, b)) * random(2, 5) * random(2, 10);
                    return { q: `${a} : ${b} ≡ ${c} : ?`, a: (b * c) / a };
                });
                r3Types.push(() => {
                    // Large Numbers
                    const a = random(10, 20);
                    const b = a * random(2, 5);
                    const c = random(10, 50);
                    return { q: `${a} : ${b} ≡ ${c} : ?`, a: (b * c) / a };
                });
            }
            const r3 = r3Types[random(0, r3Types.length - 1)]();
            answer = r3.a;
            question = r3.q;
            alternatives = generateSimilarNumbers(answer, 4);
            break;
    }

    return { question, answer: String(answer), alternatives: alternatives.map(String) };
}

function generateSimilarNumbers(correct, count) {
    // Generate alternatives that are VERY similar to the correct answer:
    // - Same ending digit (last digit matches)
    // - Close multiples or within small range
    const nums = new Set();
    nums.add(correct);

    const lastDigit = Math.abs(correct) % 10;
    const magnitude = Math.max(10, Math.floor(Math.abs(correct) / 10) * 10);

    // Strategy 1: Add/subtract multiples of 10 (keeps same last digit)
    const offsets = [-30, -20, -10, 10, 20, 30, -40, 40, -50, 50];
    shuffle(offsets);

    for (const offset of offsets) {
        if (nums.size >= count) break;
        const alt = correct + offset;
        if (alt > 0 && alt !== correct) {
            nums.add(alt);
        }
    }

    // Strategy 2: If still need more, swap middle digits
    if (nums.size < count && correct > 99) {
        const str = String(correct);
        for (let i = 0; i < str.length - 1 && nums.size < count; i++) {
            // Swap adjacent digits
            const arr = str.split('');
            [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
            const swapped = parseInt(arr.join(''));
            if (swapped !== correct && swapped > 0) {
                nums.add(swapped);
            }
        }
    }

    // Strategy 3: Change one digit slightly
    if (nums.size < count && correct > 9) {
        const str = String(correct);
        for (let i = 0; i < str.length - 1 && nums.size < count; i++) {
            const digit = parseInt(str[i]);
            for (const delta of [1, -1, 2, -2]) {
                if (nums.size >= count) break;
                const newDigit = (digit + delta + 10) % 10;
                const newStr = str.substring(0, i) + newDigit + str.substring(i + 1);
                const alt = parseInt(newStr);
                if (alt !== correct && alt > 0) {
                    nums.add(alt);
                }
            }
        }
    }

    // Fallback: just add close numbers
    let fallback = 1;
    while (nums.size < count) {
        const alt = correct + (fallback * 10);
        if (!nums.has(alt) && alt > 0) nums.add(alt);
        const alt2 = correct - (fallback * 10);
        if (!nums.has(alt2) && alt2 > 0) nums.add(alt2);
        fallback++;
    }

    return shuffle([...nums].slice(0, count));
}

function generateSimilarFractions(num, den, count) {
    const fracs = new Set([`${num}/${den}`]);
    while (fracs.size < count) {
        const newNum = num + random(-3, 3);
        const newDen = den + random(-2, 2);
        if (newDen > 0 && newDen !== 0) fracs.add(`${newNum}/${Math.abs(newDen)}`);
    }
    return shuffle([...fracs]);
}

// ========== Timer Functions ==========
function startTimer() {
    GameState.timeRemaining = GameState.difficultySettings[GameState.difficulty].time;
    GameState.questionStartTime = Date.now();
    updateTimerDisplay();

    GameState.timerInterval = setInterval(() => {
        GameState.timeRemaining--;
        updateTimerDisplay();

        if (GameState.timeRemaining <= 0) {
            clearInterval(GameState.timerInterval);
            submitAnswer(true);
        }
    }, 1000);
}

function updateTimerDisplay() {
    const display = document.getElementById('timer-display');
    const text = document.getElementById('timer-text');
    text.textContent = GameState.timeRemaining;

    display.classList.remove('warning', 'danger');
    if (GameState.timeRemaining <= 5) display.classList.add('danger');
    else if (GameState.timeRemaining <= 10) display.classList.add('warning');
}

function stopTimer() {
    clearInterval(GameState.timerInterval);
    return Date.now() - GameState.questionStartTime;
}

// Central cleanup function to stop ALL game intervals/timers
function stopAllTimers() {
    // Stop main timer
    if (GameState.timerInterval) {
        clearInterval(GameState.timerInterval);
        GameState.timerInterval = null;
    }
    // Stop chapter countdown
    if (GameState.countdownInterval) {
        clearInterval(GameState.countdownInterval);
        GameState.countdownInterval = null;
    }
    // Stop NoiseRenderer animation
    if (typeof NoiseRenderer !== 'undefined' && NoiseRenderer.isRunning) {
        NoiseRenderer.stop();
    }
    // Hide floating pause button
    const pauseBtn = document.getElementById('floating-pause-btn');
    if (pauseBtn) pauseBtn.classList.add('hidden');
    // Hide pause overlay if open
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) pauseOverlay.classList.remove('active');
    // Reset pause state
    if (typeof isPaused !== 'undefined') isPaused = false;
}

// ========== Game Flow ==========
function startGame() {
    // Filter chapters based on selection
    if (GameState.selectedChapters.length === 0) {
        alert('Por favor selecciona al menos un capítulo');
        return;
    }

    // Create playable chapters array from selected IDs
    GameState.playableChapters = GameState.chapters.filter(c =>
        GameState.selectedChapters.includes(c.id)
    );

    GameState.currentChapter = 0;
    GameState.totalCorrect = 0;
    GameState.totalExercises = 0;
    GameState.allResults = [];
    GameState.totalStartTime = Date.now();
    GameState.lives = 3; // Reset lives

    startChapter();
}

function startChapter() {
    const chapter = GameState.playableChapters[GameState.currentChapter];
    GameState.currentExercise = 0;
    GameState.chapterResults = [];
    GameState.chapterExercises = [];

    // Generate exercises for this chapter
    for (let i = 0; i < chapter.exerciseCount; i++) {
        GameState.chapterExercises.push(generateExercise(chapter.id));
    }

    showChapterIntro(chapter);
}

function showChapterIntro(chapter) {
    showScreen('exercise-screen');
    const intro = document.getElementById('chapter-intro');
    intro.classList.remove('hidden');

    document.getElementById('intro-chapter-num').textContent = chapter.id;
    document.getElementById('intro-chapter-icon').textContent = chapter.icon;
    document.getElementById('intro-chapter-name').textContent = chapter.name;

    let countdown = 3;
    const countdownEl = document.getElementById('intro-countdown');
    countdownEl.textContent = countdown;

    // Clear any existing countdown first
    if (GameState.countdownInterval) {
        clearInterval(GameState.countdownInterval);
    }

    // Store interval in GameState so it can be cleared
    GameState.countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            countdownEl.textContent = countdown;
        } else {
            clearInterval(GameState.countdownInterval);
            GameState.countdownInterval = null;
            intro.classList.add('hidden');
            showExercise();
        }
    }, 1000);
}

function showExercise() {
    const chapter = GameState.playableChapters[GameState.currentChapter];
    const exercise = GameState.chapterExercises[GameState.currentExercise];

    // Update header
    document.getElementById('current-chapter').textContent = `Cap. ${chapter.id}: ${chapter.name}`;
    document.getElementById('exercise-count').textContent = `Ejercicio ${GameState.currentExercise + 1} de ${chapter.exerciseCount}`;
    document.getElementById('question-number').textContent = `Pregunta ${GameState.currentExercise + 1}`;

    // In Practice Mode, maybe hide total progress or show within chapter?
    // Current logic sums all playableChapters. If Practice Mode, playableChapters has only 1 chapter.
    // So progress bar works correctly (0 to 100% of that chapter).

    // Only add '= ?' if the question doesn't already contain '?' or '≈'
    const questionText = exercise.question.includes('?') || exercise.question.includes('≈')
        ? exercise.question
        : exercise.question + ' = ?';

    // Use NoiseRenderer for anti-screenshot text display
    if (typeof NoiseRenderer !== 'undefined' && NoiseRenderer.canvas) {
        NoiseRenderer.setText(questionText);
        NoiseRenderer.start();
    }

    // Update Lives Display
    const livesDisplay = document.getElementById('lives-display');
    if (GameState.difficulty === 'extreme') {
        livesDisplay.classList.remove('hidden');
        livesDisplay.innerHTML = '❤️'.repeat(GameState.lives) + '🖤'.repeat(3 - GameState.lives);
        if (GameState.lives <= 1) {
            // Flash animation via inline style or class
            livesDisplay.style.animation = 'pulse 0.5s infinite';
        } else {
            livesDisplay.style.animation = '';
        }
    } else {
        livesDisplay.classList.add('hidden');
    }
    // Update pause button visibility
    if (GameState.difficulty !== 'extreme') {
        document.getElementById('floating-pause-btn').classList.remove('hidden');
    }

    // Update progress bar
    const totalExercisesCount = GameState.playableChapters.reduce((acc, ch) => acc + ch.exerciseCount, 0);
    let exercisesPassed = 0;
    for (let i = 0; i < GameState.currentChapter; i++) {
        exercisesPassed += GameState.playableChapters[i].exerciseCount;
    }
    exercisesPassed += GameState.currentExercise;

    const totalProgress = (exercisesPassed / totalExercisesCount) * 100;
    document.getElementById('progress-bar').style.width = `${totalProgress}%`;

    // Set up input mode
    const writeMode = document.getElementById('write-mode');
    const choiceMode = document.getElementById('choice-mode');

    if (GameState.mode === 'write') {
        writeMode.classList.remove('hidden');
        choiceMode.classList.add('hidden');
        const input = document.getElementById('answer-input');
        input.value = '';
        input.focus();
    } else {
        writeMode.classList.add('hidden');
        choiceMode.classList.remove('hidden');
        GameState.selectedChoice = null;

        const buttons = choiceMode.querySelectorAll('.choice-btn');
        buttons.forEach((btn, i) => {
            const valueSpan = btn.querySelector('.choice-value');
            if (valueSpan) {
                valueSpan.textContent = exercise.alternatives[i];
            }
            btn.className = 'choice-btn';
            btn.onclick = () => selectChoice(btn, i);
        });
    }

    startTimer();
}

function selectChoice(btn, index) {
    document.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    GameState.selectedChoice = index;
}

// Check answer with margin tolerance for estimation
function checkAnswer(userAnswer, correctAnswer) {
    // Exact match first
    if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
        return true;
    }

    // Check if estimation margin applies
    if (GameState.currentMargin) {
        const userNum = parseFloat(userAnswer);
        const exactVal = GameState.currentMargin.exact;
        const marginPercent = GameState.currentMargin.percent;

        if (!isNaN(userNum) && exactVal) {
            const tolerance = Math.abs(exactVal * (marginPercent / 100));
            const diff = Math.abs(userNum - exactVal);
            if (diff <= tolerance) {
                return true;
            }
        }
        // Clear margin after check
        GameState.currentMargin = null;
    }

    return false;
}

function submitAnswer(timeout = false) {
    const timeTaken = stopTimer();
    const exercise = GameState.chapterExercises[GameState.currentExercise];

    let userAnswer;
    if (GameState.mode === 'write') {
        userAnswer = document.getElementById('answer-input').value.trim();
    } else {
        userAnswer = GameState.selectedChoice !== null ? exercise.alternatives[GameState.selectedChoice] : '';
    }

    const isCorrect = checkAnswer(userAnswer, exercise.answer);

    if (isCorrect) {
        GameState.totalCorrect++;
        GameState.streak++;
        SoundManager.success();

        // XP Calculation
        let baseXp = 100;
        const timeBonus = Math.max(0, Math.floor((GameState.difficultySettings[GameState.difficulty].time * 1000 - timeTaken) / 1000) * 10);
        const chapterBonus = GameState.selectedChapters.length * 5; // Bonus for more chapters

        // Apply x2 power-up
        let xpMultiplier = 1;
        if (GameState.activePowerup === 'x2') {
            xpMultiplier = 2;
            GameState.activePowerup = null;
            PowerUpManager.updateUI();
        }

        const totalXp = (baseXp + timeBonus + chapterBonus) * xpMultiplier;
        GameState.xp += totalXp;
        checkLevelUp();
        updateLevelUI();

        // Power-up rewards
        PowerUpManager.checkStreakReward();
        PowerUpManager.checkRandomDrop();

        // Update streak display
        updateStreakUI();

    } else {
        // Check for retry power-up
        if (GameState.retryAvailable) {
            GameState.retryAvailable = false;
            PowerUpManager.updateUI();
            SoundManager.playTone(400, 'triangle', 0.3, 0.1);
            return; // Don't continue, let player retry
        }

        // Check for shield power-up
        if (GameState.activePowerup === 'shield') {
            GameState.activePowerup = null;
            PowerUpManager.updateUI();
            SoundManager.playTone(300, 'sine', 0.3, 0.1);
            // Shield activated: streak protected, but answer is still wrong
        } else {
            GameState.streak = 0; // Reset streak on wrong answer without shield
            updateStreakUI();
        }

        SoundManager.error();
        if (GameState.difficulty === 'extreme') {
            GameState.lives--;
            const livesDisplay = document.getElementById('lives-display');
            if (livesDisplay) {
                livesDisplay.innerHTML = '❤️'.repeat(GameState.lives) + '🖤'.repeat(3 - GameState.lives);
            }
            if (GameState.lives <= 0) {
                setTimeout(showGameOver, 500); // Trigger game over
                return; // Stop normal flow
            }
        }
    }

    GameState.totalExercises++;

    const result = {
        question: exercise.question,
        userAnswer: timeout ? '(Tiempo agotado)' : userAnswer,
        correctAnswer: exercise.answer,
        isCorrect,
        timeTaken: Math.round(timeTaken / 1000)
    };

    GameState.chapterResults.push(result);
    GameState.allResults.push(result);

    // Next exercise or chapter results
    GameState.currentExercise++;
    if (GameState.currentExercise < GameState.chapterExercises.length) {
        showExercise();
    } else {
        showChapterResults();
    }
}

function showChapterResults() {
    const chapter = GameState.playableChapters[GameState.currentChapter];
    const correct = GameState.chapterResults.filter(r => r.isCorrect).length;
    const incorrect = GameState.chapterResults.length - correct;
    const percentage = Math.round((correct / GameState.chapterResults.length) * 100);
    const avgTime = Math.round(GameState.chapterResults.reduce((sum, r) => sum + r.timeTaken, 0) / GameState.chapterResults.length);

    // Update header
    const icon = percentage >= 80 ? '🎉' : percentage >= 60 ? '👍' : percentage >= 40 ? '💪' : '📚';
    document.getElementById('chapter-complete-icon').textContent = icon;
    document.getElementById('chapter-icon').textContent = chapter.icon;
    document.getElementById('chapter-name-text').textContent = chapter.name;
    document.getElementById('chapter-results-title').textContent = `Capítulo ${chapter.id} Completado`;
    document.getElementById('chapter-score').textContent = `${correct}/${GameState.chapterResults.length}`;
    document.getElementById('chapter-percentage').textContent = `${percentage}%`;

    // Motivational message
    const motivationalMsg = MotivationalMessages.get(percentage);
    let motivationalEl = document.getElementById('motivational-message');
    if (!motivationalEl) {
        motivationalEl = document.createElement('div');
        motivationalEl.id = 'motivational-message';
        motivationalEl.style.cssText = 'font-size: 1.1rem; margin-top: 0.5rem; color: var(--accent-secondary); font-weight: 600;';
        document.getElementById('chapter-percentage').parentElement.appendChild(motivationalEl);
    }
    motivationalEl.textContent = motivationalMsg;

    // Speak motivational message if enabled
    if (SpeechManager.enabled) {
        SpeechManager.speak(motivationalMsg.replace(/[🎉🔥⭐💪🏆👍🙂✨💫👏📚💭🎯⚡🌱🔄📖🌟🚀]/g, ''));
    }

    // Update stats
    document.getElementById('stat-correct').textContent = correct;
    document.getElementById('stat-incorrect').textContent = incorrect;
    document.getElementById('stat-avg-time').textContent = `${avgTime}s`;

    // Update accumulated
    document.getElementById('accumulated-score').textContent = `${GameState.totalCorrect}/${GameState.totalExercises}`;

    // Populate results list
    const list = document.getElementById('chapter-results-list');
    list.innerHTML = '';

    GameState.chapterResults.forEach((r, i) => {
        const item = document.createElement('div');
        item.className = `result-item ${r.isCorrect ? 'correct' : 'incorrect'}`;
        item.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span class="result-question">${r.question}</span>
                        <span class="result-time">(${r.timeTaken}s)</span>
                    </div>
                    <span class="result-answer ${r.isCorrect ? 'correct' : 'incorrect'}">
                        ${r.isCorrect ? '✓ ' + r.userAnswer : '✗ ' + r.userAnswer + ' → ' + r.correctAnswer}
                    </span>
                `;
        list.appendChild(item);
    });

    // Update next button text
    const nextBtn = document.getElementById('next-chapter-btn');
    if (GameState.currentChapter >= GameState.chapters.length - 1) {
        nextBtn.textContent = '🏆 Ver Resultados Finales';
    } else {
        nextBtn.textContent = 'Siguiente Capítulo →';
    }

    showScreen('chapter-results-screen');
}

function nextChapter() {
    // Practice Mode Handling
    if (GameState.isPracticeMode) {
        showPracticeScreen(); // Return to practice selection
        return;
    }

    GameState.currentChapter++;
    if (GameState.currentChapter < GameState.playableChapters.length) {
        startChapter();
    } else {
        showFinalResults();
    }
}

function showGameOver() {
    // Stop all game timers
    stopAllTimers();

    const overlay = document.createElement('div');
    overlay.className = 'pause-overlay active';
    overlay.style.backgroundColor = 'rgba(20, 0, 0, 0.95)';
    overlay.style.zIndex = '2000';
    overlay.innerHTML = `
            <div class="pause-icon" style="color: #ef4444;">☠️</div>
            <div class="pause-text" style="background: var(--error); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">¡JUEGO TERMINADO!</div>
            <div class="pause-hint" style="color: white; margin-top: 1rem; font-size: 1.2rem;">Perdiste todas tus vidas 😭</div>
            <button class="next-btn" id="game-over-next" style="margin-top: 2rem; max-width: 300px;">Ver Resultados →</button>
        `;

    document.body.appendChild(overlay);

    document.getElementById('game-over-next').addEventListener('click', () => {
        overlay.remove();
        showFinalResults();
    });

    SoundManager.playTone(100, 'sawtooth', 0.5, 0.2);
    setTimeout(() => SoundManager.playTone(80, 'sawtooth', 0.5, 0.2), 400);
    setTimeout(() => SoundManager.playTone(60, 'sawtooth', 1.0, 0.2), 800);
}

function showFinalResults() {
    // Stop all timers before showing results
    stopAllTimers();

    // Save Session History
    const totalTime = Math.round((Date.now() - GameState.totalStartTime) / 1000);
    const sessionData = {
        date: Date.now(),
        score: GameState.totalCorrect * 100, // Simple score metric
        correct: GameState.totalCorrect,
        total: GameState.totalExercises,
        xp: GameState.allResults.length * 100, // approx
        time: totalTime
    };

    GameState.sessionHistory.push(sessionData);
    GameState.highScores.push({ date: Date.now(), score: sessionData.score });

    // Keep history limited
    if (GameState.sessionHistory.length > 20) GameState.sessionHistory.shift();
    if (GameState.highScores.length > 20) GameState.highScores.sort((a, b) => b.score - a.score).pop();

    Persistence.save();

    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    const accuracy = Math.round((GameState.totalCorrect / GameState.totalExercises) * 100);
    const avgTime = Math.round(GameState.allResults.reduce((sum, r) => sum + r.timeTaken, 0) / GameState.allResults.length);

    // Update main score
    document.getElementById('final-score').textContent = `${GameState.totalCorrect}/${GameState.totalExercises}`;
    document.getElementById('final-time').textContent = `Tiempo total: ${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Grade badge
    const gradeBadge = document.getElementById('grade-badge');
    let gradeText, gradeClass;
    if (accuracy >= 90) {
        gradeText = '🏆 Excelente';
        gradeClass = 'excellent';
        document.getElementById('final-score-display').classList.add('celebrate');
    } else if (accuracy >= 70) {
        gradeText = '⭐ Muy Bien';
        gradeClass = 'good';
    } else if (accuracy >= 50) {
        gradeText = '👍 Bien';
        gradeClass = 'average';
    } else {
        gradeText = '📚 Sigue Practicando';
        gradeClass = 'needs-work';
    }
    gradeBadge.textContent = gradeText;
    gradeBadge.className = `grade-badge ${gradeClass}`;

    // Update stats grid
    document.getElementById('final-correct').textContent = GameState.totalCorrect;
    document.getElementById('final-total').textContent = GameState.totalExercises;
    document.getElementById('final-avg-time').textContent = `${avgTime}s`;
    document.getElementById('final-accuracy').textContent = `${accuracy}%`;

    // Populate all results
    const list = document.getElementById('final-results-list');
    list.innerHTML = '';

    GameState.allResults.forEach((r, i) => {
        const item = document.createElement('div');
        item.className = `result-item ${r.isCorrect ? 'correct' : 'incorrect'}`;
        item.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span class="result-question">${r.question}</span>
                        <span class="result-time">(${r.timeTaken}s)</span>
                    </div>
                    <span class="result-answer ${r.isCorrect ? 'correct' : 'incorrect'}">
                        ${r.isCorrect ? '✓' : '✗ → ' + r.correctAnswer}
                    </span>
                `;
        list.appendChild(item);
    });

    showScreen('final-results-screen');
}

// ========== Event Listeners ==========
document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const difficulty = btn.dataset.difficulty;

        // Check if trying to select extreme when locked
        if (difficulty === 'extreme' && GameState.level < 5) {
            alert('🔒 ¡Modo Extremo Bloqueado!\n\nNecesitas alcanzar el Nivel 5 para desbloquear este modo.\n\nNivel actual: ' + GameState.level);
            return; // Don't select extreme mode
        }

        document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        GameState.difficulty = difficulty;
    });
});

document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        GameState.mode = btn.dataset.mode;
    });
});

// ========== Chapter Selector ==========
function populateChapterGrid() {
    const grid = document.getElementById('chapter-grid');
    grid.innerHTML = '';

    GameState.chapters.forEach(chapter => {
        const isSelected = GameState.selectedChapters.includes(chapter.id);
        const checkbox = document.createElement('label');
        checkbox.className = `chapter-checkbox ${isSelected ? 'selected' : ''}`;
        checkbox.dataset.chapterId = chapter.id;
        checkbox.innerHTML = `
                <span class="check-icon">${isSelected ? '✓' : ''}</span>
                <span class="ch-name">${chapter.id}. ${chapter.name}</span>
            `;
        checkbox.addEventListener('click', () => toggleChapter(chapter.id));
        grid.appendChild(checkbox);
    });

    updateChapterCount();
}

function toggleChapter(chapterId) {
    const index = GameState.selectedChapters.indexOf(chapterId);
    if (index > -1) {
        GameState.selectedChapters.splice(index, 1);
    } else {
        GameState.selectedChapters.push(chapterId);
    }
    populateChapterGrid();
}

function updateChapterCount() {
    const total = GameState.chapters.length;
    const selected = GameState.selectedChapters.length;

    // Referencias a elementos
    const totalTimeEasy = document.getElementById('total-time-easy');
    const totalTimeMedium = document.getElementById('total-time-medium');
    const totalTimeHard = document.getElementById('total-time-hard');

    // Función auxiliar para formatear segundos a HH:MM:SS o MM:SS
    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        const mmss = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

        // Si hay horas, añade HH al principio, si no, solo MM:SS
        return h > 0 ? `${h.toString().padStart(2, '0')}:${mmss}` : mmss;
    };

    // Calcular total de preguntas
    let totalPreguntas = 0;
    GameState.selectedChapters.forEach((isSelected, index) => {
        if (isSelected) {
            totalPreguntas += GameState.chapters[index].exerciseCount;
        }
    });

    // Actualizar texto del selector
    document.querySelector('.chapter-selector-toggle .toggle-text').textContent =
        `📚 Capítulos Seleccionados (${selected}/${total}) | ${totalPreguntas} preguntas`;

    // Calcular y mostrar tiempos formateados
    totalTimeEasy.textContent = "⏱️ " + formatTime(totalPreguntas * 60);
    totalTimeMedium.textContent = "⏱️ " + formatTime(totalPreguntas * 30);
    totalTimeHard.textContent = "⏱️ " + formatTime(totalPreguntas * 18);

    // Guardar en localStorage
    localStorage.setItem('matematica_rapida_save', JSON.stringify(GameState));
}

// Toggle chapter selector panel
document.getElementById('chapter-selector-toggle').addEventListener('click', () => {
    const toggle = document.getElementById('chapter-selector-toggle');
    const content = document.getElementById('chapter-selector-content');
    toggle.classList.toggle('open');
    content.classList.toggle('open');
});

// Select all chapters
document.getElementById('select-all-chapters').addEventListener('click', () => {
    GameState.selectedChapters = GameState.chapters.map(c => c.id);
    populateChapterGrid();
});

// Deselect all chapters
document.getElementById('deselect-all-chapters').addEventListener('click', () => {
    GameState.selectedChapters = [];
    populateChapterGrid();
});

// Initialize chapter grid
populateChapterGrid();

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('submit-btn').addEventListener('click', () => submitAnswer(false));
document.getElementById('next-chapter-btn').addEventListener('click', nextChapter);
document.getElementById('restart-btn').addEventListener('click', () => {
    showScreen('menu-screen');
});

// Symbol buttons - append symbol to input
document.querySelectorAll('.symbol-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = document.getElementById('answer-input');
        const symbol = btn.dataset.symbol;
        input.value += symbol;
        input.focus();
    });
});

// ========== Pause System ==========
let isPaused = false;
let pausedTimeRemaining = 0;

function togglePause() {
    if (!document.getElementById('exercise-screen').classList.contains('active')) return;

    isPaused = !isPaused;
    const overlay = document.getElementById('pause-overlay');

    if (isPaused) {
        // Pause
        overlay.classList.add('active');
        pausedTimeRemaining = GameState.timeRemaining;
        clearInterval(GameState.timerInterval);
    } else {
        // Resume
        overlay.classList.remove('active');
        GameState.timeRemaining = pausedTimeRemaining;
        GameState.timerInterval = setInterval(() => {
            GameState.timeRemaining--;
            updateTimerDisplay();
            if (GameState.timeRemaining <= 0) {
                clearInterval(GameState.timerInterval);
                submitAnswer(true);
            }
        }, 1000);
    }
}

// ========== Global Keyboard Controls ==========
document.addEventListener('keydown', (e) => {
    // Space to pause/resume (only during exercise)
    if (e.code === 'Space' && document.getElementById('exercise-screen').classList.contains('active')) {
        e.preventDefault();
        togglePause();
        return;
    }

    // Don't process other keys if paused
    if (isPaused) return;

    // Enter to confirm (works in both modes)
    if (e.key === 'Enter' && document.getElementById('exercise-screen').classList.contains('active')) {
        e.preventDefault();
        submitAnswer(false);
        return;
    }

    // Number keys 1-4 for choice mode
    if (GameState.mode === 'choice' && document.getElementById('exercise-screen').classList.contains('active')) {
        const key = e.key;
        if (['1', '2', '3', '4'].includes(key)) {
            const index = parseInt(key) - 1;
            const buttons = document.querySelectorAll('.choice-btn');
            if (buttons[index]) {
                buttons.forEach(b => b.classList.remove('selected'));
                buttons[index].classList.add('selected');
                GameState.selectedChoice = index;
            }
        }
    }
});

// ========== Particles ==========
function createParticles() {
    const container = document.getElementById('particles');
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (10 + Math.random() * 10) + 's';
        const colors = ['#7c3aed', '#06b6d4', '#22c55e', '#f59e0b'];
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        container.appendChild(particle);
    }
}



document.addEventListener('DOMContentLoaded', createParticles);
// ========== Records Logic ==========
function showRecords() {
    const container = document.getElementById('records-content');
    container.innerHTML = '';

    // High Scores (Podium Style)
    const scoresSection = document.createElement('div');
    scoresSection.className = 'record-card';
    scoresSection.innerHTML = '<div class="record-title">🏆 Top Puntajes</div>';

    // Podium Container
    const podiumContainer = document.createElement('div');
    podiumContainer.className = 'podium-container';

    // List for non-podium
    const scoresList = document.createElement('div');
    scoresList.className = 'record-list';

    if (GameState.highScores.length === 0) {
        scoresSection.innerHTML += '<div style="text-align:center; color: var(--text-muted); font-size: 0.8rem; margin: 1rem;">Aún no hay récords</div>';
    } else {
        const sortedScores = GameState.highScores.slice().sort((a, b) => b.score - a.score).slice(0, 5);

        // Render Podium (Indices 0, 1, 2 => Rank 1, 2, 3)
        // Order in DOM for visual centered layout: Rank 2, Rank 1, Rank 3
        const top3 = [sortedScores[1], sortedScores[0], sortedScores[2]].filter(s => s !== undefined);

        top3.forEach(s => {
            const rank = sortedScores.indexOf(s) + 1;
            const spot = document.createElement('div');
            spot.className = `podium-spot podium-rank-${rank}`;
            spot.innerHTML = `
                <div class="podium-score">${s.score} pts</div>
                <div class="podium-bar">${rank}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.2rem;">${new Date(s.date).toLocaleDateString()}</div>
            `;
            podiumContainer.appendChild(spot);
        });

        if (top3.length > 0) scoresSection.appendChild(podiumContainer);

        // Render remaining (Rank 4, 5)
        sortedScores.slice(3).forEach((s, i) => {
            const item = document.createElement('div');
            item.className = 'record-item';
            item.innerHTML = `
                <span><span class="record-rank">#${i + 4}</span> ${new Date(s.date).toLocaleDateString()}</span>
                <span style="color: var(--accent-secondary); font-weight:bold;">${s.score} pts</span>
            `;
            scoresList.appendChild(item);
        });
        scoresSection.appendChild(scoresList);
    }
    container.appendChild(scoresSection);

    // History
    const historySection = document.createElement('div');
    historySection.className = 'record-card';
    historySection.innerHTML = '<div class="record-title">📜 Historial Reciente</div><div class="record-list"></div>';
    const historyList = historySection.querySelector('.record-list');

    if (GameState.sessionHistory.length === 0) {
        historyList.innerHTML = '<div style="text-align:center; color: var(--text-muted); font-size: 0.8rem;">Sin partidas recientes</div>';
    } else {
        GameState.sessionHistory.slice().reverse().slice(0, 5).forEach(s => {
            historyList.innerHTML += `
                    <div class="record-item">
                        <span>${new Date(s.date).toLocaleDateString()}</span>
                        <span>${s.correct}/${s.total} (${s.xp} XP)</span>
                    </div>`;
        });
    }
    container.appendChild(historySection);

    showScreen('records-screen');
}

// ========== Initialization & Events ==========

// Load saved data
Persistence.load();

// Top Bar Listeners
document.getElementById('records-btn').addEventListener('click', () => {
    SoundManager.click();
    showRecords();
});

document.getElementById('mute-btn').addEventListener('click', () => {
    SoundManager.isMuted = !SoundManager.isMuted;
    document.getElementById('mute-btn').textContent = SoundManager.isMuted ? '🔇' : '🔊';
    SoundManager.click();
    if (!SoundManager.isMuted) SoundManager.init();
});

document.getElementById('records-back-btn').addEventListener('click', () => {
    SoundManager.click();
    showScreen('menu-screen');
});

// Tutorial Listeners
document.getElementById('tutorial-btn').addEventListener('click', () => {
    SoundManager.click();
    const container = document.getElementById('video-container');
    // Usar video de "Regla de 3 Super Facil - Daniel Carreón"
    container.innerHTML = '<iframe width="100%" height="100%" src="./MAT_RAPIDA.mp4" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border:none;"></iframe>';
    showScreen('tutorial-screen');
});

document.getElementById('tutorial-back-btn').addEventListener('click', () => {
    SoundManager.click();
    const container = document.getElementById('video-container');
    container.innerHTML = ''; // Stop video
    showScreen('menu-screen');
});

// Update existing listeners for Sound
document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
        if (!btn.id.includes('mute')) SoundManager.init(); // Init audio context on any click
        SoundManager.click();
    });
});

// ========== Speech Manager (Text-to-Speech) ==========
const SpeechManager = {
    speech: null,
    voices: [],
    enabled: false,

    init() {
        this.speech = new SpeechSynthesisUtterance();
        this.speech.volume = 1;
        this.speech.rate = 1;
        this.speech.pitch = 1;
        this.speech.lang = 'es-ES';

        const loadVoices = () => {
            this.voices = window.speechSynthesis.getVoices();
            const spanishVoice = this.voices.find(v => v.lang.startsWith('es'));
            if (spanishVoice) this.speech.voice = spanishVoice;
            else if (this.voices.length > 0) this.speech.voice = this.voices[0];
        };

        if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
        loadVoices();
    },

    speak(text) {
        if (!this.enabled || !this.speech) return;
        try {
            this.speech.text = text;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(this.speech);
        } catch (e) {
            console.warn('Speech Error:', e);
        }
    },

    stop() {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }
};

// ========== Motivational Messages ==========
const MotivationalMessages = {
    excellent: [
        '🎉 ¡Excelente trabajo!',
        '🔥 ¡Eres imparable!',
        '⭐ ¡Perfecto! Sigue así',
        '💪 ¡Increíble rendimiento!',
        '🏆 ¡Eres un campeón!'
    ],
    good: [
        '👍 ¡Muy bien hecho!',
        '🙂 ¡Buen trabajo!',
        '✨ ¡Vas por buen camino!',
        '💫 ¡Sigue mejorando!',
        '👏 ¡Lo estás logrando!'
    ],
    average: [
        '📚 ¡Puedes mejorar!',
        '💭 ¡Practica un poco más!',
        '🎯 ¡Enfócate y lo lograrás!',
        '⚡ ¡No te rindas!',
        '🌱 ¡Cada error es aprendizaje!'
    ],
    poor: [
        '💪 ¡Ánimo, tú puedes!',
        '🔄 ¡Inténtalo de nuevo!',
        '📖 ¡Repasa el tema!',
        '🌟 ¡No te desanimes!',
        '🚀 ¡El éxito viene con práctica!'
    ],

    get(accuracy) {
        let category;
        if (accuracy >= 90) category = 'excellent';
        else if (accuracy >= 70) category = 'good';
        else if (accuracy >= 50) category = 'average';
        else category = 'poor';

        const messages = this[category];
        return messages[Math.floor(Math.random() * messages.length)];
    }
};

// ========== Radio Manager ==========
const RadioManager = {
    audio: null,
    currentStation: null,
    isPlaying: false,
    volume: 0.5,

    init() {
        this.audio = new Audio();
        this.audio.crossOrigin = 'anonymous';
        this.audio.volume = this.volume;
        this.populateStations();
    },

    populateStations() {
        const select = document.getElementById('radio-station-select');
        if (!select || typeof STATIONS === 'undefined') return;

        Object.keys(STATIONS).forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = STATIONS[key].name;
            select.appendChild(option);
        });
    },

    play(stationKey) {
        if (!stationKey || typeof STATIONS === 'undefined' || !STATIONS[stationKey]) return;

        const station = STATIONS[stationKey];
        const urls = station.urls;
        const randomUrl = urls[Math.floor(Math.random() * urls.length)];

        this.audio.src = randomUrl;
        this.audio.play().then(() => {
            this.isPlaying = true;
            this.currentStation = stationKey;
            document.getElementById('radio-play-btn').textContent = '⏸️ Pausar';
            document.getElementById('radio-btn').textContent = '🎵';
        }).catch(e => {
            console.warn('Radio playback failed:', e);
            // Try next URL
            const nextUrl = urls[(urls.indexOf(randomUrl) + 1) % urls.length];
            this.audio.src = nextUrl;
            this.audio.play().catch(() => { });
        });
    },

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        document.getElementById('radio-play-btn').textContent = '▶️ Reproducir';
        document.getElementById('radio-btn').textContent = '📻';
    },

    toggle() {
        if (this.isPlaying) {
            this.pause();
        } else {
            const select = document.getElementById('radio-station-select');
            if (select && select.value) {
                this.play(select.value);
            }
        }
    },

    setVolume(vol) {
        this.volume = vol / 100;
        if (this.audio) this.audio.volume = this.volume;
    }
};

// ========== Anti-Cheat System ==========
const AntiCheat = {
    enabled: true,
    warnings: 0,
    maxWarnings: 1,

    init() {
        document.addEventListener('visibilitychange', () => this.onVisibilityChange());
    },

    onVisibilityChange() {
        if (!this.enabled) return;
        if (document.hidden && document.getElementById('exercise-screen').classList.contains('active')) {
            this.warnings++;
            if (this.warnings === 1) {
                this.showWarning();
            } else if (this.warnings > this.maxWarnings) {
                this.triggerGameOver();
            }
        }
    },

    showWarning() {
        const overlay = document.createElement('div');
        overlay.className = 'pause-overlay active';
        overlay.id = 'anticheat-warning';
        overlay.style.backgroundColor = 'rgba(50, 0, 0, 0.95)';
        overlay.style.zIndex = '3000';
        overlay.innerHTML = `
            <div class="pause-icon" style="color: #f59e0b;">⚠️</div>
            <div class="pause-text" style="color: #f59e0b;">¡ADVERTENCIA!</div>
            <div class="pause-hint" style="color: white;">¡No cambies de pestaña! La próxima vez perderás el juego.</div>
            <button class="next-btn" id="anticheat-continue" style="margin-top: 1rem;">Entendido</button>
        `;
        document.body.appendChild(overlay);

        document.getElementById('anticheat-continue').addEventListener('click', () => {
            overlay.remove();
        });

        SoundManager.playTone(200, 'sawtooth', 0.5, 0.2);
    },

    triggerGameOver() {
        const warningEl = document.getElementById('anticheat-warning');
        if (warningEl) warningEl.remove();

        const overlay = document.createElement('div');
        overlay.className = 'pause-overlay active';
        overlay.style.backgroundColor = 'rgba(20, 0, 0, 0.95)';
        overlay.style.zIndex = '3000';
        overlay.innerHTML = `
            <div class="pause-icon" style="color: #ef4444;">🚫</div>
            <div class="pause-text" style="background: var(--error); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">DESCALIFICADO</div>
            <div class="pause-hint" style="color: white; margin-top: 1rem;">Cambiaste de pestaña durante el examen.</div>
            <button class="next-btn" id="anticheat-gameover" style="margin-top: 1rem;">Ver Resultados</button>
        `;
        document.body.appendChild(overlay);

        stopTimer();

        document.getElementById('anticheat-gameover').addEventListener('click', () => {
            overlay.remove();
            showFinalResults();
        });

        SoundManager.playTone(100, 'sawtooth', 0.5, 0.2);
        setTimeout(() => SoundManager.playTone(80, 'sawtooth', 0.5, 0.2), 400);
    },

    reset() {
        this.warnings = 0;
    },

    // Initialize cursor leave detection
    initCursorDetection() {
        document.addEventListener('mouseleave', () => this.onCursorLeave());
        window.addEventListener('blur', () => this.onWindowBlur());
    },

    onCursorLeave() {
        if (!this.enabled) return;
        if (document.getElementById('exercise-screen').classList.contains('active')) {
            this.warnings++;
            if (this.warnings === 1) {
                this.showWarning();
            } else if (this.warnings > this.maxWarnings) {
                this.triggerGameOver();
            }
        }
    },

    onWindowBlur() {
        // Window blur also triggers anti-cheat
        this.onCursorLeave();
    }
};

// ========== Config Settings with Persistence ==========
const ConfigSettings = {
    noiseEnabled: true,
    particlesEnabled: true,
    anticheatEnabled: true,
    wallpaperEnabled: true,
    powerupsEnabled: true,
    speechEnabled: false,
    radioStation: '',
    radioVolume: 50,
    radioAutoPlay: false,

    save() {
        const data = {
            noiseEnabled: this.noiseEnabled,
            particlesEnabled: this.particlesEnabled,
            anticheatEnabled: this.anticheatEnabled,
            wallpaperEnabled: this.wallpaperEnabled,
            powerupsEnabled: this.powerupsEnabled,
            speechEnabled: this.speechEnabled,
            radioStation: this.radioStation,
            radioVolume: this.radioVolume,
            radioAutoPlay: RadioManager.isPlaying
        };
        localStorage.setItem('matematica_config', JSON.stringify(data));
    },

    load() {
        const saved = localStorage.getItem('matematica_config');
        if (saved) {
            const data = JSON.parse(saved);
            this.noiseEnabled = data.noiseEnabled ?? true;
            this.particlesEnabled = data.particlesEnabled ?? true;
            this.anticheatEnabled = data.anticheatEnabled ?? true;
            this.wallpaperEnabled = data.wallpaperEnabled ?? true;
            this.powerupsEnabled = data.powerupsEnabled ?? true;
            this.speechEnabled = data.speechEnabled ?? false;
            this.radioStation = data.radioStation ?? '';
            this.radioVolume = data.radioVolume ?? 50;
            this.radioAutoPlay = data.radioAutoPlay ?? false;

            // Apply loaded settings
            this.applySettings();
        }
    },

    applySettings() {
        // Noise
        const noiseEl = document.querySelector('.noise-background');
        const noiseToggle = document.getElementById('noise-toggle');
        if (noiseEl) noiseEl.style.display = this.noiseEnabled ? 'block' : 'none';
        if (noiseToggle) noiseToggle.checked = this.noiseEnabled;

        // Particles
        const particlesEl = document.getElementById('particles');
        const particlesToggle = document.getElementById('particles-toggle');
        if (particlesEl) particlesEl.style.display = this.particlesEnabled ? 'block' : 'none';
        if (particlesToggle) particlesToggle.checked = this.particlesEnabled;

        // Anti-cheat
        const anticheatToggle = document.getElementById('anticheat-toggle');
        if (anticheatToggle) anticheatToggle.checked = this.anticheatEnabled;
        AntiCheat.enabled = this.anticheatEnabled;

        // Radio
        const stationSelect = document.getElementById('radio-station-select');
        const volumeSlider = document.getElementById('radio-volume');
        if (stationSelect && this.radioStation) stationSelect.value = this.radioStation;
        if (volumeSlider) volumeSlider.value = this.radioVolume;
        RadioManager.setVolume(this.radioVolume);

        // Wallpaper
        const wallpaperToggle = document.getElementById('wallpaper-toggle');
        if (wallpaperToggle) wallpaperToggle.checked = this.wallpaperEnabled;
        if (!this.wallpaperEnabled) {
            document.body.style.backgroundImage = 'none';
        }

        // Power-ups
        const powerupsToggle = document.getElementById('powerups-toggle');
        const powerupsBar = document.getElementById('powerups-bar');
        if (powerupsToggle) powerupsToggle.checked = this.powerupsEnabled;
        if (powerupsBar) powerupsBar.style.display = this.powerupsEnabled ? 'flex' : 'none';

        // Speech
        const speechToggle = document.getElementById('speech-toggle');
        if (speechToggle) speechToggle.checked = this.speechEnabled;
        SpeechManager.enabled = this.speechEnabled;

        // Auto-play radio if was playing
        if (this.radioAutoPlay && this.radioStation) {
            setTimeout(() => {
                if (stationSelect) stationSelect.value = this.radioStation;
                RadioManager.play(this.radioStation);
            }, 500);
        }
    },

    init() {
        // Noise toggle
        document.getElementById('noise-toggle').addEventListener('change', (e) => {
            this.noiseEnabled = e.target.checked;
            const noiseEl = document.querySelector('.noise-background');
            const texturedTextEl = document.querySelector('.textured-text');
            if (noiseEl) noiseEl.style.display = this.noiseEnabled ? 'block' : 'none';
            if (texturedTextEl) {
                texturedTextEl.style.color = this.noiseEnabled ? '' : 'white';
                texturedTextEl.style.backgroundImage = this.noiseEnabled ? '' : 'none';
            }
            this.save();
        });

        // Particles toggle
        document.getElementById('particles-toggle').addEventListener('change', (e) => {
            this.particlesEnabled = e.target.checked;
            const particlesEl = document.getElementById('particles');
            if (particlesEl) particlesEl.style.display = this.particlesEnabled ? 'block' : 'none';
            this.save();
        });

        // Anti-cheat toggle
        document.getElementById('anticheat-toggle').addEventListener('change', (e) => {
            this.anticheatEnabled = e.target.checked;
            AntiCheat.enabled = e.target.checked;
            this.save();
        });

        // Radio volume
        document.getElementById('radio-volume').addEventListener('input', (e) => {
            this.radioVolume = parseInt(e.target.value);
            RadioManager.setVolume(this.radioVolume);
            this.save();
        });

        // Radio play button
        document.getElementById('radio-play-btn').addEventListener('click', () => {
            RadioManager.toggle();
            this.save();
        });

        // Radio station select
        document.getElementById('radio-station-select').addEventListener('change', (e) => {
            this.radioStation = e.target.value;
            if (RadioManager.isPlaying) {
                RadioManager.pause();
                if (e.target.value) RadioManager.play(e.target.value);
            }
            this.save();
        });

        // Wallpaper toggle
        document.getElementById('wallpaper-toggle').addEventListener('change', (e) => {
            this.wallpaperEnabled = e.target.checked;
            if (this.wallpaperEnabled) {
                // Re-apply background from background.js
                if (typeof fondogod !== 'undefined') {
                    const número = Math.floor(Math.random() * fondogod.length);
                    document.body.style.backgroundImage = `linear-gradient(rgba(29, 8, 65, 0.6), rgba(4, 51, 59, 0.6)), url('${fondogod[número]}')`;
                }
            } else {
                document.body.style.backgroundImage = 'none';
            }
            this.save();
        });

        // Power-ups toggle
        document.getElementById('powerups-toggle').addEventListener('change', (e) => {
            this.powerupsEnabled = e.target.checked;
            const powerupsBar = document.getElementById('powerups-bar');
            if (powerupsBar) powerupsBar.style.display = this.powerupsEnabled ? 'flex' : 'none';
            this.save();
        });

        // Speech toggle
        document.getElementById('speech-toggle').addEventListener('change', (e) => {
            this.speechEnabled = e.target.checked;
            SpeechManager.enabled = this.speechEnabled;
            this.save();
        });

        // Load saved settings
        this.load();
    }
};

// ========== Power-Up Manager ==========
const PowerUpManager = {
    types: {
        x2: { name: 'x2 Puntos', icon: '💎', desc: 'Duplica los puntos de la siguiente respuesta correcta' },
        shield: { name: 'Escudo', icon: '🛡️', desc: 'Protege tu racha si fallas' },
        freeze: { name: 'Congelar', icon: '❄️', desc: 'Detiene el cronómetro' },
        '5050': { name: '50/50', icon: '✂️', desc: 'Elimina 2 opciones incorrectas' },
        retry: { name: 'Segunda Oportunidad', icon: '🔄', desc: 'Puedes reintentar si fallas' }
    },

    init() {
        // Attach click handlers to power-up buttons
        document.querySelectorAll('.powerup-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.powerup;
                this.use(type);
            });
        });
        this.updateUI();
    },

    award(type) {
        if (!ConfigSettings.powerupsEnabled) return;
        GameState.powerups[type]++;
        this.updateUI();
        this.showNotification(type);
        Persistence.save();
    },

    awardRandom() {
        if (!ConfigSettings.powerupsEnabled) return;
        const types = Object.keys(this.types);
        const randomType = types[Math.floor(Math.random() * types.length)];
        this.award(randomType);
    },

    use(type) {
        if (!ConfigSettings.powerupsEnabled) return;
        if (GameState.powerups[type] <= 0) return;

        // Deactivate any current power-up first
        if (GameState.activePowerup) {
            document.getElementById(`powerup-${GameState.activePowerup}`)?.classList.remove('active');
        }

        GameState.powerups[type]--;
        GameState.activePowerup = type;

        // Apply immediate effects
        switch (type) {
            case 'freeze':
                // Freeze timer
                clearInterval(GameState.timerInterval);
                GameState.timerInterval = null;
                document.getElementById('timer-display').classList.add('frozen');
                setTimeout(() => {
                    GameState.activePowerup = null;
                }, 500);
                break;
            case '5050':
                this.apply5050();
                GameState.activePowerup = null;
                break;
            case 'retry':
                GameState.retryAvailable = true;
                break;
            // x2 and shield are applied in submitAnswer
        }

        this.updateUI();
        SoundManager.playTone(800, 'sine', 0.2, 0.1);
        Persistence.save();
    },

    apply5050() {
        if (GameState.mode !== 'choice') return;

        const exercise = GameState.chapterExercises[GameState.currentExercise];
        const correctAnswer = exercise.answer;
        const buttons = document.querySelectorAll('.choice-btn');

        let eliminated = 0;
        buttons.forEach(btn => {
            const value = btn.querySelector('.choice-value').textContent;
            if (value !== correctAnswer && eliminated < 2) {
                btn.style.opacity = '0.3';
                btn.disabled = true;
                eliminated++;
            }
        });
    },

    checkStreakReward() {
        if (!ConfigSettings.powerupsEnabled) return;
        // Award random power-up every 3 correct answers
        if (GameState.streak > 0 && GameState.streak % 3 === 0) {
            this.awardRandom();
        }
    },

    checkRandomDrop() {
        if (!ConfigSettings.powerupsEnabled) return;
        // 15% chance of random power-up after correct answer
        if (Math.random() < 0.15) {
            this.awardRandom();
        }
    },

    awardLevelUp() {
        if (!ConfigSettings.powerupsEnabled) return;
        // Award 2 random power-ups on level up
        this.awardRandom();
        setTimeout(() => this.awardRandom(), 600);
    },

    updateUI() {
        Object.keys(this.types).forEach(type => {
            const countEl = document.getElementById(`powerup-${type}-count`);
            const btn = document.getElementById(`powerup-${type}`);
            if (countEl) {
                const count = GameState.powerups[type] || 0;
                countEl.textContent = count;
                countEl.classList.toggle('empty', count === 0);
            }
            if (btn) {
                btn.disabled = (GameState.powerups[type] || 0) <= 0;
                btn.classList.toggle('active', GameState.activePowerup === type);
            }
        });
    },

    showNotification(type) {
        const info = this.types[type];
        const notif = document.createElement('div');
        notif.className = 'powerup-notification';
        notif.innerHTML = `
            <span class="powerup-icon">${info.icon}</span>
            <div class="powerup-name">¡${info.name}!</div>
        `;
        document.body.appendChild(notif);

        SoundManager.playTone(523.25, 'sine', 0.15, 0.1);
        setTimeout(() => SoundManager.playTone(659.25, 'sine', 0.15, 0.1), 100);
        setTimeout(() => SoundManager.playTone(783.99, 'sine', 0.2, 0.1), 200);

        setTimeout(() => notif.remove(), 1500);
    },

    reset() {
        GameState.activePowerup = null;
        GameState.retryAvailable = false;
        GameState.streak = 0;
    }
};

// ========== Config Screen Listeners ==========
document.getElementById('config-btn').addEventListener('click', () => {
    SoundManager.click();
    showScreen('config-screen');
});

document.getElementById('config-back-btn').addEventListener('click', () => {
    SoundManager.click();
    showScreen('menu-screen');
});

document.getElementById('radio-btn').addEventListener('click', () => {
    SoundManager.click();
    RadioManager.toggle();
});

// ========== Initialize Systems ==========
document.addEventListener('DOMContentLoaded', () => {
    // Initialize NoiseRenderer
    if (typeof NoiseRenderer !== 'undefined') {
        NoiseRenderer.init();
    }

    RadioManager.init();
    AntiCheat.init();
    AntiCheat.initCursorDetection();
    ConfigSettings.init();
    PowerUpManager.init();
    updateExtremeModeLock();
});

// Reset anti-cheat and power-ups on game start (modify startGame)
const originalStartGame = startGame;
startGame = function () {
    AntiCheat.reset();
    PowerUpManager.reset();
    // Show floating pause button
    document.getElementById('floating-pause-btn').classList.remove('hidden');
    originalStartGame();
};

// ========== Streak UI Update ==========
function updateStreakUI() {
    const streakDisplay = document.getElementById('streak-display');
    const streakCount = document.getElementById('streak-count');

    if (GameState.streak >= 2) {
        streakDisplay.classList.remove('hidden');
        streakCount.textContent = GameState.streak;
    } else {
        streakDisplay.classList.add('hidden');
    }

    // Update best streak
    if (GameState.streak > GameState.bestStreak) {
        GameState.bestStreak = GameState.streak;
        Persistence.save();
    }
}

// ========== Pause Button Handlers ==========
document.getElementById('floating-pause-btn').addEventListener('click', () => {
    togglePause();
});

document.getElementById('pause-continue-btn').addEventListener('click', () => {
    togglePause(); // Resume game
});

document.getElementById('pause-menu-btn').addEventListener('click', () => {
    // Stop all timers and cleanup
    stopAllTimers();
    showScreen('menu-screen');
});

document.getElementById('pause-exit-btn').addEventListener('click', () => {
    // Stop all timers and show results
    stopAllTimers();
    showFinalResults();
});

// ========== Speak Question on Show ==========
const originalShowExercise = showExercise;
showExercise = function () {
    originalShowExercise();

    if (SpeechManager.enabled) {
        // Read from NoiseRenderer canvas data attribute
        const canvas = document.getElementById('noise-canvas');
        let questionText = canvas ? canvas.dataset.text : '';

        const replacements = {
            "−": "menos",
            "²": " al cuadrado", // Importante: poner los largos primero
            "³": " al cubo",
            "⁴": " a la cuarta",
            "⁵": " a la quinta",
            "⁶": " a la sexta",
            "⁷": " a la séptima",
            "⁸": " a la octava",
            "⁹": " a la novena",
            "¹⁰": " a la décima",
            "×": "por",
            "÷": "dividido por",
            "+": "más",
            "=": "es igual a",
            "√": "la raíz cuadrada de",
            "Sen": "seno de ",
            "Cos": "coseno de",
            "Tan": "tangente de",
            "log₂": "logaritmo en base 2 de ",
            "log₃": "logaritmo en base 3 de ",
            "log₄": "logaritmo en base 4 de ",
            "log₅": "logaritmo en base 5 de ",
            "log₆": "logaritmo en base 6 de ",
            "log₇": "logaritmo en base 7 de ",
            "log₈": "logaritmo en base 8 de ",
            "log₉": "logaritmo en base 9 de ",
            "log₁₀": "logaritmo en base 10 de ",
            "Ln": "logaritmo natural de",
            "≈": " es aproximadamente",
            "e": "e",
            ",": " y ",
            "≡": "como",
            ":": "es a"
        };

        // Reemplaza todos los símbolos usando el mapa anterior
        Object.keys(replacements).forEach(symbol => {
            questionText = questionText.split(symbol).join(replacements[symbol]);
        });
        setTimeout(() => SpeechManager.speak(questionText), 300);
    }
};

// Initialize SpeechManager
SpeechManager.init();

// ========== Practice Mode Logic (Global) ==========

function populatePracticeGrid() {
    const grid = document.getElementById('practice-grid');
    if (!grid) return;
    grid.innerHTML = '';

    GameState.chapters.forEach(chapter => {
        const card = document.createElement('div');
        card.className = 'practice-card';
        card.innerHTML = `
            <div class="practice-icon">${chapter.icon}</div>
            <div class="practice-name">${chapter.id}. ${chapter.name}</div>
        `;
        card.addEventListener('click', () => startPractice(chapter.id));
        grid.appendChild(card);
    });
}

function showPracticeScreen() {
    // Stop any running timers when returning to practice screen
    stopAllTimers();
    populatePracticeGrid();
    showScreen('practice-screen');
}

function startPractice(chapterId) {
    GameState.isPracticeMode = true;
    GameState.lives = 3;

    // Setup specific chapter
    const chapter = GameState.chapters.find(c => c.id === chapterId);
    GameState.playableChapters = [chapter];
    GameState.selectedChapters = [chapterId];

    // Standard Init
    GameState.currentChapter = 0;
    GameState.totalCorrect = 0;
    GameState.totalExercises = 0;
    GameState.allResults = [];
    GameState.totalStartTime = Date.now();

    startChapter();
}

// Practice Mode Listeners (attached if elements exist)
const practiceBtn = document.getElementById('practice-mode-menu-btn');
if (practiceBtn) {
    practiceBtn.addEventListener('click', () => {
        SoundManager.click();
        showPracticeScreen();
    });
} else {
    // Fallback: Try to attach later or delegate
    document.addEventListener('click', (e) => {
        if (e.target.id === 'practice-mode-menu-btn' || e.target.closest('#practice-mode-menu-btn')) {
            SoundManager.click();
            showPracticeScreen();
        }
    });
}

const practiceBackBtn = document.getElementById('practice-back-btn');
if (practiceBackBtn) {
    practiceBackBtn.addEventListener('click', () => {
        SoundManager.click();
        showScreen('menu-screen');
    });
} else {
    document.addEventListener('click', (e) => {
        if (e.target.id === 'practice-back-btn' || e.target.closest('#practice-back-btn')) {
            SoundManager.click();
            showScreen('menu-screen');
        }
    });
}

// Ensure isPracticeMode is valid in GameState
if (typeof GameState.isPracticeMode === 'undefined') {
    GameState.isPracticeMode = false;
}

// Hook original startGame to reset practice mode
// We need to be careful not to double hook if we run this script multiple times.
// But this script is loaded once.
// Note: We already hooked startGame for anti-cheat reset at line 2320.
// We can hook it again.
const originalStartGameForPractice = startGame;
startGame = function () {
    GameState.isPracticeMode = false; // Regular game reset
    originalStartGameForPractice();
};