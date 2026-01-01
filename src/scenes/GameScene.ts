import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;

    constructor() {
        super('GameScene');
    }

    create() {
        const { width, height } = this.scale;

        // Create platforms group
        this.platforms = this.physics.add.staticGroup();

        // Create a ground platform
        this.platforms.create(width * 0.5, height - 30, 'ground')
            .setScale(2, 1)
            .refreshBody(); // We'll need a texture or use a rectangle

        // Placeholder graphics for player and platform if no assets are loaded
        // For now, let's just make a simple rectangle texture
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

        // Re-create platforms with the texture if needed, but since we just generated it,
        // we might need to clear and re-add or just generate before creating the group.
        // Let's simple clear and add.
        this.platforms.clear(true, true);
        const ground = this.platforms.create(width * 0.5, height - 50, 'ground');
        ground.setScale(2, 1).refreshBody();

        // Add some higher platforms to jump on
        this.platforms.create(width * 0.5, height - 200, 'ground').setScale(0.5, 1).refreshBody();
        this.platforms.create(width * 0.2, height - 350, 'ground').setScale(0.5, 1).refreshBody();
        this.platforms.create(width * 0.8, height - 500, 'ground').setScale(0.5, 1).refreshBody();


        // Player
        this.player = this.physics.add.sprite(width * 0.5, height - 150, 'player');
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(false); // We want to go up infinitely, and maybe fall out bottom

        // Physics
        this.physics.add.collider(this.player, this.platforms);

        // Camera
        this.cameras.main.startFollow(this.player, true, 0, 0.05, 0, 100);
        // We only want the camera to follow vertically, and maybe have a deadzone

        // Inputs
        if (this.input.keyboard) {
            this.input.keyboard.on('keydown-SPACE', () => this.jump());
        }

        this.input.on('pointerdown', () => this.jump());
    }

    update() {
        // Basic movement
        const cursors = this.input.keyboard?.createCursorKeys();

        if (cursors?.left.isDown) {
            this.player.setVelocityX(-160);
        } else if (cursors?.right.isDown) {
            this.player.setVelocityX(160);
        } else {
            this.player.setVelocityX(0);
        }

        // Clean up platforms way below the camera? (Future improvement)
    }

    private jump() {
        if (this.player.body.touching.down) {
            this.player.setVelocityY(-500);
        }
    }
}
