import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { Animations, Character } from './Character';
import { Box3, Group, Mesh, Object3D } from 'three';
import { connect, ConnectionManager, Event } from './connection-manager';
import { buildScene, loadModels } from './scene';
import { MODELS } from './models';
import { hideOverlay, Screen, showGameStats, switchToScreen } from './ui';
import { IOController, setUpIOControllerListeners } from './keyDown';

let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer,
    clock: THREE.Clock,
    fpsControls: PointerLockControls,
    loadingManager: THREE.LoadingManager;
let RESOURCES_LOADED = false;

// object with mouse/keyboard button name as key and bool as value
export let io_controller: IOController = {};

const loadingScreen = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(90, 1280 / 720, 0.1, 100),
    box: new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        new THREE.MeshBasicMaterial({ color: 0x4444ff })
    )
};

const PLAYER_CONFIG = {
    height: 1.8, speed: 0.1, canShoot: 0, width: 0.5,
    currentAnimation: Animations.Default,
    velocityY: 0,
    health: 100
};

let connection: ConnectionManager;

// Bullets array
var bullets: ({ velocity: number; } & THREE.Mesh)[] = [];
let opponent: Character;
let boundingMesh: Mesh;
// meshes through which the player can't walk / fall
const solidMeshes: (Mesh | Group)[] = [];

let shotAudioBuffer: AudioBuffer;
let weaponModel: Mesh;

let gameId: string;
let isGameStarted = false;
let myScore = 0;
let opponentScore = 0;
let isFirstPlayer = true;


async function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.rotation.order = 'YXZ';
    clock = new THREE.Clock();

    loadingScreen.box.position.set(0, 0, 5);
    loadingScreen.camera.lookAt(loadingScreen.box.position);
    loadingScreen.scene.add(loadingScreen.box);

    loadingManager = new THREE.LoadingManager();
    loadingManager.onProgress = function (item, loaded, total) {
        console.log(item, loaded, total);
    };
    loadingManager.onLoad = async function () {
        const specificMeshes = buildScene({ scene, loadedModels: MODELS, targetSolidMeshes: solidMeshes, renderer });
        weaponModel = specificMeshes['playerweapon'];

        opponent = new Character();
        await opponent.init(scene, weaponModel.clone());
        solidMeshes.push(opponent.model);

        RESOURCES_LOADED = true;

        // show gui
        switchToScreen(Screen.Home);
        document.querySelector('#start-game-button')?.addEventListener('click', () => {
            // tells server to create a game id
            connection.send(JSON.stringify({ type: 'init' }));
        });
        // when pressing Join Game button, show a screen with game id input and a button
        document.querySelector('#join-game-menu-button')?.addEventListener('click', () => {
            switchToScreen(Screen.JoinGame);
            document.querySelector('#join-game-button')?.addEventListener('click', () => {
                const enteredGameId = document.querySelector('#game-code-input').value;
                if (enteredGameId) {
                    connection.sendMessage(Event.Join, {
                        gameId: enteredGameId
                    });
                    isFirstPlayer = false;
                }
            });
        });
    };


    loadModels(MODELS, loadingManager);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;
    document.body.prepend(renderer.domElement);

    // fps controls to rotate camera along with mouse movements
    fpsControls = new PointerLockControls(camera, renderer.domElement);
    renderer.domElement.addEventListener('click', () => {
        fpsControls.lock();
    });
    setUpIOControllerListeners(io_controller, renderer.domElement);

    // a box around camera to detect collisions with other objects
    boundingMesh = new Mesh(
        new THREE.BoxGeometry(PLAYER_CONFIG.width, PLAYER_CONFIG.height, PLAYER_CONFIG.width),
        new THREE.MeshPhongMaterial({ color: 0xff4444, wireframe: true })
    );
    boundingMesh.receiveShadow = false;
    boundingMesh.castShadow = false;
    boundingMesh.visible = false;
    boundingMesh.rotation.set(0, 1.8, 0);
    scene.add(boundingMesh);

    const audioListener = new THREE.AudioListener();
    camera.add(audioListener);
    // load a sound and set it as the PositionalAudio object's buffer
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('audio/shot_sound.wav', function (buffer) {
        shotAudioBuffer = buffer;
    });


    // establish server connection and handlers for different messages
    connection = await connect();
    connection.on(Event.GameCreated, ({ gameId: createdGameId }) => {
        gameId = createdGameId;
        document.querySelector('#game-code').innerHTML = createdGameId;
        switchToScreen(Screen.GameCreated);
    });
    connection.on(Event.GameStarted, ({ gameId: createdGameId }) => {
        isGameStarted = true;
        gameId = createdGameId;
        hideOverlay();
        showGameStats();
        resetGame();
    });
    connection.on(Event.ShotFired, (payload) => {
        const listener = camera.children.find(c => c.type === (new THREE.AudioListener()).type);
        opponent.playShootingSound(listener);
    });
    connection.on(Event.PlayerUpdate, (payload) => {
        opponent.updatePosition(payload);
    });
    connection.on(Event.ShotLanded, ({ damage }) => {
        PLAYER_CONFIG.health = Math.max(PLAYER_CONFIG.health - damage, 0);
        document.querySelector('#health').innerHTML = PLAYER_CONFIG.health;

        if (PLAYER_CONFIG.health === 0) {
            opponentScore += 1;
            resetGame();
        }
    });


    animate();
}


