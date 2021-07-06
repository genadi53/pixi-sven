import Entity from "./Entity";

export default class Sven extends Entity{
    constructor(animations){
        super(animations);
        this.isHumping = false;

    }

    hump(callback){
        this.isHumping = true;
        this.anim.textures = this.animations['hump' + this.direction];
        this.anim.gotoAndPlay(0);

        this.anim.onComplete = () => {
            this.anim.onComplete = null;
            this.isHumping = false;
            callback();
        }
    }
}