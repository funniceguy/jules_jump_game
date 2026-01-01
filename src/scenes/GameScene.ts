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

    // Configuration
    private readonly platformCount = 12; // Increased for taller screen
    private readonly platformVerticalDistance = 200; // Adjusted for 1280 height (approx 6 platforms)
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
        this.moveDirection = 1;

        // --- Assets ---
        this.createAssets();

        // --- Platforms ---
        this.platforms = this.physics.add.staticGroup({
            key: 'platform',
            frameQuantity: this.platformCount,
            active: false,
            visible: false
        });

        const platforms = this.platforms.getChildren() as Phaser.Physics.Arcade.Image[];
        let currentY = height - 100;

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
        this.player = this.physics.add.sprite(width * 0.5, height - 300, 'player_side');
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(false);

        // Adjust player size/offset if needed for the sprite
        // (Assuming 48x64 or similar generated)

        // Physics
        this.physics.add.collider(this.player, this.platforms, this.handleCollision, undefined, this);

        // --- Camera ---
        this.cameras.main.startFollow(this.player, true, 0, 0.05, 0, 0);
        this.cameras.main.setDeadzone(0, 400); // Larger deadzone for taller screen

        // --- UI & Controls ---
        this.createUI();

        // Input Listener (Toggle)
        this.input.on('pointerdown', this.handleInput, this);

        // Keyboard
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.input.keyboard.on('keydown-SPACE', () => this.handleInput());
        }
    }

    private createAssets() {
        // Platform
        if (!this.textures.exists('platform')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0x00ff00, 1.0);
            graphics.fillRect(0, 0, this.platformWidth, 30);
            graphics.generateTexture('platform', this.platformWidth, 30);
        }

        // Player Side (Run/Stand)
        if (!this.textures.exists('player_side')) {
             const graphics = this.make.graphics({ x: 0, y: 0, add: false });

             // Body
             graphics.fillStyle(0x00ffff, 1.0);
             graphics.fillRect(10, 20, 30, 40);

             // Head
             graphics.fillStyle(0xffff00, 1.0);
             graphics.fillCircle(25, 15, 12);

             // Eye (Looking Right)
             graphics.fillStyle(0x000000, 1.0);
             graphics.fillCircle(30, 12, 3);

             graphics.generateTexture('player_side', 50, 64);
        }

        // Player Jump
        if (!this.textures.exists('player_jump')) {
             const graphics = this.make.graphics({ x: 0, y: 0, add: false });

             // Body (Stretched)
             graphics.fillStyle(0x00ffff, 1.0);
             graphics.fillRect(10, 20, 30, 45); // Taller

             // Head
             graphics.fillStyle(0xffff00, 1.0);
             graphics.fillCircle(25, 15, 12);

             // Eye (Looking Right - Upward?)
             graphics.fillStyle(0x000000, 1.0);
             graphics.fillCircle(30, 10, 3);

             // Legs tucked?
             graphics.fillStyle(0x0000ff, 1.0);
             graphics.fillRect(10, 60, 10, 10);
             graphics.fillRect(30, 55, 10, 10);

             graphics.generateTexture('player_jump', 50, 75);
        }
    }

    private handleInput() {
        if (this.isGameOver) return;
        this.moveDirection *= -1;
    }

    update() {
        if (this.isGameOver) return;

        // --- Movement ---
        const speed = 400; // Increased speed for scale
        this.player.setVelocityX(speed * this.moveDirection);

        // Wrap
        const width = this.scale.width;
        if (this.player.x < 0) this.player.x = width;
        else if (this.player.x > width) this.player.x = 0;

        // --- Animation State ---
        // Flip based on direction
        this.player.setFlipX(this.moveDirection === -1);

        // Texture based on state
        if (!this.player.body.touching.down) {
            // In Air (Jumping/Falling)
             if (this.player.texture.key !== 'player_jump') {
                 this.player.setTexture('player_jump');
             }
        } else {
            // On Ground
            if (this.player.texture.key !== 'player_side') {
                this.player.setTexture('player_side');
            }
        }

        // --- Infinite Generation ---
        this.recyclePlatforms();

        // --- Score Logic ---
        const startY = this.scale.height - 300;
        if (this.player.y < startY) {
            const rawScore = Math.floor((startY - this.player.y) / this.platformVerticalDistance);
            if (rawScore > this.score) {
                this.score = rawScore;
                this.scoreText.setText(`Score: ${this.score}`);
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
        const camX = this.cameras.main.scrollX;
        const camY = this.cameras.main.scrollY;

        const container = this.add.container(camX + width * 0.5, camY + height * 0.5).setDepth(100);

        // Background (Opaque Black)
        const bg = this.add.rectangle(0, 0, width, height, 0x000000, 1.0);

        // Text
        const title = this.add.text(0, -100, 'Game Over', {
            fontSize: '80px',
            color: '#ff0000',
            stroke: '#ffffff',
            strokeThickness: 5
        }).setOrigin(0.5);

        const scoreMsg = this.add.text(0, 0, `Final Score: ${this.score}`, {
            fontSize: '48px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Exit Button
        const btnBg = this.add.rectangle(0, 150, 300, 80, 0xffffff).setInteractive({ useHandCursor: true });
        const btnText = this.add.text(0, 150, 'Exit', {
            fontSize: '40px',
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
            // Updated velocity for scale/gravity
            body.setVelocityY(-1000); // Higher jump for gravity 1500
        }
    }

    private createUI() {
        const { width, height } = this.scale;
        this.scoreText = this.add.text(width * 0.5, 100, 'Score: 0', {
            fontSize: '64px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(10);
    }
}
