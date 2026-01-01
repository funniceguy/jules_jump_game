import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    // UI & Controls
    private scoreText!: Phaser.GameObjects.Text;
    private score = 0;
    private displayScore = 0;
    private leftBtnDown = false;
    private rightBtnDown = false;

    // Configuration
    private readonly platformCount = 10;
    private readonly platformVerticalDistance = 120;
    private readonly platformWidth = 150;

    // Generation Logic
    private lastPlatformX = 0;
    private lastPlatformWasBridge = false; // "Bridge" means B or D position

    constructor() {
        super('GameScene');
    }

    create() {
        const { width, height } = this.scale;

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
        this.spawnPlatform(first, width * 0.5, currentY, true); // First is effectively C (Center)
        currentY -= this.platformVerticalDistance;
        this.lastPlatformX = width * 0.5;
        this.lastPlatformWasBridge = false; // C is not bridge

        // Spawn rest
        for (let i = 1; i < platforms.length; i++) {
            this.spawnPlatform(platforms[i], 0, currentY); // X calculated inside
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

        // Keyboard
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
        }
    }

    update() {
        // --- Movement ---
        let velocityX = 0;
        if (this.cursors?.left.isDown || this.leftBtnDown) {
            velocityX = -200;
        } else if (this.cursors?.right.isDown || this.rightBtnDown) {
            velocityX = 200;
        }
        this.player.setVelocityX(velocityX);

        // Wrap
        const width = this.scale.width;
        if (this.player.x < 0) this.player.x = width;
        else if (this.player.x > width) this.player.x = 0;

        // --- Infinite Generation ---
        this.recyclePlatforms();

        // --- Score Logic ---
        // Score = Max height reached / vertical distance roughly
        // Base Y is 600. Going up reduces Y.
        // Score = (StartY - PlayerY) / Distance.
        // Let's assume StartY ~ 450 (spawn point).
        // A better way: Count platforms passed.
        // But simply converting height to score is robust.
        // Let's use: Score = (InitialY - CurrentY) / 100 (scaled).
        // Or strictly "1 point per platform height (120)".

        const startY = this.scale.height - 150;
        if (this.player.y < startY) {
            const rawScore = Math.floor((startY - this.player.y) / this.platformVerticalDistance);
            if (rawScore > this.score) {
                this.score = rawScore;
                // Animate display score
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
            this.scene.restart();
            this.score = 0;
            this.displayScore = 0;
        }
    }

    private spawnPlatform(platform: Phaser.Physics.Arcade.Image, x: number, y: number, forcePos = false) {
        const width = this.scale.width;

        // Define Positions
        // A: 1/6, B: 2/6, C: 3/6, D: 4/6, E: 5/6
        // C is center (0.5).
        // 1/6 = 0.166, 2/6 = 0.333, 3/6 = 0.5, 4/6 = 0.666, 5/6 = 0.833
        const posPercents = [0.166, 0.333, 0.5, 0.666, 0.833];
        const posNames = ['A', 'B', 'C', 'D', 'E']; // Just for reference

        let finalX = x;
        let isBridge = false;

        if (!forcePos) {
            // Logic: "2칸에 한번씩은 B 혹은 D 에 위치되어야 해"
            // If previous was NOT Bridge (i.e. A, C, E), this one MUST be Bridge (B or D).
            if (!this.lastPlatformWasBridge) {
                // Pick B or D
                const pickB = Math.random() < 0.5;
                const idx = pickB ? 1 : 3;
                finalX = width * posPercents[idx];
                isBridge = true;
            } else {
                // Can be anything (0 to 4)
                const idx = Phaser.Math.Between(0, 4);
                finalX = width * posPercents[idx];
                // Update isBridge
                isBridge = (idx === 1 || idx === 3);
            }
        } else {
            // For initial forced spawn, check if it matches B or D
            // We verify against positions roughly?
            // Actually, for forced spawn (like first one), just set state manually outside.
            // But if x is provided, we use it.
            finalX = x;
        }

        platform.enableBody(true, finalX, y, true, true);
        platform.refreshBody();

        // One-way collision
        const body = platform.body as Phaser.Physics.Arcade.StaticBody;
        body.checkCollision.down = false;
        body.checkCollision.left = false;
        body.checkCollision.right = false;
        body.checkCollision.up = true; // Only top collision

        // Update state
        if (!forcePos) {
            this.lastPlatformX = finalX;
            this.lastPlatformWasBridge = isBridge;
        }
    }

    private recyclePlatforms() {
        const platforms = this.platforms.getChildren() as Phaser.Physics.Arcade.Image[];
        const cameraBottom = this.cameras.main.scrollY + this.scale.height;

        // Find highest Y
        let minY = Number.MAX_VALUE;
        platforms.forEach(p => {
            if (p.y < minY) minY = p.y;
        });

        platforms.forEach(platform => {
            if (platform.y > cameraBottom + 100) {
                const newY = minY - this.platformVerticalDistance;
                this.spawnPlatform(platform, 0, newY);
                minY = newY; // Update min for next iteration in loop
            }
        });
    }

    private handleCollision(player: any, platform: any) {
        const body = player.body as Phaser.Physics.Arcade.Body;
        if (body.touching.down && player.body.velocity.y > 0) {
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

        // --- Controls ---
        // Container for controls
        const btnY = height - 80;
        const btnSize = 80;

        // Left Button
        const leftBtn = this.add.container(100, btnY).setScrollFactor(0).setDepth(10);
        const lBg = this.add.circle(0, 0, btnSize / 2, 0xffffff, 0.2); // Transparent bg
        const lText = this.add.text(0, 0, '⬅️', { fontSize: '48px' }).setOrigin(0.5);
        leftBtn.add([lBg, lText]);
        leftBtn.setSize(btnSize, btnSize);
        leftBtn.setInteractive()
            .on('pointerdown', () => this.leftBtnDown = true)
            .on('pointerup', () => this.leftBtnDown = false)
            .on('pointerout', () => this.leftBtnDown = false);

        // Right Button
        const rightBtn = this.add.container(width - 100, btnY).setScrollFactor(0).setDepth(10);
        const rBg = this.add.circle(0, 0, btnSize / 2, 0xffffff, 0.2);
        const rText = this.add.text(0, 0, '➡️', { fontSize: '48px' }).setOrigin(0.5);
        rightBtn.add([rBg, rText]);
        rightBtn.setSize(btnSize, btnSize);
        rightBtn.setInteractive()
            .on('pointerdown', () => this.rightBtnDown = true)
            .on('pointerup', () => this.rightBtnDown = false)
            .on('pointerout', () => this.rightBtnDown = false);
    }
}
