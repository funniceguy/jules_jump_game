import Phaser from 'phaser';
import PreloadScene from './scenes/PreloadScene';
import LobbyScene from './scenes/LobbyScene';
import GameScene from './scenes/GameScene';
import StoryScene from './scenes/StoryScene';
import AchievementScene from './scenes/AchievementScene';
import './style.css';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 720,
    height: 1280,
    parent: 'app',
    backgroundColor: '#2c3e50', // Match body bg
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 1500 },
            debug: false
        },
    },
    // PreloadScene first
    scene: [PreloadScene, LobbyScene, GameScene, StoryScene, AchievementScene],
};

const game = new Phaser.Game(config);
(window as any).game = game;
