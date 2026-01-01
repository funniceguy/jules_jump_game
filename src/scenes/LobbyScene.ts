import Phaser from 'phaser';

export default class LobbyScene extends Phaser.Scene {
    constructor() {
        super('LobbyScene');
    }

    create() {
        const { width, height } = this.scale;

        // Title
        this.add.text(width * 0.5, height * 0.3, 'Jump Game', {
            fontSize: '64px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Start Button
        const startButton = this.add.text(width * 0.5, height * 0.6, 'Start Game', {
            fontSize: '32px',
            color: '#00ff00',
            backgroundColor: '#333333',
            padding: { x: 10, y: 5 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            this.scene.start('GameScene');
        });

        // Hover effect
        startButton.on('pointerover', () => {
            startButton.setStyle({ fill: '#ff0' });
        });

        startButton.on('pointerout', () => {
            startButton.setStyle({ fill: '#0f0' });
        });
    }
}
