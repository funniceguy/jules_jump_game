import Phaser from 'phaser';
import { GameData } from '../managers/GameData';

export default class GameScene extends Phaser.Scene {
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private platforms!: Phaser.Physics.Arcade.Group;
    private items!: Phaser.Physics.Arcade.Group;

    // UI & Controls
    private scoreText!: Phaser.GameObjects.Text;
    private scoreBg!: Phaser.GameObjects.Graphics;
    private timerText!: Phaser.GameObjects.Text;
    private timerBg!: Phaser.GameObjects.Graphics;

    private heightScore = 0;
    private itemScore = 0;

    // Toggle Control
    private moveDirection = 1;

    // Configuration
    private readonly platformVerticalDistance = 220;
    private targetScore = 1000;
    private timeLeft = 90000;

    // Generation Logic
    private highestY = 0;
    private lastPlatformCount = 1;

    // State
    private isGameOver = false;
    private isGameClear = false;
    private isFlying = false;
    private flyTimer = 0;
    private flyVelocity = 0;

    // Mechanics State
    private canDoubleJump = false;
    private isDashing = false;
    private dashTimer = 0;

    constructor() {
        super('GameScene');
    }

    create() {
        const { width, height } = this.scale;
        const data = GameData.getInstance();

        this.isGameOver = false;
        this.isGameClear = false;
        this.heightScore = 0;
        this.itemScore = 0;
        this.moveDirection = 1;
        this.isFlying = false;
        this.flyTimer = 0;
        this.lastPlatformCount = 1;
        this.canDoubleJump = false;
        this.isDashing = false;
        this.dashTimer = 0;
        this.timeLeft = 90000;

        // Progression Logic: Target = Stage * 1000
        this.targetScore = data.currentStage * 1000;

        // Assets are preloaded in PreloadScene.ts

        // --- Groups ---
        this.platforms = this.physics.add.group({
            runChildUpdate: false,
            allowGravity: false,
            immovable: true
        });

        this.items = this.physics.add.group({
            runChildUpdate: false,
            allowGravity: false,
            immovable: true
        });

        // Initialize First Floor
        this.highestY = height - 100;
        this.spawnFloor(this.highestY, 1, 'wood', true);

        // Fill screen
        while (this.highestY > -200) {
            this.highestY -= this.platformVerticalDistance;
            this.spawnFloor(this.highestY);
        }

        // --- Player ---
        this.player = this.physics.add.sprite(width * 0.5, height - 300, 'player_side');
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(false);

        // Physics
        this.physics.add.collider(this.player, this.platforms, this.handleCollision, undefined, this);
        this.physics.add.overlap(this.player, this.items, this.collectItem, undefined, this);

        // --- Camera ---
        this.cameras.main.startFollow(this.player, true, 0, 0.2, 0, 200);
        this.cameras.main.setDeadzone(0, 100);

        // --- UI & Controls ---
        this.createUI();
        this.createControls();

        // Input Listener
        this.input.on('pointerdown', (_pointer: Phaser.Input.Pointer, gameObjects: any[]) => {
            if (gameObjects.length === 0) {
                this.handleInput();
            }
        }, this);

        // Keyboard
        if (this.input.keyboard) {
            this.input.keyboard.on('keydown-SPACE', () => this.handleInput());
        }
    }

    // Removed createAssets() as it is now in PreloadScene

    private spawnFloor(y: number, forceCount?: number, forceType?: string, isStartPlatform: boolean = false) {
        const width = this.scale.width;
        let count = 1;
        if (forceCount !== undefined) count = forceCount;
        else {
            if (this.lastPlatformCount === 3) count = 1;
            else if (this.lastPlatformCount === 1) count = 2;
            else count = Phaser.Math.Between(1, 3);
        }
        this.lastPlatformCount = count;
        const segmentWidth = width / count;

        for (let i = 0; i < count; i++) {
            let type = 'wood';
            if (forceType) type = forceType;
            else {
                const rand = Math.random();
                if (rand < 0.80) type = 'wood';
                else if (rand < 0.85) type = 'rubber';
                else if (rand < 0.95) type = 'electric';
                else type = 'plasma';
            }

            let platform = this.platforms.getFirstDead() as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
            if (!platform) platform = this.platforms.create(0, 0, `platform_${type}`);
            else {
                platform.setTexture(`platform_${type}`);
                platform.setActive(true).setVisible(true);
            }

            let w = 100;
            let x = 0;
            if (isStartPlatform) {
                w = width; x = width / 2;
            } else {
                const maxAllowed = width * 0.25;
                const maxW = Math.min(maxAllowed, segmentWidth - 20);
                w = Phaser.Math.Between(80, Math.max(80, maxW));
                const minX = i * segmentWidth + w/2 + 10;
                const maxX = (i + 1) * segmentWidth - w/2 - 10;
                x = Phaser.Math.Between(minX, maxX);
            }

            platform.enableBody(true, x, y, true, true);
            platform.setScale(w / 100, 1);
            platform.body.updateFromGameObject();
            const body = platform.body as Phaser.Physics.Arcade.Body;
            body.setImmovable(true); body.moves = false;
            body.checkCollision.down = false; body.checkCollision.left = false;
            body.checkCollision.right = false; body.checkCollision.up = true;
            platform.setData('type', type);
            platform.clearTint();

            // Spawn Logic: Item (30%)
            if (!isStartPlatform) {
                const rand = Math.random();
                if (rand < 0.3) {
                    this.spawnItem(x, y - 40);
                }
            }
        }
    }

