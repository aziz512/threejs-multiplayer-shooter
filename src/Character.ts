import { AnimationAction, Group, Scene, Mesh } from "three";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { AnimationMixer } from "three/src/animation/AnimationMixer";
import { playShootingSound } from "./main";
import { randInt } from "three/src/math/MathUtils";

export enum Animations {
    RifleRun = 'character_run',
    Default = 'character_idle'
}

interface UpdatePayload {
    x: number;
    y: number;
    z: number;
    yRotation: number;
    animation: Animations;
}

export class Character {
    public model: Group = undefined as any;
    private mixer: AnimationMixer;

    private animationActions: { [key in Animations]: AnimationAction } = {} as any;
    private currentAnimation: AnimationAction;

    private gun: THREE.Mesh;
    private box: Mesh;
    private shootingSoundBuffer: AudioBuffer;
    gruntSoundBuffers: AudioBuffer[] = [];

    public health = 100;

    constructor() { }

    async init(scene: Scene, gunObject: THREE.Mesh) {
        const fbxLoader = new FBXLoader();
        const model = await fbxLoader.loadAsync('models/Remy.fbx');
        model.position.set(0, 0, -3);
        model.scale.setScalar(0.006);
        model.rotation.set(0, 1.8, 0);
        model.castShadow = true;
        model.name = 'opponent';

        this.mixer = new AnimationMixer(model);
        await this.loadAnimations();
        this.playAnimation(this.animationActions[Animations.Default]);

        this.model = model;
        window.model = model;
        scene.add(model);

        this.gun = gunObject;
        gunObject.traverse((obj) => {
            if (obj.isMesh) {
                obj.castShadow = true;
            }
        });
        this.updateGunPosition();
        scene.add(this.gun);

        const audioLoader = new THREE.AudioLoader();
        audioLoader.load('audio/shot_sound.wav', (buffer) => {
            this.shootingSoundBuffer = buffer;
        });
        audioLoader.load('audio/grunt.mp3', (buffer) => {
            this.gruntSoundBuffers.push(buffer);
        });
        audioLoader.load('audio/grunt.wav', (buffer) => {
            this.gruntSoundBuffers.push(buffer);
        });
    }

    updateGunPosition() {
        let handPosition = new THREE.Vector3();
        this.model.traverse((obj) => {
            if (obj.isMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
            }
            if (obj.name === 'mixamorigLeftHandRing4') {
                obj.getWorldPosition(handPosition);
            }
        });
        this.gun.position.copy(handPosition);
        // this.gun.position.set(this.model.position.x + 0.8 * Math.cos(this.model.rotation.y - Math.PI / 2), this.model.position.y + 1.65, this.model.position.z - 0.8 * Math.sin(this.model.rotation.y - Math.PI / 2));
        this.gun.rotation.set(this.model.rotation.x, this.model.rotation.y, this.model.rotation.z);
        this.gun.scale.set(9, 9, 9);
    };

    update(deltaTime: number) {
        const handleMovement = () => {
            const stepDistance = 0.0;

            this.model.position.x += stepDistance * Math.cos(this.model.rotation.y - Math.PI / 2);
            this.model.position.z -= stepDistance * Math.sin(this.model.rotation.y - Math.PI / 2);
            this.updateGunPosition();
        };
        handleMovement();
        this.mixer.update(deltaTime);
    }

    updatePosition({ x, y, z, yRotation, animation }: UpdatePayload) {
        this.model.position.set(x, y, z);
        this.model.rotation.y = yRotation;
        this.playAnimation(this.animationActions[animation].play());
    }

    playAnimation(newAnim: AnimationAction) {
        if (newAnim === this.currentAnimation) {
            return;
        }
        const previousAction = this.currentAnimation;
        previousAction?.fadeOut(0.2);

        this.currentAnimation = newAnim
            .reset()
            .play();
    }

    loadAnimations() {
        return Promise.all(Object.values(Animations).map(async (animation, index) => {
            const fbxLoader = new FBXLoader();
            const animationModel = await fbxLoader.loadAsync(`models/${animation}.fbx`);

            const animationClip = this.mixer.clipAction(animationModel.animations[0]);
            this.animationActions[animation] = animationClip;
        }));
    }

    playShootingSound(listener) {
        playShootingSound(this.gun, this.shootingSoundBuffer, listener, 1);
    }

    playGruntSound(listener) {
        const sound = new THREE.PositionalAudio(listener);
        this.model.add(sound);
        const randomGrunt = this.gruntSoundBuffers[randInt(0, this.gruntSoundBuffers.length - 1)];
        sound.setBuffer(randomGrunt);
        sound.play();
        setTimeout(() => {
            this.model.remove(sound);
        }, 1000);
    }
}

