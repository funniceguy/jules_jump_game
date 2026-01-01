import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private platforms!: Phaser.Physics.Arcade.Group;
    private items!: Phaser.Physics.Arcade.Group; // Items group
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    // UI & Controls
    private scoreText!: Phaser.GameObjects.Text;
    private scoreBg!: Phaser.GameObjects.Graphics;
    private timerText!: Phaser.GameObjects.Text;
    private timerBg!: Phaser.GameObjects.Graphics;

    private heightScore = 0; // Score from climbing
    private itemScore = 0;   // Score from items

    // Toggle Control
    private moveDirection = 1;

    // Configuration
    private readonly platformVerticalDistance = 220;
    private readonly targetScore = 10000;
    private timeLeft = 180000; // 3 Minutes in ms

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
        this.timeLeft = 180000; // Reset Timer

        // --- Assets ---
        this.createAssets();

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

        // Initialize First Floor (Wood)
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
        // Increase lerpY to 0.2 for faster tracking.
        // Follow offset (0, 200) helps keep player lower in the frame.
        this.cameras.main.startFollow(this.player, true, 0, 0.2, 0, 200);
        // Reduce Deadzone height to prevent player from moving too far up before camera moves
        this.cameras.main.setDeadzone(0, 100);

        // --- UI & Controls ---
        this.createUI();
        this.createControls(); // New Controls

        // Input Listener (Toggle) - Only on game area, avoiding buttons?
        // We'll attach a broad listener but check target.
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, gameObjects: any[]) => {
            if (gameObjects.length === 0) {
                this.handleInput();
            }
        }, this);

        // Keyboard
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.input.keyboard.on('keydown-SPACE', () => this.handleInput());
        }
    }

    private createAssets() {
        // --- Platforms ---
        const w = 100;
        const h = 30;

        // Wood
        if (!this.textures.exists('platform_wood')) {
            const g = this.make.graphics({x:0, y:0, add: false});
            g.fillStyle(0x8B4513, 1.0);
            g.fillRect(0, 0, w, h);
            g.lineStyle(2, 0xDAA520, 1.0);
            g.beginPath(); g.moveTo(0, 5); g.lineTo(w, 5); g.strokePath();
            g.beginPath(); g.moveTo(0, 15); g.lineTo(w, 15); g.strokePath();
            g.generateTexture('platform_wood', w, h);
        }
        // Rubber
        if (!this.textures.exists('platform_rubber')) {
            const g = this.make.graphics({x:0, y:0, add: false});
            g.fillStyle(0xFF69B4, 1.0);
            g.fillRoundedRect(0, 0, w, h, 15);
            g.lineStyle(2, 0xFF1493, 1.0);
            g.strokeRoundedRect(0, 0, w, h, 15);
            g.generateTexture('platform_rubber', w, h);
        }
        // Electric
        if (!this.textures.exists('platform_electric')) {
            const g = this.make.graphics({x:0, y:0, add: false});
            g.fillStyle(0x2F4F4F, 1.0);
            g.fillRect(0, 0, w, h);
            g.fillStyle(0xFFFF00, 1.0);
            g.beginPath();
            g.moveTo(10, 5); g.lineTo(30, 25); g.lineTo(50, 5); g.lineTo(70, 25); g.lineTo(90, 5);
            g.lineTo(90, 10); g.lineTo(70, 30); g.lineTo(50, 10); g.lineTo(30, 30); g.lineTo(10, 10);
            g.closePath();
            g.fillPath();
            g.generateTexture('platform_electric', w, h);
        }
        // Plasma
        if (!this.textures.exists('platform_plasma')) {
            const g = this.make.graphics({x:0, y:0, add: false});
            g.fillStyle(0x4B0082, 1.0);
            g.fillRect(0, 0, w, h);
            g.lineStyle(4, 0x00FFFF, 1.0);
            g.strokeRect(0, 0, w, h);
            g.fillStyle(0x00FFFF, 0.5);
            g.fillRect(5, 5, w-10, h-10);
            g.generateTexture('platform_plasma', w, h);
        }

        // --- Items ---
        // Fish (50 pts)
        if (!this.textures.exists('item_fish')) {
            const g = this.make.graphics({x:0, y:0, add: false});
            g.fillStyle(0x4682B4, 1.0); // SteelBlue
            g.fillEllipse(20, 20, 30, 15);
            g.fillTriangle(35, 20, 50, 10, 50, 30); // Tail
            g.generateTexture('item_fish', 50, 40);
        }
        // Milk (100 pts)
        if (!this.textures.exists('item_milk')) {
            const g = this.make.graphics({x:0, y:0, add: false});
            g.fillStyle(0xFFFFFF, 1.0);
            g.fillRect(10, 15, 20, 25); // Carton body
            g.fillTriangle(10, 15, 30, 15, 20, 5); // Top
            g.lineStyle(1, 0x000000);
            g.strokeRect(10, 15, 20, 25);
            g.generateTexture('item_milk', 40, 40);
        }
        // Cookie (150 pts)
        if (!this.textures.exists('item_cookie')) {
            const g = this.make.graphics({x:0, y:0, add: false});
            g.fillStyle(0xD2691E, 1.0); // Chocolate
            g.fillCircle(20, 20, 15);
            g.fillStyle(0x3E2723, 1.0); // Chips
            g.fillCircle(15, 15, 2);
            g.fillCircle(25, 18, 2);
            g.fillCircle(20, 25, 2);
            g.generateTexture('item_cookie', 40, 40);
        }
        // Flower (200 pts)
        if (!this.textures.exists('item_flower')) {
            const g = this.make.graphics({x:0, y:0, add: false});
            g.fillStyle(0xFF69B4, 1.0); // HotPink Petals
            g.fillCircle(10, 20, 8);
            g.fillCircle(30, 20, 8);
            g.fillCircle(20, 10, 8);
            g.fillCircle(20, 30, 8);
            g.fillStyle(0xFFFF00, 1.0); // Yellow Center
            g.fillCircle(20, 20, 8);
            g.generateTexture('item_flower', 40, 40);
        }
        // Gem (500 pts)
        if (!this.textures.exists('item_gem')) {
            const g = this.make.graphics({x:0, y:0, add: false});
            g.fillStyle(0x00FFFF, 1.0); // Cyan
            g.beginPath();
            g.moveTo(20, 5); g.lineTo(35, 15); g.lineTo(20, 35); g.lineTo(5, 15);
            g.closePath();
            g.fillPath();
            g.fillStyle(0xFFFFFF, 0.5); // Shine
            g.fillTriangle(20, 5, 25, 15, 15, 15);
            g.generateTexture('item_gem', 40, 40);
        }

        // --- Character (Cat) ---
        // Player Side
        if (!this.textures.exists('player_side')) {
             const g = this.make.graphics({ x: 0, y: 0, add: false });
             g.fillStyle(0xFFA500, 1.0);
             g.fillRect(10, 25, 30, 35);
             g.fillCircle(25, 20, 15);
             g.beginPath(); g.moveTo(15, 10); g.lineTo(10, 0); g.lineTo(25, 10);
             g.moveTo(25, 10); g.lineTo(40, 0); g.lineTo(35, 10); g.fillPath();
             g.fillStyle(0x000000, 1.0); g.fillCircle(30, 18, 2);
             g.lineStyle(1, 0x000000, 1.0);
             g.beginPath(); g.moveTo(35, 20); g.lineTo(45, 18); g.strokePath();
             g.beginPath(); g.moveTo(35, 22); g.lineTo(45, 24); g.strokePath();
             g.lineStyle(3, 0xFFA500, 1.0);
             // Fixed crash with lineTo
             g.beginPath(); g.moveTo(10, 50); g.lineTo(0, 45); g.lineTo(5, 35); g.strokePath();
             g.generateTexture('player_side', 50, 64);
        }
        // Player Jump
        if (!this.textures.exists('player_jump')) {
             const g = this.make.graphics({ x: 0, y: 0, add: false });
             g.fillStyle(0xFFA500, 1.0);
             g.fillRect(10, 25, 30, 40);
             g.fillCircle(25, 20, 15);
             g.beginPath(); g.moveTo(15, 10); g.lineTo(10, 0); g.lineTo(25, 10);
             g.moveTo(25, 10); g.lineTo(40, 0); g.lineTo(35, 10); g.fillPath();
             g.fillStyle(0x000000, 1.0); g.fillCircle(30, 15, 2);
             g.fillRect(10, 60, 10, 10); g.fillRect(30, 58, 10, 10);
             g.lineStyle(3, 0xFFA500, 1.0);
             g.beginPath(); g.moveTo(10, 50); g.lineTo(5, 30); g.strokePath();
             g.generateTexture('player_jump', 50, 75);
        }
    }

    private spawnFloor(y: number, forceCount?: number, forceType?: string, isStartPlatform: boolean = false) {
        const width = this.scale.width;

        let count = 1;
        if (forceCount !== undefined) {
            count = forceCount;
        } else {
            // Logic: 3 -> 1, 1 -> 2, Else -> Random(1,3)
            if (this.lastPlatformCount === 3) {
                count = 1;
            } else if (this.lastPlatformCount === 1) {
                count = 2;
            } else {
                count = Phaser.Math.Between(1, 3);
            }
        }
        this.lastPlatformCount = count;

        const segmentWidth = width / count;

        for (let i = 0; i < count; i++) {
            let type = 'wood';
            if (forceType) {
                type = forceType;
            } else {
                const rand = Math.random();
                // Wood: 60% (0.00 - 0.60)
                // Rubber: 10% (0.60 - 0.70) - "Jump Platform slightly less"
                // Electric: 20% (0.70 - 0.90) - "2x Flight"
                // Plasma: 10% (0.90 - 1.00) - "3x Flight"
                if (rand < 0.60) type = 'wood';
                else if (rand < 0.70) type = 'rubber';
                else if (rand < 0.90) type = 'electric';
                else type = 'plasma';
            }

            const textureKey = `platform_${type}`;
            let platform = this.platforms.getFirstDead() as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

            if (!platform) {
                platform = this.platforms.create(0, 0, textureKey);
            } else {
                platform.setTexture(textureKey);
                platform.setActive(true).setVisible(true);
            }

            // Width Logic
            let w = 100;
            let x = 0;

            if (isStartPlatform) {
                w = width; // Fill screen
                x = width / 2;
            } else {
                // Max Width = 25% of screen width
                const maxAllowed = width * 0.25;
                const maxW = Math.min(maxAllowed, segmentWidth - 20);
                const minW = 80;
                const safeMax = Math.max(minW, maxW);

                w = Phaser.Math.Between(minW, safeMax);

                const minX = i * segmentWidth + w/2 + 10;
                const maxX = (i + 1) * segmentWidth - w/2 - 10;
                x = Phaser.Math.Between(minX, maxX);
            }

            const scaleX = w / 100;

            platform.enableBody(true, x, y, true, true);
            platform.setScale(scaleX, 1);
            platform.body.updateFromGameObject();

            const body = platform.body as Phaser.Physics.Arcade.Body;
            body.setImmovable(true);
            body.moves = false;
            body.checkCollision.down = false;
            body.checkCollision.left = false;
            body.checkCollision.right = false;
            body.checkCollision.up = true;

            platform.setData('type', type);
            platform.clearTint();

            // --- Spawn Item Chance (30%) ---
            if (Math.random() < 0.3) {
                this.spawnItem(x, y - 40);
            }
        }
    }

    private spawnItem(x: number, y: number) {
        // Rarity
        // Fish (30%), Milk (25%), Cookie (20%), Flower (15%), Gem (10%)
        const rand = Math.random();
        let itemType = 'item_fish';
        let value = 100; // All doubled

        if (rand < 0.30) { itemType = 'item_fish'; value = 100; }
        else if (rand < 0.55) { itemType = 'item_milk'; value = 200; }
        else if (rand < 0.75) { itemType = 'item_cookie'; value = 300; }
        else if (rand < 0.90) { itemType = 'item_flower'; value = 400; }
        else { itemType = 'item_gem'; value = 1000; }

        let item = this.items.getFirstDead();
        if (!item) {
            item = this.items.create(x, y, itemType);
        } else {
            item.setTexture(itemType);
            item.setActive(true).setVisible(true);
            item.setPosition(x, y);
            item.enableBody(true, x, y, true, true);
        }
        item.setData('value', value);
    }

    private collectItem(player: any, item: any) {
        item.disableBody(true, true);
        const val = item.getData('value');
        this.itemScore += val;

        const text = this.add.text(item.x, item.y, `+${val}`, {
            fontSize: '24px',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        this.tweens.add({
            targets: text,
            y: item.y - 50,
            alpha: 0,
            duration: 800,
            onComplete: () => text.destroy()
        });
    }

    private handleInput() {
        if (this.isGameOver || this.isGameClear) return;
        // Basic toggle still exists if clicking empty space
        this.moveDirection *= -1;
    }

    private performJump() {
        if (this.isGameOver || this.isGameClear || this.isFlying) return;
        const body = this.player.body as Phaser.Physics.Arcade.Body;

        // Logic: If in air and canDoubleJump is true, Jump again.
        if (!body.touching.down && this.canDoubleJump) {
            this.player.setVelocityY(-1000); // Standard jump force
            this.canDoubleJump = false;

            // Visual feedback
            this.tweens.add({
                targets: this.player,
                scaleX: 1.2,
                scaleY: 0.8,
                duration: 100,
                yoyo: true
            });

            // Spawn text
            const txt = this.add.text(this.player.x, this.player.y - 50, 'Double Jump!', {
                fontSize: '20px', color: '#ff00ff', stroke: '#000', strokeThickness: 2
            }).setOrigin(0.5);
            this.tweens.add({ targets: txt, y: txt.y - 50, alpha: 0, duration: 500, onComplete: () => txt.destroy() });
        }
    }

    private performDash() {
        if (this.isGameOver || this.isGameClear || this.isDashing) return;

        this.isDashing = true;
        this.dashTimer = 200; // 200ms dash

        // Visual
        const txt = this.add.text(this.player.x, this.player.y - 50, 'Dash!', {
            fontSize: '20px', color: '#00ffff', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5);
        this.tweens.add({ targets: txt, y: txt.y - 50, alpha: 0, duration: 500, onComplete: () => txt.destroy() });
    }

    update(time: number, delta: number) {
        if (this.isGameOver || this.isGameClear) return;

        // --- Timer Logic ---
        this.timeLeft -= delta;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.updateTimerText();
            this.showGameOver(true);
            return;
        }
        this.updateTimerText();

        // --- Movement ---
        if (this.isDashing) {
            this.dashTimer -= delta;
            const dashSpeed = 1000;
            this.player.setVelocityX(dashSpeed * this.moveDirection);
            this.player.setVelocityY(0); // Optional: Defy gravity during dash?
            if (this.dashTimer <= 0) {
                this.isDashing = false;
            }
        } else {
            const speed = 400;
            this.player.setVelocityX(speed * this.moveDirection);
        }

        const width = this.scale.width;
        if (this.player.x < 0) {
            this.player.x = width; // Wrap
            this.cameras.main.scrollX = 0; // Ensure camera X stays 0
        }
        else if (this.player.x > width) {
            this.player.x = 0; // Wrap
            this.cameras.main.scrollX = 0;
        }

        // Safety: Ensure camera X is always 0
        this.cameras.main.scrollX = 0;

        // --- Flight Logic ---
        if (this.isFlying) {
            this.flyTimer -= delta;
            this.player.setVelocityY(this.flyVelocity);
            if (this.flyTimer <= 0) {
                this.isFlying = false;
            }
        }

        // --- Animation ---
        this.player.setFlipX(this.moveDirection === -1);
        if (this.isFlying || !this.player.body.touching.down) {
             if (this.player.texture.key !== 'player_jump') {
                 this.player.setTexture('player_jump');
             }
        } else {
            if (this.player.texture.key !== 'player_side') {
                this.player.setTexture('player_side');
            }
        }

        // --- Infinite Generation & Cleanup ---
        const cameraBottom = this.cameras.main.scrollY + this.scale.height;

        this.platforms.children.iterate((p: any) => {
            if (p.active && p.y > cameraBottom + 100) {
                this.platforms.killAndHide(p);
                p.disableBody(true, true);
            }
            return true;
        });

        this.items.children.iterate((i: any) => {
             if (i.active && i.y > cameraBottom + 100) {
                 this.items.killAndHide(i);
                 i.disableBody(true, true);
             }
             return true;
        });

        const cameraTop = this.cameras.main.scrollY;
        while (this.highestY > cameraTop - 300) {
             this.highestY -= this.platformVerticalDistance;
             this.spawnFloor(this.highestY);
        }

        // --- Score Calculation ---
        const startY = this.scale.height - 300;
        let hScore = 0;
        if (this.player.y < startY) {
            hScore = Math.floor((startY - this.player.y) / 200); // Reduced Score (was 100)
            if (hScore > this.heightScore) {
                this.heightScore = hScore;
            }
        }

        const totalScore = this.heightScore + this.itemScore;
        this.scoreText.setText(`${totalScore} / ${this.targetScore}`);

        // Win Condition
        if (totalScore >= this.targetScore) {
            this.showGameClear();
        }

        // Game Over (Fall)
        if (this.player.y > cameraBottom + 100) {
            this.showGameOver(false);
        }
    }

    private updateTimerText() {
        const totalSeconds = Math.floor(this.timeLeft / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const ms = Math.floor((this.timeLeft % 1000) / 10); // 2 digits

        const minStr = minutes.toString().padStart(2, '0');
        const secStr = seconds.toString().padStart(2, '0');
        const msStr = ms.toString().padStart(2, '0');

        this.timerText.setText(`${minStr}:${secStr}:${msStr}`);

        // Warning Color if low time (< 60s)
        if (totalSeconds < 60) {
            this.timerText.setColor('#ff0000');
        } else {
            this.timerText.setColor('#ffffff');
        }
    }

    private handleCollision(player: any, platform: any) {
        if (this.isFlying) return;

        const body = player.body as Phaser.Physics.Arcade.Body;
        if (body.touching.down) {
            // Reset Double Jump
            this.canDoubleJump = true;
            this.isDashing = false;

            const type = platform.getData('type');
            if (type === 'rubber') {
                body.setVelocityY(-2500);
            } else if (type === 'electric') {
                this.startFlight(-2000, 2000);
            } else if (type === 'plasma') {
                this.startFlight(-3000, 3000);
            } else {
                 body.setVelocityY(-1100);
            }
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

        // Score UI
        const pillW = 250; // Wider for target score
        const pillH = 50;
        const pillX = 40;
        const pillY = 40;

        this.scoreBg = this.add.graphics();
        this.scoreBg.fillStyle(0xffffff, 0.9);
        this.scoreBg.fillRoundedRect(pillX, pillY, pillW, pillH, 25);
        this.scoreBg.setScrollFactor(0).setDepth(10);

        this.scoreText = this.add.text(pillX + pillW/2, pillY + pillH/2, `0 / ${this.targetScore}`, {
            fontSize: '24px',
            color: '#4285f4',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(11);

        // Timer UI (Top Center)
        const timerW = 180;
        const timerX = width / 2 - timerW / 2;
        const timerY = 40;

        this.timerBg = this.add.graphics();
        this.timerBg.fillStyle(0x000000, 0.5);
        this.timerBg.fillRoundedRect(timerX, timerY, timerW, pillH, 25);
        this.timerBg.setScrollFactor(0).setDepth(10);

        this.timerText = this.add.text(width / 2, timerY + pillH/2, '03:00:00', {
            fontSize: '28px',
            color: '#ffffff',
            fontFamily: 'monospace',
            fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(11);
    }

    private createControls() {
        const { width, height } = this.scale;

        // Button Config - Split bottom area
        const btnHeight = 150;
        const btnY = height - btnHeight;

        // --- Jump Button (Left Half) ---
        const jumpBtn = this.add.rectangle(0, btnY, width / 2, btnHeight, 0x00ff00, 0.2)
            .setOrigin(0, 0) // Top-Left of the button area
            .setScrollFactor(0)
            .setDepth(20)
            .setInteractive();

        const jumpText = this.add.text(width * 0.25, btnY + btnHeight / 2, 'JUMP', {
            fontSize: '40px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(21);

        jumpBtn.on('pointerdown', () => {
            this.performJump();
            jumpBtn.setFillStyle(0x00ff00, 0.4); // Highlight
        });
        jumpBtn.on('pointerup', () => jumpBtn.setFillStyle(0x00ff00, 0.2));
        jumpBtn.on('pointerout', () => jumpBtn.setFillStyle(0x00ff00, 0.2));

        // --- Dash Button (Right Half) ---
        const dashBtn = this.add.rectangle(width / 2, btnY, width / 2, btnHeight, 0x00ffff, 0.2)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(20)
            .setInteractive();

        const dashText = this.add.text(width * 0.75, btnY + btnHeight / 2, 'DASH', {
            fontSize: '40px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(21);

        dashBtn.on('pointerdown', () => {
            this.performDash();
            dashBtn.setFillStyle(0x00ffff, 0.4);
        });
        dashBtn.on('pointerup', () => dashBtn.setFillStyle(0x00ffff, 0.2));
        dashBtn.on('pointerout', () => dashBtn.setFillStyle(0x00ffff, 0.2));
    }

    private showGameOver(isTimeOver: boolean) {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.physics.pause();

        const { width, height } = this.scale;

        // Background
        const bg = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.85)
            .setScrollFactor(0)
            .setDepth(100)
            .setInteractive(); // Block input

        // Card
        const cardW = 500;
        const cardH = 400;
        const card = this.add.graphics();
        card.fillStyle(0xffffff, 1.0);
        card.fillRoundedRect((width - cardW)/2, (height - cardH)/2, cardW, cardH, 30);
        card.setScrollFactor(0).setDepth(101);

        // Text
        const titleText = isTimeOver ? 'Time Over' : 'Game Over';
        const titleColor = isTimeOver ? '#FF0000' : '#202124';

        const title = this.add.text(width/2, height/2 - 100, titleText, {
            fontSize: '56px',
            color: titleColor,
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(102);

        const scoreLabel = this.add.text(width/2, height/2, 'Score', {
            fontSize: '32px',
            color: '#5f6368',
            fontFamily: 'Arial, sans-serif'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(102);

        const totalScore = this.heightScore + this.itemScore;
        const scoreVal = this.add.text(width/2, height/2 + 50, `${totalScore}`, {
            fontSize: '64px',
            color: '#4285f4',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(102);

        // Exit Button
        const btnW = 200;
        const btnH = 60;
        const btnY = height/2 + 120;

        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x4285f4, 1.0);
        btnBg.fillRoundedRect(width/2 - btnW/2, btnY - btnH/2, btnW, btnH, 30);
        btnBg.setScrollFactor(0).setDepth(103);

        const btnText = this.add.text(width/2, btnY, 'Exit', {
            fontSize: '28px',
            color: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(104);

        // Clickable Hit Area
        const hitArea = this.add.rectangle(width/2, btnY, btnW, btnH, 0xff0000, 0)
            .setScrollFactor(0)
            .setDepth(105)
            .setInteractive({ useHandCursor: true });

        hitArea.on('pointerdown', () => {
            this.scene.start('LobbyScene');
        });
    }

    private showGameClear() {
        if (this.isGameClear || this.isGameOver) return;
        this.isGameClear = true;
        this.physics.pause();

        const { width, height } = this.scale;

        // Background
        const bg = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.85)
            .setScrollFactor(0)
            .setDepth(100)
            .setInteractive();

        // Card
        const cardW = 500;
        const cardH = 400;
        const card = this.add.graphics();
        card.fillStyle(0xFFD700, 1.0); // Gold
        card.fillRoundedRect((width - cardW)/2, (height - cardH)/2, cardW, cardH, 30);
        card.setScrollFactor(0).setDepth(101);

        // Title
        this.add.text(width/2, height/2 - 80, 'Mission Clear!', {
            fontSize: '56px',
            color: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(102);

        // Final Score
        const totalScore = this.heightScore + this.itemScore;
        this.add.text(width/2, height/2 + 20, `Final Score: ${totalScore}`, {
            fontSize: '36px',
            color: '#000000',
            fontFamily: 'Arial, sans-serif'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(102);

        // Clear Stage Button
        const btnW = 250;
        const btnH = 70;
        const btnY = height/2 + 120;

        const btnBg = this.add.graphics();
        btnBg.fillStyle(0xffffff, 1.0);
        btnBg.fillRoundedRect(width/2 - btnW/2, btnY - btnH/2, btnW, btnH, 30);
        btnBg.setScrollFactor(0).setDepth(103);

        const btnText = this.add.text(width/2, btnY, 'Clear Stage', {
            fontSize: '32px',
            color: '#4285f4',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(104);

        const hitArea = this.add.rectangle(width/2, btnY, btnW, btnH, 0xff0000, 0)
            .setScrollFactor(0)
            .setDepth(105)
            .setInteractive({ useHandCursor: true });

        hitArea.on('pointerdown', () => {
            this.scene.start('LobbyScene');
        });
    }
}
