// ========== Noise Renderer Module ==========
// Canvas-based animated noise with dynamic text (anti-screenshot)

const NoiseRenderer = {
    canvas: null,
    ctx: null,
    noiseBuffer: null,
    nbCtx: null,
    animationId: null,
    offsetY: 0,
    speed: 2,
    direction: 1,
    frameCount: 0,
    isRunning: false,

    // Internal resolution (pixelated look)
    w: 300,
    h: 45,

    init() {
        this.canvas = document.getElementById('noise-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d', { alpha: false });

        // Set internal resolution
        this.canvas.width = this.w;
        this.canvas.height = this.h;

        // Create noise buffer
        this.noiseBuffer = document.createElement('canvas');
        this.noiseBuffer.width = this.w;
        this.noiseBuffer.height = this.h;
        this.nbCtx = this.noiseBuffer.getContext('2d');

        this.generateNoiseTexture();
    },

    generateNoiseTexture() {
        const imgData = this.nbCtx.createImageData(this.w, this.h);

        for (let i = 0; i < imgData.data.length; i += 4) {
            const val = Math.random() > 0.5 ? 255 : 0;
            imgData.data[i] = val;
            imgData.data[i + 1] = val;
            imgData.data[i + 2] = val;
            imgData.data[i + 3] = 255;
        }

        this.nbCtx.putImageData(imgData, 0, 0);
    },

    setText(text) {
        if (this.canvas) {
            this.canvas.dataset.text = text;
        }
    },

    start() {
        if (this.isRunning || !this.canvas) return;
        this.isRunning = true;
        this.animate();
    },

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    },

    animate() {
        if (!this.isRunning) return;

        this.frameCount++;
        if (this.frameCount >= 180) {
            this.direction *= -1;
            this.frameCount = 0;
        }
        this.offsetY += this.speed * this.direction;

        // Clear and draw scrolling noise background
        const scroll = this.offsetY % this.h;
        this.ctx.drawImage(this.noiseBuffer, 0, scroll);
        this.ctx.drawImage(this.noiseBuffer, 0, scroll - this.h);
        this.ctx.drawImage(this.noiseBuffer, 0, scroll + this.h);

        // Draw the text with noise texture fill
        this.ctx.save();

        const currentText = this.canvas.dataset.text || "";

        // Font settings
        this.ctx.font = "900 32px 'Inter', sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";

        // Shadow for visibility
        this.ctx.shadowColor = "rgba(0, 0, 0, 1)";
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        this.ctx.shadowBlur = 4;

        // Use noise pattern for text fill
        const pattern = this.ctx.createPattern(this.noiseBuffer, 'repeat');
        this.ctx.fillStyle = pattern;

        this.ctx.fillText(currentText, this.w / 2, this.h / 2);
        this.ctx.restore();

        this.animationId = requestAnimationFrame(() => this.animate());
    },

    // Regenerate noise periodically for extra anti-screenshot protection
    refreshNoise() {
        this.generateNoiseTexture();
    }
};

// Export to global scope
window.NoiseRenderer = NoiseRenderer;
