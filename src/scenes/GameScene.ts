import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    constructor() {
        super('GameScene');
    }

    create() {
        const { width, height } = this.scale;

        // Create platforms group
        this.platforms = this.physics.add.staticGroup();

        // Create texture if missing
        if (!this.textures.exists('player')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0x00ffff, 1.0);
            graphics.fillRect(0, 0, 32, 48);
            graphics.generateTexture('player', 32, 48);
        }

        if (!this.textures.exists('ground')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0x00ff00, 1.0);
            graphics.fillRect(0, 0, 400, 32);
            graphics.generateTexture('ground', 400, 32);
        }

        // Initial Platforms
        this.platforms.clear(true, true);
        const ground = this.platforms.create(width * 0.5, height - 50, 'ground');
        ground.setScale(2, 1).refreshBody();

        this.platforms.create(width * 0.5, height - 200, 'ground').setScale(0.5, 1).refreshBody();
        this.platforms.create(width * 0.2, height - 350, 'ground').setScale(0.5, 1).refreshBody();
        this.platforms.create(width * 0.8, height - 500, 'ground').setScale(0.5, 1).refreshBody();

        // Player
        // Start slightly above the ground
        this.player = this.physics.add.sprite(width * 0.5, height - 150, 'player');
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(false);

        // Physics Collision with Auto-Jump
        this.physics.add.collider(this.player, this.platforms, this.handleCollision, undefined, this);

        // Camera
        this.cameras.main.startFollow(this.player, true, 0, 0.05, 0, 100);

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

        // Wrap world (infinite horizontal scrolling style or just clamp?
        // Prompt didn't specify wrap, but standard for this type.
        // For now, let's keep it simple, maybe just no bounds).
        // To be safe, let's wrap horizontal if they go off screen,
        // or just let them stay. Let's wrap it to make it playable.
        const width = this.scale.width;
        if (this.player.x < 0) {
            this.player.x = width;
        } else if (this.player.x > width) {
            this.player.x = 0;
        }
    }

    private handleCollision(player: any, platform: any) {
        const body = player.body as Phaser.Physics.Arcade.Body;

        // Only jump if touching down (falling onto platform)
        if (body.touching.down) {
            body.setVelocityY(-500);
        }
    }
}