    private spawnItem(x: number, y: number) {
        const rand = Math.random();
        let itemType = 'item_fish';
        let value = 50;
        if (rand < 0.30) { itemType = 'item_fish'; value = 50; }
        else if (rand < 0.55) { itemType = 'item_milk'; value = 100; }
        else if (rand < 0.75) { itemType = 'item_cookie'; value = 150; }
        else if (rand < 0.90) { itemType = 'item_flower'; value = 200; }
        else { itemType = 'item_gem'; value = 500; }

        let item = this.items.getFirstDead();
        if (!item) item = this.items.create(x, y, itemType);
        else {
            item.setTexture(itemType);
            item.setActive(true).setVisible(true);
            item.setPosition(x, y);
            item.enableBody(true, x, y, true, true);
        }
        item.setData('value', value);
    }

    private collectItem(_player: any, item: any) {
        item.disableBody(true, true);
        const val = item.getData('value');
        this.itemScore += val;

        const text = this.add.text(item.x, item.y, `+${val}`, {
            fontSize: '24px', color: '#FFD700', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5);
        this.tweens.add({ targets: text, y: item.y - 50, alpha: 0, duration: 800, onComplete: () => text.destroy() });
    }

    private handleInput() {
        if (this.isGameOver || this.isGameClear) return;
        this.moveDirection *= -1;
    }

    private performJump() {
        if (this.isGameOver || this.isGameClear || this.isFlying) return;
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        if (!body.touching.down && this.canDoubleJump) {
            this.player.setVelocityY(-1000);
            this.canDoubleJump = false;
            this.tweens.add({ targets: this.player, scaleX: 1.2, scaleY: 0.8, duration: 100, yoyo: true });
        }
    }

    private performDash() {
        if (this.isGameOver || this.isGameClear || this.isDashing) return;
        this.isDashing = true;
        this.isFlying = false; // Dash cancels fly? Maybe not. Let's keep it simple.
        this.dashTimer = 200;
    }

    update(_time: number, delta: number) {
        if (this.isGameOver || this.isGameClear) return;

        this.timeLeft -= delta;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.updateTimerText();
            this.showGameOver(true);
            return;
        }
        this.updateTimerText();

        // Movement
        if (this.isDashing) {
            this.dashTimer -= delta;
            this.player.setVelocityX(1000 * this.moveDirection);
            this.player.setVelocityY(0);
            if (this.dashTimer <= 0) this.isDashing = false;
        } else {
            this.player.setVelocityX(400 * this.moveDirection);
        }

        // Wrap
        const width = this.scale.width;
        if (this.player.x < 0) { this.player.x = width; this.cameras.main.scrollX = 0; }
        else if (this.player.x > width) { this.player.x = 0; this.cameras.main.scrollX = 0; }
        this.cameras.main.scrollX = 0;

        // Flight
        if (this.isFlying) {
            this.flyTimer -= delta;
            this.player.setVelocityY(this.flyVelocity);
            if (this.flyTimer <= 0) this.isFlying = false;
        }

        // Anim
        this.player.setFlipX(this.moveDirection === -1);
        if (this.isFlying || !this.player.body.touching.down) {
             if (this.player.texture.key !== 'player_jump') this.player.setTexture('player_jump');
        } else {
            if (this.player.texture.key !== 'player_side') this.player.setTexture('player_side');
        }

        // Cleanup
        const cameraBottom = this.cameras.main.scrollY + this.scale.height;
        this.platforms.children.iterate((p: any) => {
            if (p.active && p.y > cameraBottom + 100) { this.platforms.killAndHide(p); p.disableBody(true, true); }
            return true;
        });
        this.items.children.iterate((i: any) => {
             if (i.active && i.y > cameraBottom + 100) { this.items.killAndHide(i); i.disableBody(true, true); }
             return true;
        });

        // Gen
        const cameraTop = this.cameras.main.scrollY;
        while (this.highestY > cameraTop - 300) {
             this.highestY -= this.platformVerticalDistance;
             this.spawnFloor(this.highestY);
        }

        // Score
        const startY = this.scale.height - 300;
        let hScore = 0;
        if (this.player.y < startY) {
            hScore = Math.floor((startY - this.player.y) / 200);
            if (hScore > this.heightScore) this.heightScore = hScore;
        }

        const totalScore = this.heightScore + this.itemScore;
        this.scoreText.setText(`Score: ${totalScore} / ${this.targetScore}`);

        if (totalScore >= this.targetScore) this.showGameClear();
        if (this.player.y > cameraBottom + 100) this.showGameOver(false);
    }

