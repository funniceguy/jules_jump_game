import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    // UI & Controls
    private scoreText!: Phaser.GameObjects.Text;
    private scoreBg!: Phaser.GameObjects.Graphics;
    private score = 0;

    // Toggle Control
    private moveDirection = 1;

    // Configuration
    private readonly platformVerticalDistance = 220;

    // Generation Logic
    private highestY = 0;

    // State
    private isGameOver = false;

    constructor() {
        super('GameScene');
    }

    create() {
        const { width, height } = this.scale;
        this.isGameOver = false;
        this.score = 0;
        this.moveDirection = 1;

        // --- Assets ---
        this.createAssets();

        // --- Platforms ---
        // Use a large pool.
        this.platforms = this.physics.add.staticGroup({
            key: 'platform_base',
            frameQuantity: 60,
            active: false,
            visible: false
        });

        // Initialize First Floor (Ground-ish)
        this.highestY = height - 100;
        this.spawnFloor(this.highestY, 1); // 1 big platform at start

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

        // --- Camera ---
        this.cameras.main.startFollow(this.player, true, 0, 0.05, 0, 0);
        this.cameras.main.setDeadzone(0, 400);

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
        // Base Platform (White 1x30 for scaling)
        if (!this.textures.exists('platform_base')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff, 1.0);
            graphics.fillRect(0, 0, 1, 30);
            graphics.generateTexture('platform_base', 1, 30);
        }

        // Player Side
        if (!this.textures.exists('player_side')) {
             const graphics = this.make.graphics({ x: 0, y: 0, add: false });
             graphics.fillStyle(0x00ffff, 1.0); // Cyan Body
             graphics.fillRect(10, 20, 30, 40);
             graphics.fillStyle(0xffff00, 1.0); // Yellow Head
             graphics.fillCircle(25, 15, 12);
             graphics.fillStyle(0x000000, 1.0); // Eye
             graphics.fillCircle(30, 12, 3);
             graphics.generateTexture('player_side', 50, 64);
        }

        // Player Jump
        if (!this.textures.exists('player_jump')) {
             const graphics = this.make.graphics({ x: 0, y: 0, add: false });
             graphics.fillStyle(0x00ffff, 1.0);
             graphics.fillRect(10, 20, 30, 45);
             graphics.fillStyle(0xffff00, 1.0);
             graphics.fillCircle(25, 15, 12);
             graphics.fillStyle(0x000000, 1.0);
             graphics.fillCircle(30, 10, 3);
             graphics.fillStyle(0x0000ff, 1.0); // Legs
             graphics.fillRect(10, 60, 10, 10);
             graphics.fillRect(30, 55, 10, 10);
             graphics.generateTexture('player_jump', 50, 75);
        }
    }

    private spawnFloor(y: number, forceCount?: number) {
        const width = this.scale.width;

        // Determine Count (2 to 5)
        const count = forceCount || Phaser.Math.Between(2, 5);

        // Distribute
        // Simple strategy: Divide width into 'count' segments. Place platform randomly in each segment.
        const segmentWidth = width / count;

        for (let i = 0; i < count; i++) {
            const platform = this.platforms.get();
            if (!platform) return; // Pool exhausted

            platform.setActive(true).setVisible(true);

            // Random width for platform (variable length)
            // Min 80, Max 200 (but fit in segment)
            // fit: segmentWidth - gap. Gap ~ 20.
            const maxW = Math.min(250, segmentWidth - 20);
            const w = Phaser.Math.Between(80, maxW);

            // Position in segment
            // Segment X range: i*segmentWidth to (i+1)*segmentWidth
            // Center of platform must be within.
            // Platform origin is 0.5, 0.5.
            const minX = i * segmentWidth + w/2 + 10;
            const maxX = (i + 1) * segmentWidth - w/2 - 10;
            const x = Phaser.Math.Between(minX, maxX);

            platform.enableBody(true, x, y, true, true);
            platform.setScale(w, 1); // Scale X to width. Base texture is 1px wide.
            platform.refreshBody(); // Important for static body scaling

            const body = platform.body as Phaser.Physics.Arcade.StaticBody;
            body.checkCollision.down = false;
            body.checkCollision.left = false;
            body.checkCollision.right = false;
            body.checkCollision.up = true;

            // Special Platform?
            const isSuper = Math.random() < 0.1; // 10%
            platform.setData('isSuper', isSuper);

            if (isSuper) {
                platform.setTint(0xffaa00); // Gold/Orange
            } else {
                platform.setTint(0x4285f4); // Google Blue
            }
        }
    }

    private handleInput() {
        if (this.isGameOver) return;
        this.moveDirection *= -1;
    }

    update() {
        if (this.isGameOver) return;

        // --- Movement ---
        const speed = 400;
        this.player.setVelocityX(speed * this.moveDirection);

        // Wrap
        const width = this.scale.width;
        if (this.player.x < 0) this.player.x = width;
        else if (this.player.x > width) this.player.x = 0;

        // --- Animation ---
        this.player.setFlipX(this.moveDirection === -1);
        if (!this.player.body.touching.down) {
             if (this.player.texture.key !== 'player_jump') {
                 this.player.setTexture('player_jump');
             }
        } else {
            if (this.player.texture.key !== 'player_side') {
                this.player.setTexture('player_side');
            }
        }

        // --- Infinite Generation ---
        // Recycle old
        const cameraBottom = this.cameras.main.scrollY + this.scale.height;
        this.platforms.children.iterate((p: any) => {
            if (p.active && p.y > cameraBottom + 100) {
                this.platforms.killAndHide(p);
                p.disableBody(true, true);
            }
            return true;
        });

        // Spawn new
        const cameraTop = this.cameras.main.scrollY;
        // Generate ahead up to cameraTop - 200
        while (this.highestY > cameraTop - 300) {
             this.highestY -= this.platformVerticalDistance;
             this.spawnFloor(this.highestY);
        }

        // --- Score ---
        const startY = this.scale.height - 300;
        if (this.player.y < startY) {
            const currentScore = Math.floor((startY - this.player.y) / 100); // 1 point per 100px
            if (currentScore > this.score) {
                this.score = currentScore;
                this.scoreText.setText(`${this.score}`);
            }
        }

        // Game Over
        if (this.player.y > cameraBottom + 100) {
            this.showGameOver();
        }
    }

    private handleCollision(player: any, platform: any) {
        const body = player.body as Phaser.Physics.Arcade.Body;
        if (body.touching.down) {
            // Check Super
            const isSuper = platform.getData('isSuper');
            if (isSuper) {
                 body.setVelocityY(-2500); // Super Jump!
            } else {
                 body.setVelocityY(-1100); // Normal Jump
            }
        }
    }

    private createUI() {
        const { width } = this.scale;

        // Google Style Score Pill
        const pillW = 120;
        const pillH = 50;
        const pillX = 40;
        const pillY = 40;

        this.scoreBg = this.add.graphics();
        this.scoreBg.fillStyle(0xffffff, 0.9);
        this.scoreBg.fillRoundedRect(pillX, pillY, pillW, pillH, 25); // Pill shape
        this.scoreBg.setScrollFactor(0).setDepth(10);

        // Shadow/Border? Simple flat is google style. Maybe mild shadow.
        // Let's just keep clean flat.

        this.scoreText = this.add.text(pillX + pillW/2, pillY + pillH/2, '0', {
            fontSize: '32px',
            color: '#4285f4', // Google Blue
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(11);
    }

    private showGameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.physics.pause();

        const { width, height } = this.scale;

        // Container fixed to camera center
        // Using scrollFactor 0 means we position it relative to viewport (0,0 is top left of viewport)
        // Center is width/2, height/2.

        const container = this.add.container(width * 0.5, height * 0.5).setDepth(100).setScrollFactor(0);

        // Overlay (Full Screen)
        // Since container is at center, we need rect from -w/2, -h/2
        const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.85); // Slightly transparent black for modern feel

        // Card (White rounded)
        const cardW = 500;
        const cardH = 400;
        const card = this.add.graphics();
        card.fillStyle(0xffffff, 1.0);
        card.fillRoundedRect(-cardW/2, -cardH/2, cardW, cardH, 30);

        // Text
        const title = this.add.text(0, -100, 'Game Over', {
            fontSize: '56px',
            color: '#202124',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const scoreLabel = this.add.text(0, 0, 'Score', {
            fontSize: '32px',
            color: '#5f6368', // Google Grey
            fontFamily: 'Arial, sans-serif'
        }).setOrigin(0.5);

        const scoreVal = this.add.text(0, 50, `${this.score}`, {
            fontSize: '64px',
            color: '#4285f4',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Exit Button (Pill)
        const btnW = 200;
        const btnH = 60;
        const btnY = 120;

        const btn = this.add.container(0, btnY);
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x4285f4, 1.0); // Google Blue
        btnBg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 30);

        const btnText = this.add.text(0, 0, 'Exit', {
            fontSize: '28px',
            color: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        btn.add([btnBg, btnText]);

        // Interactive zone for button
        // Graphics isn't directly interactive for hit area unless set.
        // Easiest is to add a transparent interactive rect or set hit area.
        const hitArea = this.add.rectangle(0, btnY, btnW, btnH, 0x000000, 0).setInteractive({ cursor: 'pointer' });

        hitArea.on('pointerdown', () => {
            this.scene.start('LobbyScene');
        });

        container.add([bg, card, title, scoreLabel, scoreVal, btn, hitArea]);
    }
}
