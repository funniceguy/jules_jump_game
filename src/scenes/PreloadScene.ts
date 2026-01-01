import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    preload() {
        // Loading bar (optional, but good for feedback)
        const { width, height } = this.scale;
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRoundedRect(width/2 - 160, height/2 - 25, 320, 50, 10);

        this.load.on('progress', (value: number) => {
            progressBar.clear();
            progressBar.fillStyle(0x00ff00, 1);
            progressBar.fillRoundedRect(width/2 - 150, height/2 - 15, 300 * value, 30, 10);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            this.scene.start('LobbyScene');
        });

        // Simulate load time to allow texture generation
        // Real assets would go here: this.load.image(...)
        // We will generate textures in create() or just before start
    }

    create() {
        this.createTextures();
        this.scene.start('LobbyScene'); // Go to Lobby immediately after generation
    }

    private createTextures() {
        // --- Platforms ---
        // Wood (Standard) - Now "Biscuit" style
        this.createPlatformTexture('platform_wood', 0xDAA520, 0x8B4513);
        // Rubber (Bouncy) - "Jelly" style
        this.createPlatformTexture('platform_rubber', 0xFF69B4, 0xC71585, true);
        // Electric (Zap) - "Tech" style
        this.createPlatformTexture('platform_electric', 0x2F4F4F, 0x00FFFF, false, 'electric');
        // Plasma (Flight) - "Neon" style
        this.createPlatformTexture('platform_plasma', 0x4B0082, 0xFF00FF, false, 'plasma');

        // --- Items ---
        this.createItemTexture('item_fish', 0x4682B4, 'fish');
        this.createItemTexture('item_milk', 0xFFFFFF, 'box');
        this.createItemTexture('item_cookie', 0xD2691E, 'circle');
        this.createItemTexture('item_flower', 0xFF69B4, 'flower');
        this.createItemTexture('item_gem', 0x00FFFF, 'gem');

        // --- Player (Cute Cat) ---
        this.createPlayerTexture();

        // --- UI Icons (Optional) ---
        // Could generate simple icons here
    }

    private createPlatformTexture(key: string, color: number, stroke: number, rounded: boolean = false, type: string = 'normal') {
        const w = 100;
        const h = 32;
        const g = this.make.graphics({x:0, y:0});

        g.fillStyle(color, 1.0);
        if (rounded) {
            g.fillRoundedRect(0, 0, w, h, 16);
            g.lineStyle(4, stroke, 1.0);
            g.strokeRoundedRect(0, 0, w, h, 16);
        } else {
            g.fillRoundedRect(0, 0, w, h, 8); // Slight rounding for all
            g.lineStyle(4, stroke, 1.0);
            g.strokeRoundedRect(0, 0, w, h, 8);
        }

        if (type === 'electric') {
            g.fillStyle(0xFFFF00, 0.8);
            g.fillTriangle(20, 5, 40, 25, 60, 5);
            g.fillTriangle(60, 25, 80, 5, 50, 20); // Zaps
        } else if (type === 'plasma') {
            g.lineStyle(2, 0xFFFFFF, 0.8);
            g.beginPath();
            g.moveTo(10, 16); g.lineTo(90, 16);
            g.strokePath();
        } else if (key === 'platform_wood') {
             // Wood grain
             g.lineStyle(2, stroke, 0.5);
             g.beginPath();
             g.moveTo(10, 10); g.lineTo(30, 10);
             g.moveTo(50, 20); g.lineTo(90, 20);
             g.strokePath();
        }

        g.generateTexture(key, w, h);
    }

    private createItemTexture(key: string, color: number, shape: string) {
        const g = this.make.graphics({x:0, y:0});
        g.fillStyle(color, 1.0);
        g.lineStyle(2, 0x000000, 0.5);

        if (shape === 'fish') {
             g.fillEllipse(20, 20, 30, 15);
             g.fillStyle(0x000000); g.fillCircle(30, 18, 2); // Eye
        } else if (shape === 'box') {
             g.fillRoundedRect(10, 10, 20, 25, 4);
             g.fillStyle(0xADD8E6); g.fillRect(12, 12, 16, 5); // Label
        } else if (shape === 'circle') {
             g.fillCircle(20, 20, 15);
             g.fillStyle(0x8B4513); g.fillCircle(15, 15, 2); g.fillCircle(25, 22, 2); g.fillCircle(18, 25, 2); // Chips
        } else if (shape === 'flower') {
            g.fillStyle(0xFF69B4);
            g.fillCircle(20, 10, 8); g.fillCircle(30, 20, 8);
            g.fillCircle(20, 30, 8); g.fillCircle(10, 20, 8);
            g.fillStyle(0xFFFF00); g.fillCircle(20, 20, 6);
        } else if (shape === 'gem') {
            g.fillTriangle(20, 5, 35, 15, 5, 15);
            g.fillTriangle(5, 15, 35, 15, 20, 35);
        }
        g.generateTexture(key, 40, 40);
    }

    private createPlayerTexture() {
        // Cute Cat
        // Side view
        const w = 60; const h = 60;
        const g = this.make.graphics({x:0, y:0});

        // Body (Orange)
        g.fillStyle(0xFFA500, 1);
        g.fillRoundedRect(10, 20, 40, 30, 10);

        // Head
        g.fillCircle(45, 20, 15);

        // Ears
        g.fillTriangle(35, 10, 45, 5, 55, 10); // Left
        g.fillTriangle(45, 5, 55, 10, 55, 0); // Right (approx)

        // Tail
        g.lineStyle(5, 0xFFA500, 1);
        g.beginPath();
        g.moveTo(10, 40);
        g.lineTo(5, 35);
        g.lineTo(5, 20);
        g.strokePath();

        // Face
        g.fillStyle(0xFFFFFF); g.fillCircle(40, 18, 4); g.fillCircle(50, 18, 4); // Eyes
        g.fillStyle(0x000000); g.fillCircle(40, 18, 1.5); g.fillCircle(50, 18, 1.5); // Pupils
        g.fillStyle(0xFFC0CB); g.fillTriangle(43, 22, 47, 22, 45, 25); // Nose

        g.generateTexture('player_side', w, h);
        g.generateTexture('player_jump', w, h); // Use same for now
    }
}
