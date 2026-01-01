import Phaser from 'phaser';
import { GameData } from '../managers/GameData';

export default class AchievementScene extends Phaser.Scene {
    constructor() {
        super('AchievementScene');
    }

    create() {
        const { width, height } = this.scale;
        const data = GameData.getInstance();

        this.add.rectangle(width/2, height/2, width, height, 0x111111);
        this.add.text(width/2, 60, 'Achievements', { fontSize: '40px', color: '#fff' }).setOrigin(0.5);

        const startY = 150;
        const gapY = 120;

        data.achievements.forEach((ach, index) => {
            const y = startY + index * gapY;

            // Background
            this.add.rectangle(width/2, y, width - 40, 100, 0x333333);

            // Text
            this.add.text(40, y - 20, ach.title, { fontSize: '24px', color: '#fff' });
            this.add.text(40, y + 10, ach.description, { fontSize: '18px', color: '#aaa' });
            this.add.text(40, y + 35, `Progress: ${ach.current} / ${ach.target}`, { fontSize: '16px', color: '#0f0' });

            // Button
            if (!ach.isClaimed && ach.current >= ach.target) {
                const btn = this.add.rectangle(width - 100, y, 120, 60, 0xffff00).setInteractive();
                const txt = this.add.text(width - 100, y, 'Claim', { fontSize: '20px', color: '#000' }).setOrigin(0.5);

                btn.on('pointerdown', () => {
                    data.claimAchievement(ach.id);
                    btn.destroy();
                    txt.destroy();
                    this.add.text(width - 100, y, 'Claimed', { fontSize: '20px', color: '#888' }).setOrigin(0.5);
                });
            } else if (ach.isClaimed) {
                this.add.text(width - 100, y, 'Claimed', { fontSize: '20px', color: '#888' }).setOrigin(0.5);
            } else {
                this.add.text(width - 100, y, 'Locked', { fontSize: '20px', color: '#555' }).setOrigin(0.5);
            }
        });

        // Back Button
        const btnY = height - 80;
        const backBtn = this.add.rectangle(width/2, btnY, 200, 60, 0x666666).setInteractive();
        this.add.text(width/2, btnY, 'Back', { fontSize: '24px' }).setOrigin(0.5);
        backBtn.on('pointerdown', () => this.scene.start('LobbyScene'));
    }
}
