import Phaser from 'phaser';
import { WorldScene } from './game/WorldScene';
import './ui/style.css';

new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', backgroundColor: '#2a1612', pixelArt: true, roundPixels: true,
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  scene: [WorldScene],
});
