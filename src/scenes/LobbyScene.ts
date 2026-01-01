import Phaser from 'phaser';
import { GameData } from '../managers/GameData';

export default class LobbyScene extends Phaser.Scene {
    constructor() {
        super('LobbyScene');
    }

    create() {
        const { width, height } = this.scale;
        const data = GameData.getInstance();

        // 1. Background
        if (!this.textures.exists('lobby_bg')) {
            const canvas = this.textures.createCanvas('lobby_bg', width, height);
            if (canvas) {
                const ctx = canvas.getContext();
                const grd = ctx.createLinearGradient(0, 0, 0, height);
                grd.addColorStop(0, '#000033');
                grd.addColorStop(1, '#330033');
                ctx.fillStyle = grd;
                ctx.fillRect(0, 0, width, height);
                ctx.fillStyle = '#ffffff';
                for (let i = 0; i < 100; i++) {
                    const x = Math.random() * width;
                    const y = Math.random() * height;
                    const r = Math.random() * 2;
                    ctx.beginPath();
                    ctx.arc(x, y, r, 0, Math.PI * 2);
                    ctx.fill();
                }
                canvas.refresh();
            }
        }
        this.add.image(width * 0.5, height * 0.5, 'lobby_bg').setOrigin(0.5);

        // 2. Top Bar (Status)
        const topBarY = 60;
        // Story Card Icon
        this.add.rectangle(60, topBarY, 40, 50, 0xffffff);
        this.add.text(60, topBarY, 'Card', { fontSize: '12px', color: '#000' }).setOrigin(0.5);
        this.add.text(100, topBarY, `${data.unlockedCardCount}`, { fontSize: '24px', color: '#fff' }).setOrigin(0, 0.5);

        // Stage Icon
        this.add.rectangle(width - 100, topBarY, 40, 40, 0xff0000);
        this.add.text(width - 100, topBarY, 'Stg', { fontSize: '12px', color: '#fff' }).setOrigin(0.5);
        this.add.text(width - 60, topBarY, `Lv.${data.currentStage}`, { fontSize: '24px', color: '#fff' }).setOrigin(0, 0.5);

        // 3. Main Content (Title & Start)
        // Title
        this.add.text(width * 0.5, height * 0.4, 'Jump Game', {
            fontSize: '80px',
            color: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Start Button (Main Action)
        const btnW = 300;
        const btnH = 80;
        const btnY = height * 0.6;
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x00ff00, 1.0);
        btnBg.fillRoundedRect(width/2 - btnW/2, btnY - btnH/2, btnW, btnH, 20);
        this.add.text(width * 0.5, btnY, 'Start Game', {
            fontSize: '40px', color: '#000000', fontStyle: 'bold'
        }).setOrigin(0.5);

        const startHit = this.add.rectangle(width * 0.5, btnY, btnW, btnH, 0x000000, 0).setInteractive();
        startHit.on('pointerdown', () => this.scene.start('GameScene'));

        // 4. Bottom Navigation Bar
        const navH = 100;
        const navY = height - navH / 2;
        const navW = width / 3;

        // Background for Nav
        this.add.rectangle(width/2, height - navH/2, width, navH, 0x222222);

        // Story Button (Left)
        this.createNavButton(navW * 0.5, navY, 'Story', () => this.scene.start('StoryScene'));

        // Home Button (Center - Active)
        this.createNavButton(navW * 1.5, navY, 'Home', () => {}); // Already here

        // Achievement Button (Right)
        this.createNavButton(navW * 2.5, navY, 'Achieve', () => this.scene.start('AchievementScene'));
    }

    private createNavButton(x: number, y: number, text: string, onClick: () => void) {
        const btn = this.add.rectangle(x, y, 100, 80, 0x444444).setInteractive();
        this.add.text(x, y, text, { fontSize: '20px', color: '#fff' }).setOrigin(0.5);
        btn.on('pointerdown', onClick);
    }
}
