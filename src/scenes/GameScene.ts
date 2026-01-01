import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    // Configuration
    private readonly platformCount = 10; // Number of platforms in pool
    private readonly platformVerticalDistance = 120; // 600px / 5 = 120px
    private readonly platformWidth = 150; // 800px / 5 roughly

    constructor() {
        super('GameScene');
    }

    create() {
        const { width, height } = this.scale;

        // Create platform texture
        if (!this.textures.exists('platform')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0x00ff00, 1.0);
            graphics.fillRect(0, 0, this.platformWidth, 20);
            graphics.generateTexture('platform', this.platformWidth, 20);
        }

        // Create platforms group with pooling
        this.platforms = this.physics.add.staticGroup({
            key: 'platform',
            frameQuantity: this.platformCount,
            active: false,
            visible: false
        });

        // Initialize platforms
        const platforms = this.platforms.getChildren() as Phaser.Physics.Arcade.Image[];

        // Start from bottom
        let currentY = height - 50;

        platforms.forEach((platform, index) => {
            platform.setActive(true).setVisible(true);

            // First platform always in center to catch player
            const x = index === 0 ? width * 0.5 : Phaser.Math.Between(this.platformWidth / 2, width - this.platformWidth / 2);

            platform.x = x;
            platform.y = currentY;
            platform.refreshBody();

            currentY -= this.platformVerticalDistance;
        });

        // Player
        this.player = this.physics.add.sprite(width * 0.5, height - 150, 'player'); // Texture 'player' from previous step (handled implicitly if main loads it, but we generate in create if missing)

        // Regenerate player texture if missing (in case scene reloaded without texture manager persistence, though usually it persists)
        if (!this.textures.exists('player')) {
             const graphics = this.make.graphics({ x: 0, y: 0, add: false });
             graphics.fillStyle(0x00ffff, 1.0);
             graphics.fillRect(0, 0, 32, 48);
             graphics.generateTexture('player', 32, 48);
             this.player.setTexture('player');
        }

        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(false);

        // Physics Collision with Auto-Jump
        this.physics.add.collider(this.player, this.platforms, this.handleCollision, undefined, this);

        // Camera
        this.cameras.main.startFollow(this.player, true, 0, 0.05, 0, 0); // Offset 0 to keep player centered vertically if possible, or adjust
        this.cameras.main.setDeadzone(0, 200); // Add deadzone so camera doesn't jitter on small jumps

        // Inputs
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
        }
    }

    update() {
        // Basic movement
        if (this.cursors) {
            if (this.cursors.left.isDown) {
                this.player.setVelocityX(-200);
            } else if (this.cursors.right.isDown) {
                this.player.setVelocityX(200);
            } else {
                this.player.setVelocityX(0);
            }
        }

        // Screen Wrapping
        const width = this.scale.width;
        if (this.player.x < 0) {
            this.player.x = width;
        } else if (this.player.x > width) {
            this.player.x = 0;
        }

        // Infinite Platforms (Pooling)
        this.recyclePlatforms();

        // Game Over check (fall below camera)
        const cameraBottom = this.cameras.main.scrollY + this.scale.height;
        if (this.player.y > cameraBottom + 100) {
            // Restart or Game Over
            // For now, let's just respawn or restart scene
            this.scene.restart();
        }
    }

    private recyclePlatforms() {
        const platforms = this.platforms.getChildren() as Phaser.Physics.Arcade.Image[];
        const cameraBottom = this.cameras.main.scrollY + this.scale.height;
        const cameraTop = this.cameras.main.scrollY;

        // Find the highest platform Y
        let minY = Number.MAX_VALUE;
        platforms.forEach(p => {
            if (p.y < minY) minY = p.y;
        });

        // Loop through platforms and recycle those below the screen
        platforms.forEach(platform => {
            // If platform is well below the camera view
            if (platform.y > cameraBottom + 100) {
                // Move it above the highest platform
                const newY = minY - this.platformVerticalDistance;

                // Update X randomly
                const newX = Phaser.Math.Between(this.platformWidth / 2, this.scale.width - this.platformWidth / 2);

                platform.y = newY;
                platform.x = newX;
                platform.refreshBody();

                // Update minY since we just added a higher platform
                minY = newY;
            }
        });
    }

    private handleCollision(player: any, platform: any) {
        const body = player.body as Phaser.Physics.Arcade.Body;

        // Only jump if touching down
        if (body.touching.down) {
            // Jump high enough to clear 2 platforms (2 * 120 = 240px)
            // v^2 = 2 * g * h
            // v = sqrt(2 * 600 * 250) ~ 550. Let's do -600 for safety.
            body.setVelocityY(-600);
        }
    }
}
