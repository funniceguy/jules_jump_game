import Phaser from 'phaser';

export default class LobbyScene extends Phaser.Scene {
    constructor() {
        super('LobbyScene');
    }

    create() {
        const { width, height } = this.scale;

        // Generate a background texture if it doesn't exist
        if (!this.textures.exists('lobby_bg')) {
            const canvas = this.textures.createCanvas('lobby_bg', width, height);
            const ctx = canvas.getContext();

            // Gradient
            const grd = ctx.createLinearGradient(0, 0, 0, height);
            grd.addColorStop(0, '#000033');
            grd.addColorStop(1, '#330033');

            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, width, height);

            // Stars
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

        // Add Background Image - Centered
        this.add.image(width * 0.5, height * 0.5, 'lobby_bg').setOrigin(0.5);

        // Title
        const titleText = this.add.text(width * 0.5, height * 0.3, 'Jump Game', {
            fontSize: '80px',
            color: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Start Button Container
        const btnW = 300;
        const btnH = 80;
        const btnY = height * 0.6;

        // Button Background (Graphics for centered rect)
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x00ff00, 1.0);
        btnBg.fillRoundedRect(width/2 - btnW/2, btnY - btnH/2, btnW, btnH, 20);

        // Button Text
        const btnText = this.add.text(width * 0.5, btnY, 'Start Game', {
            fontSize: '40px',
            color: '#000000',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            align: 'center'
        }).setOrigin(0.5);

        // Interactive Zone
        const hitArea = this.add.rectangle(width * 0.5, btnY, btnW, btnH, 0x000000, 0)
            .setInteractive({ useHandCursor: true });

        // Interaction
        hitArea.on('pointerdown', () => {
            this.scene.start('GameScene');
        });

        hitArea.on('pointerover', () => {
            btnBg.clear();
            btnBg.fillStyle(0xccffcc, 1.0); // Lighter
            btnBg.fillRoundedRect(width/2 - btnW/2, btnY - btnH/2, btnW, btnH, 20);
        });

        hitArea.on('pointerout', () => {
            btnBg.clear();
            btnBg.fillStyle(0x00ff00, 1.0); // Original
            btnBg.fillRoundedRect(width/2 - btnW/2, btnY - btnH/2, btnW, btnH, 20);
        });
    }
}
