import * as  THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Sky } from 'three/examples/jsm/objects/Sky';
import { Group, Mesh } from "three";
import { MODELS as loadedModels } from './models';
import { randFloat, randInt } from "three/src/math/MathUtils";

export const loadModels = (models, loadingManager) => {
    for (var _key in models) {
        (function (key) {
            const processLoadedMesh = (mesh: THREE.Group) => {
                mesh.traverse(function (node) {
                    if (node instanceof THREE.Mesh) {
                        if ('castShadow' in models[key])
                            node.castShadow = models[key].castShadow;

                        else
                            node.castShadow = true;

                        if ('receiveShadow' in models[key])
                            node.receiveShadow = models[key].receiveShadow;

                        else
                            node.receiveShadow = true;
                    }
                });
                models[key].mesh = mesh;
            };


            if (models[key].fbx) {
                const fbxLoader = new FBXLoader(loadingManager);
                fbxLoader.load(models[key].fbx, processLoadedMesh);
            } else if (models[key].gltf) {
                const gltfLoader = new GLTFLoader(loadingManager);
                gltfLoader.load(models[key].gltf, (obj) => {
                    processLoadedMesh(obj.scene);
                    obj.scene.traverse((node) => {
                        if (node.isMesh) {
                            node.material.metalness = 0.7;
                        }
                    });
                });
            } else {
                const mtlLoader = new MTLLoader(loadingManager);
                mtlLoader.load(models[key].mtl, function (materials) {
                    materials.preload();

                    const objLoader = new OBJLoader(loadingManager);

                    objLoader.setMaterials(materials);
                    objLoader.load(models[key].obj, processLoadedMesh);
                });
            }


        })(_key);
    }
};

