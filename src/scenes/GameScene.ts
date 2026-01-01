import Phaser from 'phaser';
import { GameData } from '../managers/GameData';

export default class GameScene extends Phaser.Scene {
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private platforms!: Phaser.Physics.Arcade.Group;
    private items!: Phaser.Physics.Arcade.Group;
    private enemies!: Phaser.Physics.Arcade.Group;
    private bullets!: Phaser.Physics.Arcade.Group;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

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
    private readonly targetScore = 10000;
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
    private shootTimer = 0;
    private playerHP = 100;

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
        this.shootTimer = 0;
        this.playerHP = data.playerMaxHP;

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

        this.enemies = this.physics.add.group({
            runChildUpdate: false,
            allowGravity: false,
            immovable: true
        });

        this.bullets = this.physics.add.group({
            runChildUpdate: true, // Bullets move
            allowGravity: false
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
        // Player vs Enemy
        this.physics.add.overlap(this.player, this.enemies, this.hitEnemyBody, undefined, this);
        // Bullet vs Enemy
        this.physics.add.overlap(this.bullets, this.enemies, this.bulletHitEnemy, undefined, this);

        // --- Camera ---
        this.cameras.main.startFollow(this.player, true, 0, 0.2, 0, 200);
        this.cameras.main.setDeadzone(0, 100);

        // --- UI & Controls ---
        this.createUI();
        this.createControls();

        // Input Listener
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
        // Reuse existing assets...
        // Add Enemy Asset
        if (!this.textures.exists('enemy_red')) {
            const g = this.make.graphics({x:0, y:0, add: false});
            g.fillStyle(0xff0000, 1.0);
            g.fillCircle(20, 20, 20);
            g.fillStyle(0x000000, 1.0); // Eyes
            g.fillCircle(12, 15, 3);
            g.fillCircle(28, 15, 3);
            g.generateTexture('enemy_red', 40, 40);
        }
        // Add Bullet Asset
        if (!this.textures.exists('bullet')) {
            const g = this.make.graphics({x:0, y:0, add: false});
            g.fillStyle(0xffff00, 1.0);
            g.fillCircle(5, 5, 5);
            g.generateTexture('bullet', 10, 10);
        }
        // ... (Keep existing platform/item asset gen if needed, or assume they persist)
        // For safety, let's just assume they exist from previous runs or add the check if missing.
        // I will trust the previous code block context but adding them is safer.
        // Let's assume the previous asset creation code is still valid if not overwritten.
        // Actually, since I am overwriting the file, I MUST include all asset generation.
        const w = 100; const h = 30;
        if (!this.textures.exists('platform_wood')) {
            const g = this.make.graphics({x:0, y:0, add: false});
            g.fillStyle(0x8B4513, 1.0); g.fillRect(0, 0, w, h);
            g.lineStyle(2, 0xDAA520, 1.0); g.strokeRect(0,0,w,h);
            g.generateTexture('platform_wood', w, h);
        }
        if (!this.textures.exists('platform_rubber')) {
            const g = this.make.graphics({x:0, y:0, add: false});
            g.fillStyle(0xFF69B4, 1.0); g.fillRoundedRect(0, 0, w, h, 15);
            g.generateTexture('platform_rubber', w, h);
        }
        if (!this.textures.exists('platform_electric')) {
            const g = this.make.graphics({x:0, y:0, add: false});
            g.fillStyle(0x2F4F4F, 1.0); g.fillRect(0, 0, w, h);
            g.fillStyle(0xFFFF00, 1.0); g.fillTriangle(10,5,30,25,50,5);
            g.generateTexture('platform_electric', w, h);
        }
        if (!this.textures.exists('platform_plasma')) {
            const g = this.make.graphics({x:0, y:0, add: false});
            g.fillStyle(0x4B0082, 1.0); g.fillRect(0, 0, w, h);
            g.lineStyle(4, 0x00FFFF, 1.0); g.strokeRect(0,0,w,h);
            g.generateTexture('platform_plasma', w, h);
        }
        // Items
        if (!this.textures.exists('item_fish')) {
            const g = this.make.graphics({x:0, y:0, add: false});
            g.fillStyle(0x4682B4, 1.0); g.fillEllipse(20, 20, 30, 15);
            g.generateTexture('item_fish', 50, 40);
        }
        if (!this.textures.exists('item_milk')) {
            const g = this.make.graphics({x:0, y:0, add: false});
            g.fillStyle(0xFFFFFF, 1.0); g.fillRect(10, 15, 20, 25);
            g.generateTexture('item_milk', 40, 40);
        }
        if (!this.textures.exists('item_cookie')) {
            const g = this.make.graphics({x:0, y:0, add: false});
            g.fillStyle(0xD2691E, 1.0); g.fillCircle(20, 20, 15);
            g.generateTexture('item_cookie', 40, 40);
        }
        if (!this.textures.exists('item_flower')) {
            const g = this.make.graphics({x:0, y:0, add: false});
            g.fillStyle(0xFF69B4, 1.0); g.fillCircle(20, 20, 8);
            g.generateTexture('item_flower', 40, 40);
        }
        if (!this.textures.exists('item_gem')) {
            const g = this.make.graphics({x:0, y:0, add: false});
            g.fillStyle(0x00FFFF, 1.0); g.fillTriangle(20,5,35,15,5,15);
            g.generateTexture('item_gem', 40, 40);
        }
        // Player
        if (!this.textures.exists('player_side')) {
             const g = this.make.graphics({ x: 0, y: 0, add: false });
             g.fillStyle(0xFFA500, 1.0); g.fillRect(10, 25, 30, 35); g.fillCircle(25, 20, 15);
             g.generateTexture('player_side', 50, 64);
        }
        if (!this.textures.exists('player_jump')) {
             const g = this.make.graphics({ x: 0, y: 0, add: false });
             g.fillStyle(0xFFA500, 1.0); g.fillRect(10, 25, 30, 40); g.fillCircle(25, 20, 15);
             g.generateTexture('player_jump', 50, 75);
        }
    }

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

            // Spawn Logic: Item (30%) OR Enemy (20%)
            if (!isStartPlatform) {
                const rand = Math.random();
                if (rand < 0.3) {
                    this.spawnItem(x, y - 40);
                } else if (rand < 0.5) { // 30% to 50% = 20% range
                    this.spawnEnemy(x, y - 40);
                }
            }
        }
    }

    private spawnEnemy(x: number, y: number) {
        const data = GameData.getInstance();
        let enemy = this.enemies.getFirstDead();
        if (!enemy) {
            enemy = this.enemies.create(x, y, 'enemy_red');
        } else {
            enemy.setTexture('enemy_red');
            enemy.setActive(true).setVisible(true);
            enemy.setPosition(x, y);
            enemy.enableBody(true, x, y, true, true);
        }

        // Scaling Stats
        const hp = 20 * data.currentStage;
        enemy.setData('hp', hp);
        enemy.setTint(0xffffff);

        // Simple Physics
        enemy.body.setGravityY(0); // Floating? Or walking? Let's make them static for now on platforms
        // Actually simple gravity to sit on platform
        enemy.body.setGravityY(1000);
        this.physics.add.collider(enemy, this.platforms);
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

    private hitEnemyBody(player: any, enemy: any) {
        // Player hits enemy -> Damage
        if (this.isGameOver) return;

        const data = GameData.getInstance();
        const damage = 10 * data.currentStage;

        this.playerHP -= damage;
        // Bounce player
        player.setVelocityY(-500);
        const dir = player.x < enemy.x ? -1 : 1;
        player.setVelocityX(dir * -500);

        // Flash red
        player.setTint(0xff0000);
        this.time.delayedCall(200, () => player.clearTint());

        if (this.playerHP <= 0) {
            this.showGameOver(false);
        }
    }

    private bulletHitEnemy(bullet: any, enemy: any) {
        if (!bullet.active || !enemy.active) return;

        bullet.setActive(false).setVisible(false);

        const data = GameData.getInstance();
        const dmg = 10 * data.weaponLevel;
        let hp = enemy.getData('hp') - dmg;
        enemy.setData('hp', hp);

        enemy.setTint(0xff0000);
        this.time.delayedCall(100, () => enemy.clearTint());

        if (hp <= 0) {
            enemy.disableBody(true, true);
            // Reward score?
            this.itemScore += 50 * data.currentStage;
        }
    }

    private collectItem(player: any, item: any) {
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
        this.dashTimer = 200;
    }

    private autoShoot(time: number) {
        // Cooldown: 1 sec (adjusted for game feel)
        if (time < this.shootTimer) return;
        this.shootTimer = time + 1000;

        // Find nearest enemy
        let nearest: Phaser.Physics.Arcade.Sprite | null = null;
        let minDist = 600; // Range

        this.enemies.children.iterate((child: any) => {
            if (!child.active) return true;
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, child.x, child.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = child;
            }
            return true;
        });

        if (nearest) {
            const bullet = this.bullets.create(this.player.x, this.player.y, 'bullet');
            this.physics.moveToObject(bullet, nearest, 600);
        }
    }

    update(time: number, delta: number) {
        if (this.isGameOver || this.isGameClear) return;

        this.timeLeft -= delta;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.updateTimerText();
            this.showGameOver(true);
            return;
        }
        this.updateTimerText();

        // Combat
        this.autoShoot(time);

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
        this.enemies.children.iterate((e: any) => {
            if (e.active && e.y > cameraBottom + 100) { this.enemies.killAndHide(e); e.disableBody(true, true); }
            return true;
        });
        this.bullets.children.iterate((b: any) => {
            if (b.active && (b.y > cameraBottom + 100 || b.y < this.cameras.main.scrollY - 100)) {
                b.destroy(); // Bullets are cheap to destroy/create
            }
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
        if (totalSeconds < 60) this.timerText.setColor('#ff0000'); else this.timerText.setColor('#ffffff');
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

        // Score
        this.scoreBg = this.add.graphics();
        this.scoreBg.fillStyle(0xffffff, 0.9);
        this.scoreBg.fillRoundedRect(40, 40, 300, 50, 25);
        this.scoreBg.setScrollFactor(0).setDepth(10);
        this.scoreText = this.add.text(190, 65, '0', { fontSize: '20px', color: '#4285f4', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(11);

        // Timer
        this.timerBg = this.add.graphics();
        this.timerBg.fillStyle(0x000000, 0.5);
        this.timerBg.fillRoundedRect(width/2 - 90, 40, 180, 50, 25);
        this.timerBg.setScrollFactor(0).setDepth(10);
        this.timerText = this.add.text(width/2, 65, '00:00:00', { fontSize: '24px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0.5).setScrollFactor(0).setDepth(11);
    }

    private createControls() {
        const { width, height } = this.scale;
        const btnHeight = 150; const btnY = height - btnHeight;

        const jumpBtn = this.add.rectangle(0, btnY, width/2, btnHeight, 0x00ff00, 0.2).setOrigin(0,0).setScrollFactor(0).setDepth(20).setInteractive();
        this.add.text(width*0.25, btnY+btnHeight/2, 'JUMP', { fontSize:'40px', fontStyle:'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(21);
        jumpBtn.on('pointerdown', () => { this.performJump(); jumpBtn.setFillStyle(0x00ff00, 0.4); });
        jumpBtn.on('pointerup', () => jumpBtn.setFillStyle(0x00ff00, 0.2));
        jumpBtn.on('pointerout', () => jumpBtn.setFillStyle(0x00ff00, 0.2));

        const dashBtn = this.add.rectangle(width/2, btnY, width/2, btnHeight, 0x00ffff, 0.2).setOrigin(0,0).setScrollFactor(0).setDepth(20).setInteractive();
        this.add.text(width*0.75, btnY+btnHeight/2, 'DASH', { fontSize:'40px', fontStyle:'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(21);
        dashBtn.on('pointerdown', () => { this.performDash(); dashBtn.setFillStyle(0x00ffff, 0.4); });
        dashBtn.on('pointerup', () => dashBtn.setFillStyle(0x00ffff, 0.2));
        dashBtn.on('pointerout', () => dashBtn.setFillStyle(0x00ffff, 0.2));
    }

    private showGameOver(isTimeOver: boolean) {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.physics.pause();
        // Simple GameOver UI
        const { width, height } = this.scale;
        this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.8).setScrollFactor(0).setDepth(100).setInteractive();
        this.add.text(width/2, height/2 - 50, isTimeOver ? 'Time Over' : 'Game Over', { fontSize: '64px', color: '#f00' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

        const btn = this.add.rectangle(width/2, height/2 + 100, 200, 60, 0xffffff).setScrollFactor(0).setDepth(101).setInteractive();
        this.add.text(width/2, height/2 + 100, 'Exit', { fontSize: '32px', color: '#000' }).setOrigin(0.5).setScrollFactor(0).setDepth(102);
        btn.on('pointerdown', () => this.scene.start('LobbyScene'));
    }

    private showGameClear() {
        if (this.isGameClear) return;
        this.isGameClear = true;
        this.physics.pause();

        // Update Data
        GameData.getInstance().completeStage();

        const { width, height } = this.scale;
        this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.8).setScrollFactor(0).setDepth(100).setInteractive();
        this.add.text(width/2, height/2 - 50, 'Stage Clear!', { fontSize: '64px', color: '#ff0' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

        const btn = this.add.rectangle(width/2, height/2 + 100, 250, 60, 0xffffff).setScrollFactor(0).setDepth(101).setInteractive();
        this.add.text(width/2, height/2 + 100, 'Next Stage', { fontSize: '32px', color: '#000' }).setOrigin(0.5).setScrollFactor(0).setDepth(102);
        btn.on('pointerdown', () => this.scene.start('LobbyScene'));
    }
}
