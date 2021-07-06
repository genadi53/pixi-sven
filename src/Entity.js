import { AnimatedSprite, Loader } from 'pixi.js';
import gsap from 'gsap/all';

const Resources = Loader.shared.resources;
const DIRECTIONS = ['Up', 'Down', 'Left', 'Right'];

export default class Entity{
    constructor(animations){
        this.animations = [];

        const randomIndex = Math.floor(Math.random() * DIRECTIONS.length);
        this.direction = DIRECTIONS[randomIndex];
        this.moving = false;
        this.prepareAnimations(animations);
    }

  /**
   * 
   * @param {{}} animations containing all animations info
   */
    prepareAnimations(animations) {
        for (const key in animations) {
          const animationTextures = [];
    
          animations[key].forEach((el) => {
            animationTextures.push(Resources[el].texture);
          });
          this.animations[key] = animationTextures;
        }

        //console.log(this.animations)
    }

  /**
   * 
   * @param {x,y} position coordinates 
   */
    init(position){
        this.anim = new AnimatedSprite(this.animations[`stand${this.direction}`]);
        this.anim.position = position;
        this.anim.animationSpeed = 0.2;
        this.anim.loop = false;
    }

  /**
   * 
   * @param {String} direction 'Up', 'Down' etc.
   */
    standStill(direction = this.direction){
        this.direction = direction;
        this.anim.textures = this.animations[`stand${this.direction}`];
        this.anim.gotoAndStop(0);
        this.moving = false;
    }

  /**
   * 
   * @param {{x, y}} target coordinates 
   * @param {String} direction 'Up', 'Down' etc.
   */
    async move(targetPos, direction){
        this.moving = true;

        this.direction = direction;
        this.anim.textures = this.animations['walk' + direction];
        this.anim.gotoAndPlay(0);

        await gsap.to(this.anim, {
            duration: 0.5,
            x: targetPos.x,
            y: targetPos.y,
            ease: 'none'
        });
        this.moving = false;
    }
}