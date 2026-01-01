import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private platforms!: Phaser.Physics.Arcade.Group; // Changed to Group for easier texture management
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
    private isFlying = false;
    private flyTimer = 0;
    private flyVelocity = 0;

    constructor() {
        super('GameScene');
    }

    create() {
        const { width, height } = this.scale;
        this.isGameOver = false;
        this.score = 0;
        this.moveDirection = 1;
        this.isFlying = false;
        this.flyTimer = 0;

        // --- Assets ---
        this.createAssets();

        // --- Platforms ---
        // Using dynamic Group to easily set textures and properties
        this.platforms = this.physics.add.group({
            runChildUpdate: false, // Static-like behavior
            allowGravity: false,
            immovable: true
        });

        // Initialize First Floor (Wood)
        this.highestY = height - 100;
        this.spawnFloor(this.highestY, 1, 'wood'); // Force wood for start

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
        this.physics.add.overlap(this.player, this.platforms, this.handleCollision, undefined, this);
        // Using overlap + manual check or collider?
        // Collider separates bodies. Overlap allows passing through.
        // We want one-way collision. Arcade Physics `checkCollision` works with Collider.
        // But for "Flight", we might want to pass through everything.
        // Let's stick to collider but manage state.
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
        // --- Platforms ---
        const w = 100; // Base width for texture gen (we scale it later)
        const h = 30;

        // 1. Wood (Normal) - Brown
        if (!this.textures.exists('platform_wood')) {
            const g = this.make.graphics({x:0, y:0, add: false});
            g.fillStyle(0x8B4513, 1.0); // SaddleBrown
            g.fillRect(0, 0, w, h);
            g.lineStyle(2, 0xDAA520, 1.0); // GoldenRod lines
            g.beginPath(); g.moveTo(0, 5); g.lineTo(w, 5); g.strokePath();
            g.beginPath(); g.moveTo(0, 15); g.lineTo(w, 15); g.strokePath();
            g.generateTexture('platform_wood', w, h);
        }

        // 2. Rubber (3x Jump) - Pink/Red
        if (!this.textures.exists('platform_rubber')) {
            const g = this.make.graphics({x:0, y:0, add: false});
            g.fillStyle(0xFF69B4, 1.0); // HotPink
            g.fillRoundedRect(0, 0, w, h, 15);
            g.lineStyle(2, 0xFF1493, 1.0); // DeepPink
            g.strokeRoundedRect(0, 0, w, h, 15);
            g.generateTexture('platform_rubber', w, h);
        }

        // 3. Electric (2x Flight) - Yellow/Lightning
        if (!this.textures.exists('platform_electric')) {
            const g = this.make.graphics({x:0, y:0, add: false});
            g.fillStyle(0x2F4F4F, 1.0); // DarkSlateGray
            g.fillRect(0, 0, w, h);
            g.fillStyle(0xFFFF00, 1.0); // Yellow
            // Lightning bolt shape
            g.beginPath();
            g.moveTo(10, 5); g.lineTo(30, 25); g.lineTo(50, 5); g.lineTo(70, 25); g.lineTo(90, 5);
            g.lineTo(90, 10); g.lineTo(70, 30); g.lineTo(50, 10); g.lineTo(30, 30); g.lineTo(10, 10);
            g.closePath();
            g.fillPath();
            g.generateTexture('platform_electric', w, h);
        }

        // 4. Plasma (3x Flight) - Purple/Cyan
        if (!this.textures.exists('platform_plasma')) {
            const g = this.make.graphics({x:0, y:0, add: false});
            g.fillStyle(0x4B0082, 1.0); // Indigo
            g.fillRect(0, 0, w, h);
            g.lineStyle(4, 0x00FFFF, 1.0); // Cyan
            g.strokeRect(0, 0, w, h);
            // Glow effect simulated by inner rect
            g.fillStyle(0x00FFFF, 0.5);
            g.fillRect(5, 5, w-10, h-10);
            g.generateTexture('platform_plasma', w, h);
        }


        // --- Character (Cat) ---
        // Player Side (Run/Stand)
        if (!this.textures.exists('player_side')) {
             const g = this.make.graphics({ x: 0, y: 0, add: false });

             // Body (White/Orange Cat)
             g.fillStyle(0xFFA500, 1.0); // Orange
             g.fillRect(10, 25, 30, 35);

             // Head
             g.fillCircle(25, 20, 15);

             // Ears
             g.beginPath();
             g.moveTo(15, 10); g.lineTo(10, 0); g.lineTo(25, 10); // Left Ear
             g.moveTo(25, 10); g.lineTo(40, 0); g.lineTo(35, 10); // Right Ear
             g.fillPath();

             // Eye (Looking Right)
             g.fillStyle(0x000000, 1.0);
             g.fillCircle(30, 18, 2);

             // Whiskers
             g.lineStyle(1, 0x000000, 1.0);
             g.beginPath(); g.moveTo(35, 20); g.lineTo(45, 18); g.strokePath();
             g.beginPath(); g.moveTo(35, 22); g.lineTo(45, 24); g.strokePath();

             // Tail
             g.lineStyle(3, 0xFFA500, 1.0);
             g.beginPath(); g.moveTo(10, 50); g.bezierCurveTo(0, 50, 0, 40, 5, 35); g.strokePath();

             g.generateTexture('player_side', 50, 64);
        }

        // Player Jump
        if (!this.textures.exists('player_jump')) {
             const g = this.make.graphics({ x: 0, y: 0, add: false });

             // Body (Stretched)
             g.fillStyle(0xFFA500, 1.0);
             g.fillRect(10, 25, 30, 40);

             // Head
             g.fillCircle(25, 20, 15);

             // Ears
             g.beginPath();
             g.moveTo(15, 10); g.lineTo(10, 0); g.lineTo(25, 10);
             g.moveTo(25, 10); g.lineTo(40, 0); g.lineTo(35, 10);
             g.fillPath();

             // Eye (Looking Up/Right)
             g.fillStyle(0x000000, 1.0);
             g.fillCircle(30, 15, 2);

             // Legs (Tucked)
             g.fillRect(10, 60, 10, 10);
             g.fillRect(30, 58, 10, 10);

             // Tail (Up)
             g.lineStyle(3, 0xFFA500, 1.0);
             g.beginPath(); g.moveTo(10, 50); g.lineTo(5, 30); g.strokePath();

             g.generateTexture('player_jump', 50, 75);
        }
    }

    private spawnFloor(y: number, forceCount?: number, forceType?: string) {
        const width = this.scale.width;

        // Determine Count (2 to 5)
        const count = forceCount || Phaser.Math.Between(2, 5);
        const segmentWidth = width / count;

        for (let i = 0; i < count; i++) {
            // Determine Type
            let type = 'wood';
            if (forceType) {
                type = forceType;
            } else {
                const rand = Math.random();
                if (rand < 0.70) type = 'wood';
                else if (rand < 0.85) type = 'rubber';
                else if (rand < 0.95) type = 'electric';
                else type = 'plasma';
            }

            // Get Texture Key
            const textureKey = `platform_${type}`;

            // We need to create a sprite/image.
            // Since we use a Group now, we can create/reuse.
            let platform = this.platforms.getFirstDead() as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

            if (!platform) {
                platform = this.platforms.create(0, 0, textureKey);
            } else {
                platform.setTexture(textureKey);
                platform.setActive(true).setVisible(true);
            }

            // Random width for platform
            const maxW = Math.min(250, segmentWidth - 20);
            const w = Phaser.Math.Between(80, maxW);

            // Texture is 100px wide. Scale to match 'w'.
            const scaleX = w / 100;

            const minX = i * segmentWidth + w/2 + 10;
            const maxX = (i + 1) * segmentWidth - w/2 - 10;
            const x = Phaser.Math.Between(minX, maxX);

            platform.enableBody(true, x, y, true, true);
            platform.setScale(scaleX, 1);
            platform.body.updateFromGameObject(); // Refresh body size

            const body = platform.body as Phaser.Physics.Arcade.Body;
            body.setImmovable(true);
            body.moves = false; // It's a static platform effectively
            body.checkCollision.down = false;
            body.checkCollision.left = false;
            body.checkCollision.right = false;
            body.checkCollision.up = true;

            platform.setData('type', type);
            platform.clearTint(); // Reset tints if any
        }
    }

    private handleInput() {
        if (this.isGameOver) return;
        this.moveDirection *= -1;
    }

    update(time: number, delta: number) {
        if (this.isGameOver) return;

        // --- Movement ---
        const speed = 400;
        this.player.setVelocityX(speed * this.moveDirection);

        // Wrap
        const width = this.scale.width;
        if (this.player.x < 0) this.player.x = width;
        else if (this.player.x > width) this.player.x = 0;

        // --- Flight Logic ---
        if (this.isFlying) {
            this.flyTimer -= delta;
            this.player.setVelocityY(this.flyVelocity);

            // Stop flying
            if (this.flyTimer <= 0) {
                this.isFlying = false;
            }
        }

        // --- Animation ---
        this.player.setFlipX(this.moveDirection === -1);
        // If flying, maybe use jump texture
        if (this.isFlying || !this.player.body.touching.down) {
             if (this.player.texture.key !== 'player_jump') {
                 this.player.setTexture('player_jump');
             }
        } else {
            if (this.player.texture.key !== 'player_side') {
                this.player.setTexture('player_side');
            }
        }

        // --- Infinite Generation ---
        const cameraBottom = this.cameras.main.scrollY + this.scale.height;
        this.platforms.children.iterate((p: any) => {
            if (p.active && p.y > cameraBottom + 100) {
                this.platforms.killAndHide(p);
                p.disableBody(true, true);
            }
            return true;
        });

        const cameraTop = this.cameras.main.scrollY;
        while (this.highestY > cameraTop - 300) {
             this.highestY -= this.platformVerticalDistance;
             this.spawnFloor(this.highestY);
        }

        // --- Score ---
        const startY = this.scale.height - 300;
        if (this.player.y < startY) {
            const currentScore = Math.floor((startY - this.player.y) / 100);
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
        // If flying, ignore platform collisions (pass through)
        // Actually, if we are flying UP, checkCollision.down is false, so we pass through bottom.
        // checkCollision.up is true, so we land on top.
        // If we want to fly THROUGH platforms (upwards), we are fine.
        // If we land on a platform while flying (e.g. flight speed is slow?), we might stop.
        // But flight speed is -2000 or -3000. It overrides gravity.
        // We set velocityY every frame in update(), so collision might set it to 0, but next frame it sets back to -2000.
        // Result: jittery movement through platforms.
        // Better: Temporarily disable collisions while flying.

        if (this.isFlying) return;

        const body = player.body as Phaser.Physics.Arcade.Body;
        if (body.touching.down) {
            const type = platform.getData('type');

            if (type === 'rubber') {
                body.setVelocityY(-2500); // 3x Jump (Base is ~800-1000? gravity 1500. Sqrt(2*1500*height). Let's say -2500 is good 3x)
            } else if (type === 'electric') {
                this.startFlight(-2000, 2000); // 2x Speed, 2000ms
            } else if (type === 'plasma') {
                this.startFlight(-3000, 3000); // 3x Speed, 3000ms
            } else {
                 body.setVelocityY(-1100); // Normal
            }
        }
    }

    private startFlight(velocity: number, duration: number) {
        this.isFlying = true;
        this.flyVelocity = velocity;
        this.flyTimer = duration;
        // Lift off immediately
        this.player.setVelocityY(velocity);
    }

    private createUI() {
        const { width } = this.scale;
        const pillW = 120;
        const pillH = 50;
        const pillX = 40;
        const pillY = 40;

        this.scoreBg = this.add.graphics();
        this.scoreBg.fillStyle(0xffffff, 0.9);
        this.scoreBg.fillRoundedRect(pillX, pillY, pillW, pillH, 25);
        this.scoreBg.setScrollFactor(0).setDepth(10);

        this.scoreText = this.add.text(pillX + pillW/2, pillY + pillH/2, '0', {
            fontSize: '32px',
            color: '#4285f4',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(11);
    }

    private showGameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.physics.pause();

        const { width, height } = this.scale;

        const container = this.add.container(width * 0.5, height * 0.5).setDepth(100).setScrollFactor(0);
        const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.85);

        const cardW = 500;
        const cardH = 400;
        const card = this.add.graphics();
        card.fillStyle(0xffffff, 1.0);
        card.fillRoundedRect(-cardW/2, -cardH/2, cardW, cardH, 30);

        const title = this.add.text(0, -100, 'Game Over', {
            fontSize: '56px',
            color: '#202124',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const scoreLabel = this.add.text(0, 0, 'Score', {
            fontSize: '32px',
            color: '#5f6368',
            fontFamily: 'Arial, sans-serif'
        }).setOrigin(0.5);

        const scoreVal = this.add.text(0, 50, `${this.score}`, {
            fontSize: '64px',
            color: '#4285f4',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const btnW = 200;
        const btnH = 60;
        const btnY = 120;

        const btn = this.add.container(0, btnY);
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x4285f4, 1.0);
        btnBg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 30);

        const btnText = this.add.text(0, 0, 'Exit', {
            fontSize: '28px',
            color: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        btn.add([btnBg, btnText]);
        const hitArea = this.add.rectangle(0, btnY, btnW, btnH, 0x000000, 0).setInteractive({ cursor: 'pointer' });
        hitArea.on('pointerdown', () => {
            this.scene.start('LobbyScene');
        });

        container.add([bg, card, title, scoreLabel, scoreVal, btn, hitArea]);
    }
}