function animate() {
    // Play the loading screen until resources are loaded or game is started
    if (RESOURCES_LOADED == false || !gameId) {
        requestAnimationFrame(animate);

        loadingScreen.box.position.x -= 0.05;
        if (loadingScreen.box.position.x < -10) loadingScreen.box.position.x = 10;
        loadingScreen.box.position.y = Math.sin(loadingScreen.box.position.x);

        renderer.render(loadingScreen.scene, loadingScreen.camera);
        return;
    }

    requestAnimationFrame(animate);

    var delta = clock.getDelta();
    handlePlayerMovement(delta);
    handleShooting(delta);

    // position the gun in front of the camera
    weaponModel.position.set(
        camera.position.x + -0.5 * Math.sin(camera.rotation.y - 0.4),
        camera.position.y - 0.5 + 0.4 * camera.rotation.x,
        camera.position.z + -0.5 * Math.cos(camera.rotation.y - 0.4)
    );
    weaponModel.rotation.set(
        -camera.rotation.x / 2,
        camera.rotation.y - Math.PI,
        0
    );

    if (connection && connection.OPEN && gameId && isGameStarted) {
        // send position updates to the other player on every render
        connection.sendMessage(Event.PlayerUpdate,
            {
                gameId,
                update: {
                    x: camera.position.x,
                    y: camera.position.y - 1.7,
                    z: camera.position.z,
                    yRotation: camera.rotation.y - Math.PI,
                    animation: PLAYER_CONFIG.currentAnimation
                }
            }
        );
    }

    opponent.update(delta);

    renderer.render(scene, camera);
}

function handlePlayerMovement(delta: number) {
    let didMove = false;
    if (io_controller['KeyW']) { // W key
        const oldPosition = camera.position.clone();
        camera.position.x += Math.cos(camera.rotation.y + Math.PI / 2) * PLAYER_CONFIG.speed;
        camera.position.z -= Math.sin(camera.rotation.y + Math.PI / 2) * PLAYER_CONFIG.speed;
        undoCameraMovementIfCollision(oldPosition);
        didMove = true;
    }
    if (io_controller['KeyS']) { // S key
        const oldPosition = camera.position.clone();
        camera.position.x -= Math.cos(camera.rotation.y + Math.PI / 2) * PLAYER_CONFIG.speed;
        camera.position.z += Math.sin(camera.rotation.y + Math.PI / 2) * PLAYER_CONFIG.speed;
        undoCameraMovementIfCollision(oldPosition);
        didMove = true;
    }
    if (io_controller['KeyA']) { // A key
        const oldPosition = camera.position.clone();
        camera.position.x += Math.cos(camera.rotation.y + Math.PI) * PLAYER_CONFIG.speed;
        camera.position.z -= Math.sin(camera.rotation.y + Math.PI) * PLAYER_CONFIG.speed;
        undoCameraMovementIfCollision(oldPosition);
        didMove = true;
    }
    if (io_controller['KeyD']) { // D key
        const oldPosition = camera.position.clone();
        camera.position.x -= Math.cos(camera.rotation.y + Math.PI) * PLAYER_CONFIG.speed;
        camera.position.z += Math.sin(camera.rotation.y + Math.PI) * PLAYER_CONFIG.speed;
        undoCameraMovementIfCollision(oldPosition);
        didMove = true;
    }
    if (didMove) {
        PLAYER_CONFIG.currentAnimation = Animations.RifleRun;
    } else {
        PLAYER_CONFIG.currentAnimation = Animations.Default;
    }

    // Jump when Space is pressed
    if (io_controller['Space']) {
        if (PLAYER_CONFIG.velocityY === 0) {
            PLAYER_CONFIG.velocityY = 5;
        }
    }

    // if player switches tab and comes back after a while, time delta and the
    // resulting displacement is too large, resulting in player teleporting downwards
    const gravityTimeDelta = delta < 15 ? delta : 0.03;
    const oldPosition = camera.position.clone();
    camera.position.y += (gravityTimeDelta * PLAYER_CONFIG.velocityY);
    if (undoCameraMovementIfCollision(oldPosition)) {
        PLAYER_CONFIG.velocityY = 0;
    } else {
        // v = gt;
        PLAYER_CONFIG.velocityY -= 9.8 * gravityTimeDelta;
    }
}

// function to undo a movement of an object if the new position results in a collision with another object
const undoCameraMovementIfCollision = (oldPosition) => {
    boundingMesh.position.copy(camera.position);
    boundingMesh.position.y -= 0.8;
    boundingMesh.rotation.set(0, camera.rotation.y, 0);

    const cameraIntersectionBox = new Box3(new THREE.Vector3(), new THREE.Vector3());
    cameraIntersectionBox.setFromObject(boundingMesh);
    for (const meshToIntersect of solidMeshes) {
        const meshBoundingBox = new Box3(new THREE.Vector3(), new THREE.Vector3());
        meshBoundingBox.setFromObject(meshToIntersect);

        if (cameraIntersectionBox.intersectsBox(meshBoundingBox)) {
            camera.position.copy(oldPosition);
            boundingMesh.position.copy(oldPosition);
            return true;
        }
    }
    return false;
};


