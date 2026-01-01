import Phaser from 'phaser';
import { GameData } from '../managers/GameData';

export default class LobbyScene extends Phaser.Scene {
    constructor() {
        super('LobbyScene');
    }

    create() {
        const { width, height } = this.scale;
        const data = GameData.getInstance();

        // 1. Background (Soft Gradient)
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x2c3e50, 0x2c3e50, 0x4ca1af, 0x4ca1af, 1);
        bg.fillRect(0, 0, width, height);

        // Add some floating bubbles/circles for "Cute" effect
        for(let i=0; i<20; i++) {
             const x = Phaser.Math.Between(0, width);
             const y = Phaser.Math.Between(0, height);
             const r = Phaser.Math.Between(20, 100);
             const alpha = Phaser.Math.FloatBetween(0.05, 0.15);
             const circle = this.add.circle(x, y, r, 0xffffff, alpha);
             this.tweens.add({
                 targets: circle,
                 y: y - 100,
                 alpha: 0,
                 duration: Phaser.Math.Between(3000, 8000),
                 repeat: -1,
                 yoyo: true
             });
        }

        // 2. Top Bar (Status Panel)
        const topBarY = 60;
        const topBarBg = this.add.graphics();
        topBarBg.fillStyle(0x000000, 0.3);
        topBarBg.fillRoundedRect(20, 20, width - 40, 80, 20);

        // Story Card Icon (Left)
        this.add.circle(60, topBarY, 25, 0xffffff); // Icon bg
        this.add.text(60, topBarY, '🃏', { fontSize: '24px' }).setOrigin(0.5); // Emoji as icon
        this.add.text(100, topBarY, `${data.unlockedCardCount}`, { fontFamily: 'Fredoka One', fontSize: '32px', color: '#fff' }).setOrigin(0, 0.5);

        // Stage Icon (Right)
        this.add.text(width - 120, topBarY, `Stage ${data.currentStage}`, { fontFamily: 'Fredoka One', fontSize: '28px', color: '#fff' }).setOrigin(1, 0.5);
        this.add.circle(width - 60, topBarY, 25, 0xff6b6b);
        this.add.text(width - 60, topBarY, '★', { fontSize: '24px', color:'#fff' }).setOrigin(0.5);

        // 3. Main Content (Title & Start)
        // Title
        const titleText = this.add.text(width * 0.5, height * 0.4, 'JUMP\nGAME', {
            fontFamily: 'Fredoka One',
            fontSize: '100px',
            color: '#feca57',
            align: 'center',
            stroke: '#ff9f43',
            strokeThickness: 10
        }).setOrigin(0.5);

        this.tweens.add({
            targets: titleText,
            scaleX: 1.05, scaleY: 1.05,
            duration: 800, yoyo: true, repeat: -1
        });

        // Start Button (Main Action)
        const btnW = 320;
        const btnH = 90;
        const btnY = height * 0.65;

        const startBtn = this.add.container(width/2, btnY);
        const startBg = this.add.graphics();
        startBg.fillStyle(0x1dd1a1, 1.0); // Mint
        startBg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 45); // Pill shape
        startBg.lineStyle(4, 0xffffff, 1);
        startBg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 45);

        const startText = this.add.text(0, 0, 'PLAY NOW', {
            fontFamily: 'Fredoka One', fontSize: '40px', color: '#ffffff'
        }).setOrigin(0.5);

        startBtn.add([startBg, startText]);
        startBtn.setSize(btnW, btnH);
        // Increase Hit Area (padding +40px)
        const hitW = btnW + 80;
        const hitH = btnH + 60;
        startBtn.setInteractive(new Phaser.Geom.Rectangle(-hitW/2, -hitH/2, hitW, hitH), Phaser.Geom.Rectangle.Contains);

        startBtn.on('pointerdown', () => {
             this.tweens.add({ targets: startBtn, scaleX: 0.9, scaleY: 0.9, duration: 100, yoyo: true, onComplete: () => this.scene.start('GameScene') });
        });

        // 4. Bottom Navigation Bar
        const navH = 120;
        const navW = width / 3;

        // Background for Nav
        const navBg = this.add.graphics();
        navBg.fillStyle(0xffffff, 0.9);
        navBg.fillRoundedRect(20, height - navH - 20, width - 40, navH, 30);
        navBg.lineStyle(2, 0xbdc3c7, 0.5);
        navBg.strokeRoundedRect(20, height - navH - 20, width - 40, navH, 30);

        // Story Button (Left)
        this.createNavButton(navW * 0.5 + 10, height - navH/2 - 20, 'Story', '📖', () => this.scene.start('StoryScene'));

        // Home Button (Center - Active)
        this.createNavButton(navW * 1.5, height - navH/2 - 20, 'Home', '🏠', () => {}, true);

        // Achievement Button (Right)
        this.createNavButton(navW * 2.5 - 10, height - navH/2 - 20, 'Tasks', '🏆', () => this.scene.start('AchievementScene'));
    }

    private createNavButton(x: number, y: number, text: string, icon: string, onClick: () => void, isActive: boolean = false) {
        const btn = this.add.container(x, y);

        if (isActive) {
            const activeBg = this.add.graphics();
            activeBg.fillStyle(0x54a0ff, 0.2);
            activeBg.fillCircle(0, -5, 40);
            btn.add(activeBg);
        }

        const iconText = this.add.text(0, -15, icon, { fontSize: '40px' }).setOrigin(0.5);
        const labelText = this.add.text(0, 25, text, {
            fontFamily: 'Nunito', fontSize: '18px', color: isActive ? '#54a0ff' : '#8395a7', fontStyle: 'bold'
        }).setOrigin(0.5);

        btn.add([iconText, labelText]);
        btn.setSize(100, 100);
        // Larger Hit Area for Nav Buttons
        btn.setInteractive(new Phaser.Geom.Rectangle(-70, -70, 140, 140), Phaser.Geom.Rectangle.Contains);
        btn.on('pointerdown', onClick);
    }
}
