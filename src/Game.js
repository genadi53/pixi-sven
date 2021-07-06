import { Container, Sprite } from 'pixi.js';
import Entity from './Entity';
import svenAnimations from './svenAnimations';
import sheepAnimations from './sheepAnimations';
import Map from './Map';
import Sven from './Sven';
import gsap from 'gsap/all';
import ScoreBoard from './ScoreBoard';
import Timer from './Timer';
import EndScreen from './EndScreen';
import Assets from './core/AssetManager';

/**
 * Main game stage, manages scenes/levels.
 *
 * @extends {PIXI.Container}
 */
export default class Game extends Container {
  constructor() {
    super();
    this.map = new Map();
    this.scoreBoard = new ScoreBoard();
    this.timer = new Timer();
    this.herd = [];
    this.pressedKeys = [];
    this.endScreen = new EndScreen();
  }

  async start() {
    this.attachKeyboardListeners();
    this.addChild(Sprite.from('background'));
    this.addChild(this.scoreBoard.score);
    this.addChild(this.timer.timerText);
    this.createSven();
    this.createHerd();

    this.addChild(this.endScreen);
    // Start the timer and pass onEnd method
    this.timer.start(() => this.onEnd());

    // Start the background loop
    Assets.sounds.background.play();
  }

  createSven() {
    // Use the map methods to properly position our Sven, based on the map position
    const svenMapPos = this.map.posById(this.map.IDS.SVEN)[0];
    const svenCoordinates = this.map.coordsFromPos(svenMapPos);

    this.sven = new Sven(svenAnimations);
    this.sven.init(svenCoordinates);
    this.addChild(this.sven.anim);
  }

  createHerd() {
    // use the map method to display all the sheeps for the current level
    const sheepPositions = this.map.posById(this.map.IDS.SHEEP);

    sheepPositions.forEach(sheepPosition =>{
      const sheepCoordinates = this.map.coordsFromPos(sheepPosition);
      const sheep = new Entity(sheepAnimations);
      sheep.init(sheepCoordinates);

      sheep.col = sheepPosition.col;
      sheep.row = sheepPosition.row;
      sheep.humpedCount = 0;

      this.addChild(sheep.anim);
      this.herd.push(sheep);
    });
  }

  attachKeyboardListeners() {
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  onKeyDown({ code }) {
    if (this.pressedKeys.includes(code)) return;

    this.pressedKeys.push(code);
    this.svenAction();
  }

  onKeyUp({ code }) {
    this.pressedKeys.splice(this.pressedKeys.indexOf(code), 1);
  }

  svenAction() {
    // never interrupt Sven's movemnt
    if (this.sven.moving) return;

    const directionKey = this.pressedKeys.find(k => ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k));
    
    if (directionKey) {
      const direction = directionKey.replace('Arrow', '');
      return this.svenMove(direction);
    }

    if (this.pressedKeys.includes('Space')) {
      return this.svenHump();
    }

    this.sven.standStill();

  }

  async svenMove(direction) {
    // take current and next position
    const oldPos = this.map.posById(this.map.IDS.SVEN)[0];
    const newPos = this.map.getDestination(oldPos, direction);
            
    // if there is a collision or sven is out of bounds make him stand still
    if (this.map.outOfBounds(newPos) || this.map.collide(newPos)) 
      return this.sven.standStill(direction);

    // take the next coordinates and move sven based on direction and position
    const targetPos = this.map.coordsFromPos(newPos);
    await this.sven.move(targetPos, direction);

     // After the move is done , update the map positions
    this.map.setTileOnMap(oldPos, this.map.IDS.EMPTY);
    this.map.setTileOnMap(newPos, this.map.IDS.SVEN);

    // Call svenAction to check if there is another key pressed
    this.svenAction();
  }

  svenHump() {
    const svenDirection = this.sven.direction;
    const svenPos = this.map.posById(this.map.IDS.SVEN)[0];
    const targetPos = this.map.getDestination(svenPos, svenDirection);

    // Check if we hit sheep
    const hitSheep = this.map.getTile(targetPos) === this.map.IDS.SHEEP;
    if (!hitSheep) return this.sven.standStill();

    const sheep = this.herd.find(s => s.row === targetPos.row && s.col === targetPos.col);
    
    // Check if the sheep and Sven are looking at the same direction
    if (this.sven.direction !== sheep.direction) return this.sven.standStill();

    if (this.sven.isHumping) return this.sven.standStill();

    if (sheep.humpedCount >= 4) return this.sven.standStill();

    sheep.anim.visible = false;

    // Update the scoreboard
    this.scoreBoard.update(3);

    // Play the hump sound
    if (!Assets.sounds.hump.playing()) Assets.sounds.hump.play();

    // Use the new hump method
    this.sven.hump(() => {
      sheep.humpedCount++;
      sheep.anim.visible = true;
      this.sven.standStill();

      if (sheep.humpedCount >= 4) {
        this.removeSheep(sheep);
      }
      this.svenAction();
    });
  }

  removeSheep(sheep) {

    // Play the blink sheep animation before disappearing
    gsap.to(sheep.anim, {
      alpha: 0.4,
      duration: 0.5,
      repeat: 3,
      yoyo: true,
      onComplete: () => {

        // play the smoke sound
        Assets.sounds.puffSmoke.play();
        sheep.anim.textures = sheep.animations['disappear'];
        sheep.anim.gotoAndPlay(0);

        sheep.anim.onComplete = () => {

          // Play the point sound
          Assets.sounds.point.play();

          // Remove the sheep from the data
          const sheepIndex = this.herd.indexOf(sheep);
          this.herd.splice(sheepIndex, 1);
          this.removeChild(sheep.anim);

          this.map.setTileOnMap({row: sheep.row, col: sheep.col}, this.map.IDS.EMPTY);
          sheep.anim.onComplete = null;

        };
      }
    });
  }

  onEnd() {
    const score = this.scoreBoard.scoreValue;
    const win = this.herd.length === 0;

    // Play Win or Lose sounds
    win === true ? Assets.sounds.win.play() : Assets.sounds.lose.play();
    // Fade out the background sound
    Assets.sounds.background.fade(1, 0, 200);

    // Show the End screen
    this.endScreen.show(score, win);
  }
}
