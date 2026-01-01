import Phaser from 'phaser';
import LobbyScene from './scenes/LobbyScene';
import GameScene from './scenes/GameScene';
import './style.css';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 720,
    height: 1280,
    parent: 'app', // Attach to the centered div
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1500 }, // Increased gravity for taller screen/better feel
            debug: false
        },
    },
    scene: [LobbyScene, GameScene],
};

const game = new Phaser.Game(config);
(window as any).game = game;