interface BuildSceneParams {
    loadedModels: {
        [modelName: string]: {
            mesh?: Group | Mesh;
            fbx?: string;
            gltf?: string;
            obj?: string;
            mlt?: string;
        }
    }
}
export const buildScene = ({ scene, targetSolidMeshes, renderer }: BuildSceneParams) => {
    // store actionable meshes
    const meshes = {};

    const tent1 = loadedModels.tent.mesh.clone();
    tent1.position.set(16, 0, -13);
    tent1.rotation.set(0, Math.PI, 0);
    scene.add(tent1);
    targetSolidMeshes.push(tent1);

    const tent2 = loadedModels.tent.mesh.clone();
    tent2.position.set(11, 0, -17);
    tent2.rotation.set(0, Math.PI, 0);
    scene.add(tent2);
    targetSolidMeshes.push(tent2);

    const campfire1 = loadedModels.campfire.mesh.clone();
    campfire1.position.set(13, 0, -11);
    campfire1.scale.set(2, 2, 2);
    scene.add(campfire1);

    const treePositions = [
        [0, 0, 8],
        [-2, 0, 6],
        [-7.4, 0, -1.88],
        [9.6, 0, -5.7],
        [15.73, 0, 10.65],
        [-15, 0, 5.92],
        [11.15, 0, 3.23],

    ];
    treePositions.forEach((pos, index) => {
        const possibleTrees = [loadedModels.tree, loadedModels.tree_blocks];;
        const mesh = possibleTrees[randInt(0, possibleTrees.length - 1)].mesh;
        const tree = mesh.clone();
        tree.name = 'tree' + index;
        tree.position.set(pos[0], pos[1], pos[2]);
        const scale = randFloat(4, 9);
        tree.scale.set(scale, scale, scale);
        scene.add(tree);

        const treeTrunkBox = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 4, 0.5),
            new THREE.MeshPhongMaterial({ color: 0xff4444, wireframe: true, visible: false })
        );
        treeTrunkBox.position.copy(tree.position);
        treeTrunkBox.position.y += 2;
        scene.add(treeTrunkBox);
        targetSolidMeshes.push(treeTrunkBox);
    });

    const van = loadedModels.van.mesh.clone();
    van.position.set(1.39, 0, -14);
    van.scale.set(1.8, 1.8, 1.8);
    targetSolidMeshes.push(van);
    scene.add(van);

    const sedanSports = loadedModels.sedanSports.mesh.clone();
    sedanSports.position.set(5.39, 0, -14);
    sedanSports.scale.set(1.8, 1.8, 1.8);
    sedanSports.rotation.y = Math.PI;
    targetSolidMeshes.push(sedanSports);
    scene.add(sedanSports);

    const tractorShovel = loadedModels.tractorShovel.mesh.clone();
    tractorShovel.position.set(-8.5, 0, 12);
    tractorShovel.scale.set(1.8, 1.8, 1.8);
    targetSolidMeshes.push(tractorShovel);
    scene.add(tractorShovel);

    const cart = loadedModels.cart.mesh.clone();
    cart.position.set(17, 0, 3.38);
    cart.scale.set(1.8, 1.8, 1.8);
    targetSolidMeshes.push(cart);
    scene.add(cart);

    const fountain = loadedModels.fountain.mesh.clone();
    fountain.position.set(0, 0, 0);
    fountain.scale.set(1.8, 1.8, 1.8);
    targetSolidMeshes.push(fountain);
    scene.add(fountain);

    const house_type09 = loadedModels.house_type09.mesh.clone();
    house_type09.marker = 'house';
    house_type09.position.set(-10, 0, -13.5);
    house_type09.rotation.y = Math.PI / 2;
    house_type09.scale.set(8, 8, 8);
    targetSolidMeshes.push(house_type09);
    scene.add(house_type09);

    const house_type01 = loadedModels.house_type01.mesh.clone();
    house_type01.marker = 'house';
    house_type01.position.set(-19, 0, 2);
    // house_type01.rotation.y = Math.PI / 2;
    house_type01.scale.set(8, 8, 8);
    targetSolidMeshes.push(house_type01);
    scene.add(house_type01);

    const house_type03 = loadedModels.house_type03.mesh.clone();
    house_type03.marker = 'house';
    house_type03.position.set(2.5, 0, 14);
    // house_type03.rotation.y = Math.PI / 2;
    house_type03.scale.set(8, 8, 8);
    targetSolidMeshes.push(house_type03);
    scene.add(house_type03);

    // player weapon
    const playerWeapon = loadedModels.uzi.mesh.clone();
    playerWeapon.position.set(0, 2, 0);
    playerWeapon.scale.set(10, 10, 10);
    scene.add(playerWeapon);
    meshes['playerweapon'] = playerWeapon;

    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshPhongMaterial({ color: 0xff4444, wireframe: true })
    );
    mesh.position.y += 0.5;
    mesh.position.x += 5;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);
    targetSolidMeshes.push(mesh);

    const meshFloor = new THREE.Mesh(
        new THREE.BoxGeometry(40, 40, 4),
        new THREE.MeshPhysicalMaterial({ color: 0x536f34, wireframe: false })
        // 9aaab0 wall color
    );
    meshFloor.rotation.x -= Math.PI / 2;
    meshFloor.position.y -= 2;
    meshFloor.receiveShadow = true;
    scene.add(meshFloor);
    targetSolidMeshes.push(meshFloor);

    const wallHeight = 3;
    const wall = new THREE.Mesh(
        new THREE.BoxGeometry(40, wallHeight, 1),
        new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: false, transparent: true, blending: THREE.AdditiveBlending, opacity: 0.05 })
        // 9aaab0 wall color
    );
    const zWall = wall.clone();
    zWall.position.y += wallHeight / 2;
    zWall.position.z -= 20.5;
    zWall.receiveShadow = true;
    scene.add(zWall);
    targetSolidMeshes.push(zWall);

    const zWall1 = wall.clone();
    zWall1.position.y += wallHeight / 2;
    zWall1.position.z += 20.5;
    zWall1.receiveShadow = true;
    scene.add(zWall1);
    targetSolidMeshes.push(zWall1);

    const xWall = wall.clone();
    xWall.position.y += wallHeight / 2;
    xWall.position.x -= 20.5;
    xWall.rotateY(Math.PI / 2);
    xWall.receiveShadow = true;
    scene.add(xWall);
    targetSolidMeshes.push(xWall);

    const xWall1 = wall.clone();
    xWall1.position.y += wallHeight / 2;
    xWall1.position.x += 20.5;
    xWall1.rotateY(Math.PI / 2);
    xWall1.receiveShadow = true;
    scene.add(xWall1);
    targetSolidMeshes.push(xWall1);


    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const light = new THREE.PointLight(0x0373BB, 0.8, 18);
    light.position.set(-3, 6, -3);
    light.castShadow = true;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 25;
    scene.add(light);

    const sky = new Sky();
    sky.scale.setScalar(450000);
    scene.add(sky);

    const sun = new THREE.Vector3();

    /// GUI

    const effectController = {
        turbidity: 10,
        rayleigh: 1,
        mieCoefficient: 0.01,
        mieDirectionalG: 0.16,
        elevation: 2,
        azimuth: 180,
        exposure: renderer.toneMappingExposure
    };

    function guiChanged() {

        const uniforms = sky.material.uniforms;
        uniforms['turbidity'].value = effectController.turbidity;
        uniforms['rayleigh'].value = effectController.rayleigh;
        uniforms['mieCoefficient'].value = effectController.mieCoefficient;
        uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;

        const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
        const theta = THREE.MathUtils.degToRad(effectController.azimuth);

        sun.setFromSphericalCoords(1, phi, theta);

        uniforms['sunPosition'].value.copy(sun);

        renderer.toneMappingExposure = effectController.exposure;
    }
    guiChanged();

    return meshes;
};