import Phaser from 'phaser';

export default class LobbyScene extends Phaser.Scene {
    constructor() {
        super('LobbyScene');
    }

    create() {
        const { width, height } = this.scale;

        // Background (Optional, just black for now)
        this.add.rectangle(width/2, height/2, width, height, 0x000000);

        // Title
        const titleText = this.add.text(width * 0.5, height * 0.3, 'Jump Game', {
            fontSize: '80px',
            color: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            align: 'center'
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