    private updateTimerText() {
        const totalSeconds = Math.floor(this.timeLeft / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const ms = Math.floor((this.timeLeft % 1000) / 10);
        this.timerText.setText(`${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}:${ms.toString().padStart(2,'0')}`);

        // Critical time effect
        if (totalSeconds < 10) {
            this.timerText.setColor('#ff4757');
            this.timerText.setFontSize(32);
        } else {
            this.timerText.setColor('#ffffff');
            this.timerText.setFontSize(28);
        }
    }

    private handleCollision(player: any, platform: any) {
        if (this.isFlying) return;
        const body = player.body as Phaser.Physics.Arcade.Body;
        if (body.touching.down) {
            this.canDoubleJump = true;
            this.isDashing = false;
            const type = platform.getData('type');
            if (type === 'rubber') body.setVelocityY(-2500);
            else if (type === 'electric') this.startFlight(-2000, 2000);
            else if (type === 'plasma') this.startFlight(-3000, 3000);
            else body.setVelocityY(-1100);
        }
    }

    private startFlight(velocity: number, duration: number) {
        this.isFlying = true;
        this.flyVelocity = velocity;
        this.flyTimer = duration;
        this.player.setVelocityY(velocity);
    }

    private createUI() {
        const { width } = this.scale;

        // Score (Left)
        this.scoreBg = this.add.graphics();
        this.scoreBg.fillStyle(0x000000, 0.4);
        this.scoreBg.fillRoundedRect(20, 20, 240, 60, 20);
        this.scoreBg.setScrollFactor(0).setDepth(10);
        this.scoreText = this.add.text(140, 50, 'Score: 0', {
            fontFamily: 'Fredoka One', fontSize: '24px', color: '#f1f2f6'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(11);

        // Timer (Right)
        this.timerBg = this.add.graphics();
        this.timerBg.fillStyle(0x000000, 0.4);
        this.timerBg.fillRoundedRect(width - 200, 20, 180, 60, 20);
        this.timerBg.setScrollFactor(0).setDepth(10);
        this.timerText = this.add.text(width - 110, 50, '00:00:00', {
            fontFamily: 'Fredoka One', fontSize: '28px', color: '#fff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(11);
    }

    private createControls() {
        const { width, height } = this.scale;
        const btnH = 120;
        const btnY = height - 80;

        // Left Area (JUMP)
        const jumpZone = this.add.rectangle(width * 0.25, btnY, width/2 - 20, btnH, 0x2ecc71, 0.8)
            .setScrollFactor(0).setDepth(20).setInteractive();
        this.add.text(width * 0.25, btnY, 'JUMP', {
            fontFamily: 'Fredoka One', fontSize:'40px'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(21);

        jumpZone.on('pointerdown', () => { this.performJump(); jumpZone.setAlpha(1); });
        jumpZone.on('pointerup', () => jumpZone.setAlpha(0.8));
        jumpZone.on('pointerout', () => jumpZone.setAlpha(0.8));

        // Right Area (DASH)
        const dashZone = this.add.rectangle(width * 0.75, btnY, width/2 - 20, btnH, 0x00d2d3, 0.8)
            .setScrollFactor(0).setDepth(20).setInteractive();
        this.add.text(width * 0.75, btnY, 'DASH', {
            fontFamily: 'Fredoka One', fontSize:'40px'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(21);

        dashZone.on('pointerdown', () => { this.performDash(); dashZone.setAlpha(1); });
        dashZone.on('pointerup', () => dashZone.setAlpha(0.8));
        dashZone.on('pointerout', () => dashZone.setAlpha(0.8));
    }

    private showGameOver(isTimeOver: boolean) {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.physics.pause();

        const { width, height } = this.scale;

        // Modal Background
        const modal = this.add.container(width/2, height/2).setScrollFactor(0).setDepth(100);

        const bg = this.add.graphics();
        bg.fillStyle(0x2f3542, 0.95);
        bg.fillRoundedRect(-300, -200, 600, 400, 30);
        bg.lineStyle(6, 0xff4757, 1);
        bg.strokeRoundedRect(-300, -200, 600, 400, 30);

        const title = this.add.text(0, -100, isTimeOver ? 'TIME UP' : 'GAME OVER', {
            fontFamily: 'Fredoka One', fontSize: '64px', color: '#ff4757'
        }).setOrigin(0.5);

        const score = this.add.text(0, 0, `Score: ${this.heightScore + this.itemScore}`, {
             fontFamily: 'Nunito', fontSize: '40px', color: '#fff'
        }).setOrigin(0.5);

        // Exit Button
        const btn = this.add.container(0, 120);
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0xffffff, 1);
        btnBg.fillRoundedRect(-100, -30, 200, 60, 20);
        const btnTxt = this.add.text(0, 0, 'EXIT', { fontFamily: 'Fredoka One', fontSize: '30px', color: '#2f3542' }).setOrigin(0.5);
        btn.add([btnBg, btnTxt]);
        btn.setSize(200, 60);
        btn.setInteractive(new Phaser.Geom.Rectangle(-100, -30, 200, 60), Phaser.Geom.Rectangle.Contains);
        btn.on('pointerdown', () => this.scene.start('LobbyScene'));

        modal.add([bg, title, score, btn]);
        modal.setScale(0);
        this.tweens.add({ targets: modal, scaleX: 1, scaleY: 1, duration: 300, ease: 'Back.out' });
    }

    private showGameClear() {
        if (this.isGameClear) return;
        this.isGameClear = true;
        this.physics.pause();
        GameData.getInstance().completeStage();

        const { width, height } = this.scale;

        const modal = this.add.container(width/2, height/2).setScrollFactor(0).setDepth(100);

        const bg = this.add.graphics();
        bg.fillStyle(0x2f3542, 0.95);
        bg.fillRoundedRect(-300, -200, 600, 400, 30);
        bg.lineStyle(6, 0xf1c40f, 1);
        bg.strokeRoundedRect(-300, -200, 600, 400, 30);

        const title = this.add.text(0, -100, 'STAGE CLEAR!', {
            fontFamily: 'Fredoka One', fontSize: '60px', color: '#f1c40f'
        }).setOrigin(0.5);

        // Stars/Particles
        for(let i=0; i<10; i++) {
             const s = this.add.text(Phaser.Math.Between(-200, 200), Phaser.Math.Between(-150, -50), '★', { fontSize: '40px', color: '#ffeaa7' });
             modal.add(s);
             this.tweens.add({ targets: s, angle: 360, duration: 2000, repeat: -1 });
        }

        const score = this.add.text(0, 20, `Final Score: ${this.heightScore + this.itemScore}`, {
             fontFamily: 'Nunito', fontSize: '32px', color: '#fff'
        }).setOrigin(0.5);

        // Next Button
        const btn = this.add.container(0, 120);
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x2ed573, 1);
        btnBg.fillRoundedRect(-120, -35, 240, 70, 25);
        const btnTxt = this.add.text(0, 0, 'NEXT LEVEL', { fontFamily: 'Fredoka One', fontSize: '30px', color: '#fff' }).setOrigin(0.5);
        btn.add([btnBg, btnTxt]);
        btn.setSize(240, 70);
        btn.setInteractive(new Phaser.Geom.Rectangle(-120, -35, 240, 70), Phaser.Geom.Rectangle.Contains);
        btn.on('pointerdown', () => this.scene.start('LobbyScene'));

        modal.add([bg, title, score, btn]);
        modal.setScale(0);
        this.tweens.add({ targets: modal, scaleX: 1, scaleY: 1, duration: 500, ease: 'Bounce.out' });
    }
}
