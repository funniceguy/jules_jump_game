import Phaser from 'phaser';

export default class HelloWorldScene extends Phaser.Scene {
    constructor() {
        super('HelloWorldScene');
    }

    preload() {
        // Load assets here if needed
    }

    create() {
        const text = this.add.text(400, 300, 'HelloWorld', {
            fontSize: '64px',
            color: '#ffffff'
        });
        text.setOrigin(0.5);
    }

    update() {
        // Update logic here
    }
}
