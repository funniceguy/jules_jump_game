import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    // UI & Controls
    private scoreText!: Phaser.GameObjects.Text;
    private score = 0;
    private displayScore = 0;

    // Toggle Control
    private moveDirection = 1; // 1 for Right, -1 for Left
    private leftArrow!: Phaser.GameObjects.Text;
    private rightArrow!: Phaser.GameObjects.Text;

    // Configuration
    private readonly platformCount = 10;
    private readonly platformVerticalDistance = 120;
    private readonly platformWidth = 150;

    // Generation Logic
    private lastPlatformX = 0;
    private lastPlatformWasBridge = false;

    // State
    private isGameOver = false;

    constructor() {
        super('GameScene');
    }

    create() {
        const { width, height } = this.scale;
        this.isGameOver = false;
        this.score = 0;
        this.displayScore = 0;
        this.moveDirection = 1; // Start moving right

        // --- Assets ---
        if (!this.textures.exists('platform')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0x00ff00, 1.0);
            graphics.fillRect(0, 0, this.platformWidth, 20);
            graphics.generateTexture('platform', this.platformWidth, 20);
        }
        if (!this.textures.exists('player')) {
             const graphics = this.make.graphics({ x: 0, y: 0, add: false });
             graphics.fillStyle(0x00ffff, 1.0);
             graphics.fillRect(0, 0, 32, 48);
             graphics.generateTexture('player', 32, 48);
        }

        // --- Platforms ---
        this.platforms = this.physics.add.staticGroup({
            key: 'platform',
            frameQuantity: this.platformCount,
            active: false,
            visible: false
        });

        const platforms = this.platforms.getChildren() as Phaser.Physics.Arcade.Image[];
        let currentY = height - 50;

        // Initial Platform (Center)
        const first = platforms[0];
        this.spawnPlatform(first, width * 0.5, currentY, true);
        currentY -= this.platformVerticalDistance;
        this.lastPlatformX = width * 0.5;
        this.lastPlatformWasBridge = false;

        // Spawn rest
        for (let i = 1; i < platforms.length; i++) {
            this.spawnPlatform(platforms[i], 0, currentY);
            currentY -= this.platformVerticalDistance;
        }

        // --- Player ---
        this.player = this.physics.add.sprite(width * 0.5, height - 150, 'player');
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(false);

        // Physics
        this.physics.add.collider(this.player, this.platforms, this.handleCollision, undefined, this);

        // --- Camera ---
        this.cameras.main.startFollow(this.player, true, 0, 0.05, 0, 0);
        this.cameras.main.setDeadzone(0, 200);

        // --- UI & Controls ---
        this.createUI();

        // Input Listener (Toggle)
        this.input.on('pointerdown', this.handleInput, this);

        // Keyboard (Optional: Space to toggle?)
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.input.keyboard.on('keydown-SPACE', () => this.handleInput());
            this.input.keyboard.on('keydown-LEFT', () => this.moveDirection = -1);
            this.input.keyboard.on('keydown-RIGHT', () => this.moveDirection = 1);
        }
    }

    private handleInput() {
        if (this.isGameOver) return;
        this.moveDirection *= -1;
        this.updateArrowVisuals();
    }

    private updateArrowVisuals() {
        // Highlight active direction
        if (this.moveDirection === -1) {
            this.leftArrow.setAlpha(0.8);
            this.rightArrow.setAlpha(0.2);
        } else {
            this.leftArrow.setAlpha(0.2);
            this.rightArrow.setAlpha(0.8);
        }
    }

    update() {
        if (this.isGameOver) return;

        // --- Movement ---
        // Constant velocity based on direction
        this.player.setVelocityX(200 * this.moveDirection);

        // Wrap
        const width = this.scale.width;
        if (this.player.x < 0) this.player.x = width;
        else if (this.player.x > width) this.player.x = 0;

        // --- Infinite Generation ---
        this.recyclePlatforms();

        // --- Score Logic ---
        const startY = this.scale.height - 150;
        if (this.player.y < startY) {
            const rawScore = Math.floor((startY - this.player.y) / this.platformVerticalDistance);
            if (rawScore > this.score) {
                this.score = rawScore;
                this.tweens.addCounter({
                    from: this.displayScore,
                    to: this.score,
                    duration: 500,
                    onUpdate: (tween) => {
                        this.displayScore = Math.floor(tween.getValue());
                        this.scoreText.setText(`Score: ${this.displayScore}`);
                    }
                });
            }
        }

        // Game Over
        const cameraBottom = this.cameras.main.scrollY + this.scale.height;
        if (this.player.y > cameraBottom + 100) {
            this.showGameOver();
        }
    }

    private showGameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.physics.pause();

        const { width, height } = this.scale;

        // Use scrollX/Y to position UI relative to camera
        const camX = this.cameras.main.scrollX;
        const camY = this.cameras.main.scrollY;

        const container = this.add.container(camX + width * 0.5, camY + height * 0.5).setDepth(100);

        // Background
        const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.7);

        // Text
        const title = this.add.text(0, -50, 'Game Over', {
            fontSize: '64px',
            color: '#ff0000',
            stroke: '#ffffff',
            strokeThickness: 4
        }).setOrigin(0.5);

        const scoreMsg = this.add.text(0, 20, `Final Score: ${this.score}`, {
            fontSize: '32px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Exit Button
        const btnBg = this.add.rectangle(0, 100, 200, 60, 0xffffff).setInteractive({ useHandCursor: true });
        const btnText = this.add.text(0, 100, 'Exit', {
            fontSize: '32px',
            color: '#000000'
        }).setOrigin(0.5);

        btnBg.on('pointerdown', () => {
            this.scene.start('LobbyScene');
        });

        container.add([bg, title, scoreMsg, btnBg, btnText]);
    }

    private spawnPlatform(platform: Phaser.Physics.Arcade.Image, x: number, y: number, forcePos = false) {
        const width = this.scale.width;
        const posPercents = [0.166, 0.333, 0.5, 0.666, 0.833];

        let finalX = x;
        let isBridge = false;

        if (!forcePos) {
            if (!this.lastPlatformWasBridge) {
                const pickB = Math.random() < 0.5;
                const idx = pickB ? 1 : 3;
                finalX = width * posPercents[idx];
                isBridge = true;
            } else {
                const idx = Phaser.Math.Between(0, 4);
                finalX = width * posPercents[idx];
                isBridge = (idx === 1 || idx === 3);
            }
        } else {
            finalX = x;
        }

        platform.enableBody(true, finalX, y, true, true);
        platform.refreshBody();

        const body = platform.body as Phaser.Physics.Arcade.StaticBody;
        body.checkCollision.down = false;
        body.checkCollision.left = false;
        body.checkCollision.right = false;
        body.checkCollision.up = true;

        if (!forcePos) {
            this.lastPlatformX = finalX;
            this.lastPlatformWasBridge = isBridge;
        }
    }

    private recyclePlatforms() {
        const platforms = this.platforms.getChildren() as Phaser.Physics.Arcade.Image[];
        const cameraBottom = this.cameras.main.scrollY + this.scale.height;

        let minY = Number.MAX_VALUE;
        platforms.forEach(p => {
            if (p.y < minY) minY = p.y;
        });

        platforms.forEach(platform => {
            if (platform.y > cameraBottom + 100) {
                const newY = minY - this.platformVerticalDistance;
                this.spawnPlatform(platform, 0, newY);
                minY = newY;
            }
        });
    }

    private handleCollision(player: any, platform: any) {
        const body = player.body as Phaser.Physics.Arcade.Body;
        if (body.touching.down) {
            body.setVelocityY(-600);
        }
    }

    private createUI() {
        const { width, height } = this.scale;

        // --- Score ---
        this.scoreText = this.add.text(width * 0.5, 50, 'Score: 0', {
            fontSize: '48px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

        // --- Arrows ---
        // Transparent arrows in center of screen halves
        // Left Center: 25% width
        this.leftArrow = this.add.text(width * 0.25, height * 0.5, '⬅️', {
            fontSize: '128px',
            color: '#ffffff'
        }).setOrigin(0.5).setAlpha(0.2).setScrollFactor(0).setDepth(0);

        // Right Center: 75% width
        this.rightArrow = this.add.text(width * 0.75, height * 0.5, '➡️', {
            fontSize: '128px',
            color: '#ffffff'
        }).setOrigin(0.5).setAlpha(0.8).setScrollFactor(0).setDepth(0); // Right active by default
    }
}