window.onload = init;

function handleShooting(delta: number) {
    // go through bullets array and update position
    // remove bullets when appropriate
    for (var index = 0; index < bullets.length; index += 1) {
        if (bullets[index] === undefined) continue;
        if (bullets[index].alive == false) {
            bullets.splice(index, 1);
            continue;
        }

        bullets[index].position.add(bullets[index].velocity);
    }

    // shoot a bullet
    if (io_controller['left_mouse'] && PLAYER_CONFIG.canShoot <= 0) {
        io_controller['left_mouse'] = false;

        // creates a bullet as a Mesh object
        const bullet = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 2, 6),
            new THREE.MeshBasicMaterial({ color: 0xAA5802 })
        );
        // position the bullet to come from the player's weapon
        bullet.position.set(
            weaponModel.position.x,
            weaponModel.position.y + 0.15,
            weaponModel.position.z
        );

        // set the velocity of the bullet in the direction of camera
        const cameraDirection = new THREE.Vector3();
        fpsControls.getDirection(cameraDirection);

        const bulletVelocityVector = cameraDirection.multiplyScalar(5);
        bulletVelocityVector.y += 0.1;
        bullet.velocity = bulletVelocityVector;

        // need to provide a unit vector to raycaster
        const bulletDirectionUnitVector = bulletVelocityVector.clone().normalize();
        const raycaster = new THREE.Raycaster();
        raycaster.set(
            new THREE.Vector3(weaponModel.position.x,
                weaponModel.position.y,
                weaponModel.position.z),
            bulletDirectionUnitVector);

        // all the objects that intersect with the line from gun to camera direction
        const intersects = raycaster.intersectObjects(scene.children);
        if (intersects.length) {
            let currentMesh = intersects[0].object;
            // go up the mesh hierarchy until we get to the main object (as opposed to e.g. a hand)
            while (currentMesh.parent !== scene) {
                currentMesh = currentMesh.parent as Object3D<THREE.Event>;
            }
            if (currentMesh.name === 'opponent') {
                const listener = camera.children.find(c => c.type === (new THREE.AudioListener()).type);
                opponent.playGruntSound(listener); // opponent grunts when he gets shot

                const shotDistance = intersects[0].distance;
                // shot can damage by 15 health points at least, or by more if up close
                const damage = Math.max(Math.round(30 / (shotDistance / 2)), 15);
                opponent.health = Math.max(opponent.health - damage, 0);
                connection.sendMessage(Event.ShotLanded, { gameId, damage });
                if (opponent.health === 0) {
                    myScore += 1;
                    resetGame();
                }
            }
        }
        // after 1000ms, set alive to false and remove from scene
        // setting alive to false flags our update code to remove
        // the bullet from the bullets array
        bullet.alive = true;
        setTimeout(function () {
            bullet.alive = false;
            scene.remove(bullet);
        }, 1000);

        // add to scene, array, and set the delay to 10 frames
        bullets.push(bullet);
        scene.add(bullet);
        PLAYER_CONFIG.canShoot = 10;

        // play shooting sound
        const listener = camera.children.find(c => c.type === (new THREE.AudioListener()).type);
        playShootingSound(weaponModel, shotAudioBuffer, listener);

        // send other player a message that shot has been fired (need to play shooting sound on their computer)
        connection.sendMessage(Event.ShotFired, { gameId });
    }
    if (PLAYER_CONFIG.canShoot > 0) PLAYER_CONFIG.canShoot -= 1;
}

export function playShootingSound(targetMesh: Mesh, audioBuffer: AudioBuffer, listener: THREE.AudioListener, volume: number = 0.4) {
    const sound = new THREE.PositionalAudio(listener);
    targetMesh.add(sound);
    sound.setBuffer(audioBuffer);
    sound.setVolume(volume);
    sound.play();
    setTimeout(() => {
        targetMesh.remove(sound);
    }, 1000);
}

export function resetGame() {
    // position players
    const firstPlayerPos = new THREE.Vector3(19, PLAYER_CONFIG.height + 0.5, 19);
    const secondPlayerPos = new THREE.Vector3(-19, PLAYER_CONFIG.height + 0.5, -19);
    if (isFirstPlayer) {
        camera.position.copy(firstPlayerPos);
        opponent.model.position.copy(secondPlayerPos);
    } else {
        camera.position.copy(secondPlayerPos);
        opponent.model.position.copy(firstPlayerPos);
    }
    camera.lookAt(0, 0, 0);

    PLAYER_CONFIG.health = 100;
    opponent.health = 100;
    document.querySelector('#health').innerHTML = PLAYER_CONFIG.health;

    document.querySelector('#myScore').innerHTML = myScore;
    document.querySelector('#opponentScore').innerHTML = opponentScore;
}