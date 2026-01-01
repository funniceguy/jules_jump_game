import Phaser from 'phaser';
import { GameData } from '../managers/GameData';

export default class StoryScene extends Phaser.Scene {
    constructor() {
        super('StoryScene');
    }

    create() {
        const { width, height } = this.scale;
        const data = GameData.getInstance();

        // Background
        this.add.rectangle(width/2, height/2, width, height, 0x111111);

        // Title
        this.add.text(width/2, 60, 'Story Cards', { fontSize: '40px', color: '#fff' }).setOrigin(0.5);

        // Grid
        const cols = 3;
        const startX = 100;
        const startY = 150;
        const paddingX = 200;
        const paddingY = 250;

        data.storyCards.forEach((card, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + col * paddingX;
            const y = startY + row * paddingY;

            if (y > height - 200) return; // Cut off for now

            const cardBg = this.add.rectangle(x, y, 160, 220, card.isUnlocked ? 0xffffff : 0x444444)
                .setInteractive();

            this.add.text(x, y, card.isUnlocked ? card.title : '???', {
                fontSize: '18px', color: card.isUnlocked ? '#000' : '#888',
                wordWrap: { width: 150 }
            }).setOrigin(0.5);

            cardBg.on('pointerdown', () => {
                if (card.isUnlocked) {
                    this.showDetail(card);
                }
            });
        });

        // Back Button
        const btnY = height - 80;
        const backBtn = this.add.rectangle(width/2, btnY, 200, 60, 0x666666).setInteractive();
        this.add.text(width/2, btnY, 'Back', { fontSize: '24px' }).setOrigin(0.5);
        backBtn.on('pointerdown', () => this.scene.start('LobbyScene'));
    }

    private showDetail(card: any) {
        const { width, height } = this.scale;

        const container = this.add.container(0, 0);

        const bg = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.9)
            .setInteractive(); // Block clicks

        const panel = this.add.rectangle(width/2, height/2, 600, 800, 0xffffff);
        const title = this.add.text(width/2, height/2 - 300, card.title, { fontSize: '32px', color: '#000' }).setOrigin(0.5);
        const desc = this.add.text(width/2, height/2, card.description, {
            fontSize: '24px', color: '#333', wordWrap: { width: 500 }
        }).setOrigin(0.5);

        const closeBtn = this.add.rectangle(width/2, height/2 + 300, 200, 60, 0x4285f4).setInteractive();
        const closeText = this.add.text(width/2, height/2 + 300, 'Close', { fontSize: '24px' }).setOrigin(0.5);

        closeBtn.on('pointerdown', () => {
            container.destroy();
        });

        container.add([bg, panel, title, desc, closeBtn, closeText]);
    }
}
