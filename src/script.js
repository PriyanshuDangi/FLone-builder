import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import Tiles from './tiles.js';
import axios from 'axios';
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min.js';
import { Object3D, Quaternion, Vector2, Vector3 } from 'three';
import { DragControls } from 'three/examples/jsm/controls/DragControls';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { AxesHelper } from 'three/src/helpers/AxesHelper';
import { sendToast } from './toast.js';
import { PINATA_GATEWAY_URL } from './config/app';

import ViewHelper from './ViewHelper.js';
import { uploadCube } from './utils/upload/upload.js';

let container = document.getElementById('container');
const instructions = document.getElementById('instructions');
const resourcesDiv = document.getElementById('resources');
const rectInputs = document.getElementsByClassName('rectInput');
const publishButton = document.getElementById('publish');
const cubeLoader = document.getElementById('cubeLoader');
const resetCameraButton = document.getElementById('reset-camera');
const inputTypeSelect = document.getElementById('inputType');
const deleteInput = document.getElementById('deleteInput');
const clearAllButton = document.getElementById('clear-all');

const cubeModeButton = document.getElementById('cubeMode');
const imageModeButton = document.getElementById('imageMode');
const cubeModeDiv = document.getElementById('cubeMode-div');
const imageModeDiv = document.getElementById('imageMode-div');
const imageInput = document.getElementById('imageInput');
const urlInput = document.getElementById('urlInput');
const imageSelect = document.getElementById('imageButton');
const imageCountSpan = document.getElementById('imageCount');

class Config {
    constructor() {
        this.cubeSize = 2;
        this.gridPiece = 32;
        this.gridY = 16;
        this.axisSize = this.cubeSize * this.gridY + this.gridY;
    }
}

const config = new Config();

const cameraPos = {
    x: 75,
    y: 75,
    z: 75,
};

class Cube {
    constructor() {
        this.init();
    }

    init() {
        this.cubeGeometry = new THREE.BoxGeometry(config.cubeSize, config.cubeSize, config.cubeSize);
        this.rollOverMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            opacity: 0.5,
            transparent: true,
        });
        this.rollOverGeometry = new THREE.BoxGeometry(config.cubeSize, config.cubeSize, config.cubeSize);
        this.rollOverGeometry.translate(1, 1, 1);
        this.rollOverMesh = new THREE.Mesh(this.rollOverGeometry, this.rollOverMaterial);
        this.translucentMaterial = new THREE.MeshBasicMaterial({ color: 0x919191, opacity: 0.8, transparent: true });
        this.translucentMesh = new THREE.Mesh(this.cubeGeometry, this.translucentMaterial);
        this.translucentParent = new THREE.Object3D();
        this.materials = Tiles;
    }
}

class Builder {
    constructor(token_id, maxCount, prevCubes, prevImages) {
        this.token_id = token_id;
        this.maxCount = maxCount; // the max cubes that can be added
        this.imageMaxCount = 3;
        this.currentCount = maxCount.map(() => 0); // the current number of cubes added
        this.prevCubes = prevCubes;
        this.prevImages = prevImages;
        this.inputType = 'click'; // 'drag' | 'click';
        this.inputMode = 'cube'; // 'cube' | 'image';
        this.init();
    }

    async init() {
        this.objects = []; // objects for raycaster
        this.cubesPos = {}; // for export cubes

        this.stats = new Stats();
        // container.appendChild(this.stats.dom);

        this.renderer = new THREE.WebGL1Renderer({ antialias: true });
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.gammaFactor = 2.2;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(container.clientWidth, window.innerHeight);

        // this.renderer.setClearColor( 0x000000, 0.0 );

        container.appendChild(this.renderer.domElement);

        window.addEventListener(
            'resize',
            () => {
                this.onWindowResize();
            },
            false,
        );

        // basic this used so that no need to repeat this code in the setInputType function
        this.changeEvent = new Event('change');

        this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / window.innerHeight, 1, 10000);
        this.camera.position.set(-1 * cameraPos.x * 15, cameraPos.y * 10, cameraPos.z * 15); // random location so that comes out of the screen
        this.camera.lookAt(0, 0, 0);

        this.backgroundColor = 0xffffff;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.backgroundColor);

        let light = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(light);

        light = new THREE.DirectionalLight(0xffffff, 1.0);
        light.position.set(30, 50, 30);
        light.target.position.set(0, 0, 0);
        light.castShadow = true;

        const d = 50;

        light.shadow.camera.left = -d;
        light.shadow.camera.right = d;
        light.shadow.camera.top = d;
        light.shadow.camera.bottom = -d;
        this.scene.add(light);

        // Initial Modes
        this.deleteMode = false;
        this.debugMode = false;

        this.cubes = new Cube();
        this.scene.add(this.cubes.rollOverMesh);
        this.cubeIndex = 0;
        this.cubeColor = '#ffffff';
        this.rectX = 1;
        this.rectY = 1;
        this.rectZ = 1;
        rectInputs[0].addEventListener('change', (event) => {
            this.rectX = parseInt(event.target.value);
            this.cubes.rollOverMesh.scale.x = this.rectX;
        });
        rectInputs[1].addEventListener('change', (event) => {
            let y = parseInt(event.target.value);
            if (y < 1 && y > config.gridY) {
                this.rectY = 1;
                rectInputs[1].value = 1;
                this.cubes.rollOverMesh.scale.y = this.rectY;
            } else {
                this.rectY = y;
                this.cubes.rollOverMesh.scale.y = this.rectY;
            }
        });
        rectInputs[2].addEventListener('change', (event) => {
            this.rectZ = parseInt(event.target.value);
            this.cubes.rollOverMesh.scale.z = this.rectZ;
        });

        const gridHelper = new THREE.GridHelper(config.cubeSize * config.gridPiece, config.gridPiece);
        this.scene.add(gridHelper);

        let geometry = new THREE.PlaneGeometry(config.cubeSize * config.gridPiece, config.cubeSize * config.gridPiece);
        geometry.rotateX(-Math.PI / 2);

        this.plane = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ visible: false }));
        this.plane.receiveShadow = true;
        // this.plane.castShadow = true;
        this.scene.add(this.plane);
        this.objects.push(this.plane);

        geometry = new THREE.PlaneGeometry(
            config.cubeSize * config.gridPiece * 2,
            config.cubeSize * config.gridPiece * 2,
        );
        geometry.rotateX(-Math.PI / 2);
        let shadowPlane = new THREE.Mesh(
            geometry,
            new THREE.MeshLambertMaterial({ visible: true, color: new THREE.Color(this.backgroundColor) }),
        );
        shadowPlane.receiveShadow = true;
        shadowPlane.position.y = -0.1;
        this.scene.add(shadowPlane);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 0, 0);
        // this.controls.minPolarAngle = - Math.PI / 6;
        // this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.update();

        // this.pointerControls = new PointerLockControls(this.camera, this.renderer.domElement);

        // container.addEventListener('click', () => {
        //     this.pointerControls.lock();
        // });

        // this.controls.addEventListener('change', (p) => {
        //     console.log(p);
        // });

        // Groups
        this.cubeGroup = new THREE.Group();
        this.imageGroup = new THREE.Group();
        this.scene.add(this.cubeGroup);
        this.scene.add(this.imageGroup);
        this.objects.push(this.cubeGroup);
        this.objects.push(this.imageGroup);

        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();

        this.cubes.materials.forEach((_, index) => {
            if (!Number.isInteger(this.maxCount[index])) {
                this.maxCount.push(0);
                this.currentCount.push(0);
            }
        });

        // axis helper
        // const axesHelper = new THREE.AxesHelper(config.axisSize);
        // axesHelper.setColors('red', 'green', 'blue');
        // this.scene.add(axesHelper);

        this.viewHelper = new ViewHelper(this);
        // this.scene.add(this.viewHelper);

        // let controls = new OrbitControls(this.viewHelper.camera, this.renderer.domElement);
        // controls.enableZoom = false;
        // controls.enablePan = false;
        // controls.target.set(0, 0, 0);
        // controls.update();

        //drag helpers
        let dragGeometry = new THREE.BoxGeometry(1 / 2, 1 / 2, 1 / 2);
        let dragMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.dragXHelper = new THREE.Mesh(dragGeometry, dragMaterial);
        this.dragXHelper.userData.noPointerDown = true;
        this.dragYHelper = new THREE.Mesh(dragGeometry, dragMaterial);
        this.dragYHelper.userData.noPointerDown = true;
        this.dragZHelper = new THREE.Mesh(dragGeometry, dragMaterial);
        this.dragZHelper.userData.noPointerDown = true;
        this.helperObject = new THREE.Object3D();
        this.objects.push(this.dragXHelper, this.dragYHelper, this.dragZHelper);

        this.draggableHelpers = [this.dragXHelper, this.dragYHelper, this.dragZHelper];
        this.mouseDragger = new DragControls(this.draggableHelpers, this.camera, this.renderer.domElement);
        this.isDragging = false;

        this.mouseDragger.addEventListener('dragstart', (event) => {
            this.controls.enabled = false;
            this.isDragging = true;
        });

        this.mouseDragger.addEventListener('dragend', (event) => {
            this.controls.enabled = true;
            this.isDragging = false;
            this.handleDragTranslucent();
        });

        this.mouseDragger.addEventListener('drag', (event) => {
            switch (event.object) {
                case this.dragXHelper:
                    event.object.position.setY(this.cubes.translucentMesh.position.y);
                    event.object.position.setZ(this.cubes.translucentMesh.position.z);
                    break;
                case this.dragYHelper:
                    event.object.position.setX(this.cubes.translucentMesh.position.x);
                    event.object.position.setZ(this.cubes.translucentMesh.position.z);
                    break;
                case this.dragZHelper:
                    event.object.position.setY(this.cubes.translucentMesh.position.y);
                    event.object.position.setX(this.cubes.translucentMesh.position.x);
                    break;
            }
        });

        this.initInstructions();
        this.addPreviousCubes();
        this.addPreviousImages();

        resetCameraButton.addEventListener('click', this.resetCam.bind(this), false);
        publishButton.addEventListener('click', this.publish.bind(this), false);
        deleteInput.addEventListener('click', this.handleDeleteMode.bind(this), false);
        inputTypeSelect.addEventListener(
            'change',
            (event) => {
                this.setInputType(event.target.value);
            },
            false,
        );
        clearAllButton.addEventListener('click', this.clearAll.bind(this), false);
        // imageInput.addEventListener('change', this.handleImageInput.bind(this), false);

        container.addEventListener('pointermove', this.onPointerMove.bind(this), false);
        container.addEventListener('pointerdown', this.onPointerDown.bind(this), false);
        window.addEventListener('keydown', this.onKeyDown.bind(this), false);
        window.addEventListener('keyup', this.onKeyUp.bind(this), false);
        cubeModeButton.addEventListener('click', this.handleInputMode.bind(this, 'cube'), false);
        imageModeButton.addEventListener('click', this.handleInputMode.bind(this, 'image'), false);
        imageSelect.addEventListener('click', this.handleInputSelect.bind(this), false);
        imageInput.addEventListener('change', this.handleImageChange.bind(this), false);
        this.updateAllSpans();
        this.RAF();
        this.resetCam();
    }

    // handleImageInput(event) {
    //     if (event.target.files[0]) {
    //         this.imageInputTexture = new THREE.TextureLoader().load(URL.createObjectURL(event.target.files[0]));
    //         this.imageInputTexture.sRGBEncoding = true;
    //     }
    // }

    handleInputSelect() {
        imageInput.click();
    }

    handleImageChange() {
        const maxImageSize = 512;
        if (imageInput.files[0].size > maxImageSize * 1024) {
            sendToast(`Image size should be less than ${maxImageSize} KB`, 'error');
            imageInput.value = null;
            return;
        }
        let filename = imageInput.files[0].name;
        let selectName = document.getElementById('imageVal');
        selectName.innerText = filename;
    }

    handleInputMode(mode) {
        this.inputMode = mode;
        if (mode === 'cube') {
            cubeModeButton.classList.add('mode--active');
            imageModeButton.classList.remove('mode--active');
            imageModeDiv.classList.add('none');
            cubeModeDiv.classList.remove('none');
        } else {
            imageModeButton.classList.add('mode--active');
            cubeModeButton.classList.remove('mode--active');
            cubeModeDiv.classList.add('none');
            imageModeDiv.classList.remove('none');
        }
        if (this.inputType !== 'click') {
            inputTypeSelect.value = 'click';
            this.setInputType('click');
        }
    }

    initInstructions() {
        this.countSpans = [];
        this.allResourceDivs = [];
        this.cubes.materials.forEach((element, index) => {
            const div = document.createElement('div');
            let comp = null;
            if (element.type === 'color') {
                comp = document.createElement('input');
                comp.setAttribute('type', 'color');
                comp.value = this.cubeColor;
                comp.addEventListener('change', () => {
                    this.cubeColor = comp.value;
                });
            } else {
                comp = document.createElement('img');
                comp.src = element.image;
                div.addEventListener('click', () => {
                    this.allResourceDivs.forEach((element) => {
                        element.classList.remove('active');
                    });
                    div.classList.add('active');
                    this.cubeIndex = index;
                });
            }
            const span = document.createElement('span');
            this.countSpans[index] = span;
            this.allResourceDivs[index] = div;
            if (index == this.cubeIndex) {
                div.classList.add('active');
            }
            div.classList.add('resource');
            div.appendChild(span);
            div.appendChild(comp);
            resourcesDiv.appendChild(div);
        });
    }

    setInputType(type) {
        if (type === 'drag') {
            this.inputType = 'drag';
            for (let i = 0; i < rectInputs.length; i++) {
                rectInputs[i].value = 1;
                rectInputs[i].dispatchEvent(this.changeEvent);
                rectInputs[i].disabled = true;
            }
        } else {
            this.inputType = 'click';
            for (let i = 0; i < rectInputs.length; i++) {
                rectInputs[i].value = 1;
                rectInputs[i].dispatchEvent(this.changeEvent);
                rectInputs[i].disabled = false;
            }
            this.handleDragTranslucent(true);
            this.removeDragHelper();
        }
    }

    clearAll() {
        const result = window.confirm('Are you sure? This will clear all cubes.');
        if (result) {
            // Object.values(this.cubesPos).forEach((element) => {
            //     this.cubeGroup.remove(element.object);
            //     this.objects.splice(this.objects.indexOf(element.object), 1);
            // });
            for (let i = this.cubeGroup.children.length - 1; i >= 0; i--) {
                try {
                    this.cubeGroup.remove(this.cubeGroup.children[i]);
                } catch (err) {
                    console.log(err);
                }
            }
            for (let i = this.imageGroup.children.length - 1; i >= 0; i--) {
                this.imageGroup.remove(this.imageGroup.children[i]);
            }
            this.currentCount = this.currentCount.map(() => 0);
            this.cubesPos = {};
            this.updateAllSpans();
            this.updateImageCount();
        }
    }

    handleDeleteMode(event) {
        if (event.target.checked) {
            this.deleteMode = true;
            for (let i = 0; i < rectInputs.length; i++) {
                rectInputs[i].value = 1;
                rectInputs[i].dispatchEvent(this.changeEvent);
                rectInputs[i].disabled = true;
            }
        } else {
            this.deleteMode = false;
            for (let i = 0; i < rectInputs.length; i++) {
                rectInputs[i].value = 1;
                rectInputs[i].dispatchEvent(this.changeEvent);
                rectInputs[i].disabled = false;
            }
        }
    }

    fixPosition(position) {
        let vector = new THREE.Vector3();
        vector.copy(position);
        vector
            .divideScalar(config.cubeSize)
            .floor()
            .multiplyScalar(config.cubeSize)
            .addScalar(config.cubeSize / 2);
        return vector;
    }

    handleDragTranslucent(remove) {
        if (remove) {
            this.scene.remove(this.scene.translucentParent);
            this.scene.remove(this.dragXHelper, this.dragYHelper, this.dragZHelper);
            this.rectX = 1;
            this.rectY = 1;
            this.rectZ = 1;
        } else {
            this.scene.remove(this.scene.translucentParent);
            let parent = new Object3D();
            let object = this.cubes.translucentMesh;
            let position = object.position;
            let counter = 0;

            let xVector = this.fixPosition(this.dragXHelper.position);
            let yVector = this.fixPosition(this.dragYHelper.position);
            let zVector = this.fixPosition(this.dragZHelper.position);

            let xLen = (xVector.x - object.position.x) / 2;
            let yLen = (yVector.y - object.position.y) / 2;
            let zLen = (zVector.z - object.position.z) / 2;
            this.rectX = xLen;
            this.rectY = yLen;
            this.rectZ = zLen;

            for (let yIndex = 0; yIndex < yLen; yIndex++) {
                for (let zIndex = 0; zIndex < zLen; zIndex++) {
                    for (let xIndex = 0; xIndex < xLen; xIndex++) {
                        const vector3 = new THREE.Vector3(
                            xIndex * config.cubeSize,
                            yIndex * config.cubeSize,
                            zIndex * config.cubeSize,
                        );
                        if (this.currentCount[this.cubeIndex] + counter >= this.maxCount[this.cubeIndex]) {
                            continue;
                        }
                        vector3.add(position);
                        if (!this.isValidPosition(vector3)) continue;
                        const voxel = new THREE.Mesh(this.cubes.cubeGeometry, this.cubes.translucentMaterial);
                        voxel.position.copy(vector3);
                        parent.add(voxel);
                        counter++;
                    }
                }
            }
            this.scene.add(parent);
            this.scene.translucentParent = parent;
        }
    }

    updateSpan(index) {
        let count = this.maxCount[index] - this.currentCount[index];
        if (!count) {
            count = 0;
        }
        if (this.countSpans[index].textContent !== count) {
            this.countSpans[index].textContent = count;
        }
    }

    updateAllSpans() {
        this.countSpans.forEach((element, index) => {
            this.updateSpan(index);
        });
    }

    updateImageCount() {
        let count = this.imageGroup.children.length;
        imageCountSpan.textContent = this.imageMaxCount - count;
    }

    showDragHelpers(position) {
        let distance = 1.5;
        let addX = new THREE.Vector3(distance, 0, 0);
        addX.add(position);
        let addY = new THREE.Vector3(0, distance, 0);
        addY.add(position);
        let addZ = new THREE.Vector3(0, 0, distance);
        addZ.add(position);
        this.dragXHelper.position.copy(addX);
        this.dragYHelper.position.copy(addY);
        this.dragZHelper.position.copy(addZ);

        this.scene.add(this.dragXHelper, this.dragYHelper, this.dragZHelper);
    }

    removeDragHelper() {
        this.scene.remove(this.dragXHelper, this.dragYHelper, this.dragZHelper);
    }

    exportCubes() {
        let cubesToExport = this.cubes.materials.map(() => []);
        let values = Object.values(this.cubesPos);
        values.forEach((value, index) => {
            if (
                value &&
                value.position &&
                Number.isInteger(value.index) &&
                value.index >= 0 &&
                value.index < this.cubes.materials.length &&
                this.isValidPosition(value.position) &&
                value.object
            ) {
                let voxel = { ...value };
                delete voxel.object;
                cubesToExport[value.index].push(voxel);
            }
        });
        return cubesToExport;
    }

    exportImages() {
        let imagesToExport = [];

        for (let i = 0; i < Math.min(this.imageMaxCount, this.imageGroup.children.length); i++) {
            let object = this.imageGroup.children[i];
            let data = this.imageGroup.children[i].toJSON();
            if (data && data.images.length > 0 && data.images[0].url) {
                if (data.object && data.object.userData && data.object.userData.url) {
                    let position = {
                        x: object.position.x,
                        y: object.position.y,
                        z: object.position.z,
                    };
                    let quaternion = {
                        x: object.quaternion.x,
                        y: object.quaternion.y,
                        z: object.quaternion.z,
                        w: object.quaternion.w,
                    };
                    let size = {
                        width: object.geometry.parameters.width,
                        height: object.geometry.parameters.height,
                    };
                    let image = data.images[0].url;
                    let url = data.object.userData.url;
                    imagesToExport.push({ image, url, position, quaternion, size });
                }
            }
        }
        return imagesToExport;
    }

    async uploadToIpfs() {
        let cubes = this.exportCubes();
        let images = this.exportImages();
        // const JSONBody = {
        //     token_id: this.token_id,
        //     cubes: cubes,
        //     images,
        //     version: 0,
        //     cubeSize: 2,
        // };
        // const response = await axios.post(
        //     `${process.env.REACT_APP_BACKEND_URL}/upload/pinBuilderImgToIPFS/land`,
        //     JSONBody,
        //     {
        //         maxBodyLength: Infinity,
        //     },
        // );
        // console.log(response);
        // const ipfsUrl = 'ipfs://' + response.data.hash;
        // return ipfsUrl;

        return uploadCube(cubes, this.token_id);
    }

    async publish() {
        try {
            cubeLoader.classList.remove('none');
            let ipfsUrl = await this.uploadToIpfs();
            // await updateCubeUrl(this.token_id, ipfsUrl);
            console.log(ipfsUrl);
            cubeLoader.classList.add('none');
            sendToast(ipfsUrl, 'success');
        } catch (err) {
            console.log(err);
            cubeLoader.classList.add('none');
            sendToast('Error in publishing!', 'error');
        }
    }

    isValidPosition(position) {
        let { x, y, z } = position;
        if (x > -1 * config.gridPiece && x < config.gridPiece) {
            if (z > -1 * config.gridPiece && z < config.gridPiece) {
                if (y >= 0 && y <= config.gridPiece) {
                    return true;
                }
            }
        }
        return false;
    }

    onPointerMove(event) {
        if (!this.isDragging) {
            this.pointer.set(
                (event.clientX / container.clientWidth) * 2 - 1,
                -(event.clientY / window.innerHeight) * 2 + 1,
            );
            this.raycaster.setFromCamera(this.pointer, this.camera);
            const intersects = this.raycaster.intersectObjects(this.objects, true);
            if (intersects.length > 0) {
                const intersect = intersects[0];
                if (intersect.object.userData && intersect.object.userData.noPointerDown) {
                    return;
                }

                this.cubes.rollOverMesh.position.copy(intersect.point).add(intersect.face.normal);
                this.cubes.rollOverMesh.position.divideScalar(config.cubeSize).floor().multiplyScalar(config.cubeSize);
                // .addScalar(config.cubeSize / 2)
            }
        }
    }

    addCubes(position) {
        for (let yIndex = 0; yIndex < this.rectY; yIndex++) {
            for (let zIndex = 0; zIndex < this.rectZ; zIndex++) {
                for (let xIndex = 0; xIndex < this.rectX; xIndex++) {
                    const vector3 = new THREE.Vector3(
                        xIndex * config.cubeSize,
                        yIndex * config.cubeSize,
                        zIndex * config.cubeSize,
                    );
                    if (this.currentCount[this.cubeIndex] >= this.maxCount[this.cubeIndex]) {
                        this.updateSpan(this.cubeIndex);
                        return;
                    }
                    vector3.add(position);
                    if (!this.isValidPosition(vector3)) continue;
                    const voxel = new THREE.Mesh(
                        this.cubes.cubeGeometry,
                        this.cubes.materials[this.cubeIndex].material,
                    );
                    voxel.castShadow = true;
                    voxel.receiveShadow = true;
                    let key = `${vector3.x}-${vector3.y}-${vector3.z}`;
                    let value = {
                        position: {
                            x: vector3.x,
                            y: vector3.y,
                            z: vector3.z,
                        },
                        index: this.cubeIndex,
                        type: this.cubes.materials[this.cubeIndex].type,
                        color: '#ffffff',
                        object: voxel,
                    };
                    if (this.cubes.materials[this.cubeIndex].type === 'color') {
                        value.color = this.cubeColor;
                    }
                    if (this.cubesPos[key]) {
                        let index = this.cubesPos[key].index;
                        // this.objects.splice(this.objects.indexOf(this.cubesPos[key].object), 1);
                        this.cubeGroup.remove(this.cubesPos[key].object);
                        delete this.cubesPos[key];
                        this.currentCount[index]--;
                    }
                    this.cubesPos[key] = value;
                    voxel.position.copy(vector3);
                    this.cubeGroup.add(voxel);
                    // this.objects.push(voxel);
                    this.currentCount[this.cubeIndex]++;
                }
            }
        }
        // this.updateSpan(this.cubeIndex);
        this.updateAllSpans();
    }

    checkImageData() {
        if (imageInput.files && imageInput.files[0] && urlInput.value) {
            return {
                image: URL.createObjectURL(imageInput.files[0]),
                url: urlInput.value,
            };
        }
        return {};
    }

    checkImagePosition(center, toCorner) {
        let bottomLeft = center.clone().sub(toCorner);
        let topRight = center.clone().add(toCorner);
        if (this.isValidPosition(bottomLeft) && this.isValidPosition(topRight)) {
            return true;
        }
        return false;
    }

    putImage(intersect) {
        if (this.imageGroup.children.length >= this.imageMaxCount) {
            sendToast('You can only add ' + this.imageMaxCount + ' images', 'error');
            return;
        }
        let { image, url } = this.checkImageData();
        if (!image || !url) {
            return;
        }
        let normal = intersect.face.normal;
        let wid = 1;
        let hei = 1;
        let center = new THREE.Vector3();
        let toCorner = new THREE.Vector3();
        if (normal.y != 0) {
            return;
        } else if (normal.x == 1 || normal.x == -1) {
            wid = this.rectZ;
            hei = this.rectY;
            toCorner.z = (config.cubeSize * wid) / 2;
            toCorner.y = (config.cubeSize * hei) / 2;
            center.z = (wid - 1) * (config.cubeSize / 2);
            center.y = (hei - 1) * (config.cubeSize / 2);
        } else if (normal.z == 1 || normal.z == -1) {
            wid = this.rectX;
            hei = this.rectY;
            toCorner.x = (config.cubeSize * wid) / 2;
            toCorner.y = (config.cubeSize * hei) / 2;
            center.x = (wid - 1) * (config.cubeSize / 2);
            center.y = (hei - 1) * (config.cubeSize / 2);
        } else {
            return;
        }
        let vector3 = intersect.point.clone().add(normal);
        vector3
            .divideScalar(config.cubeSize)
            .floor()
            .multiplyScalar(config.cubeSize)
            .addScalar(config.cubeSize / 2);
        vector3.addScaledVector(intersect.face.normal, -0.99);
        vector3.add(center);
        if (!this.checkImagePosition(vector3.clone(), toCorner)) {
            console.log('position error');
            return;
        }
        let geometry = new THREE.PlaneGeometry(config.cubeSize * wid, config.cubeSize * hei);
        const loader = new THREE.TextureLoader();
        const load = loader.load(image);
        load.encoding = THREE.sRGBEncoding;
        let material = new THREE.MeshLambertMaterial({ map: load, transparent: false });
        let plane = new THREE.Mesh(geometry, material);
        plane.lookAt(intersect.face.normal);
        plane.position.copy(vector3);
        plane.userData.url = url;

        this.imageGroup.add(plane);
        this.updateImageCount();
    }

    onPointerDown(event) {
        this.pointer.set(
            (event.clientX / container.clientWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1,
        );

        this.raycaster.setFromCamera(this.pointer, this.camera);

        const intersects = this.raycaster.intersectObjects(this.objects, true);

        if (intersects.length > 0) {
            const intersect = intersects[0];
            if (intersect.object.userData && intersect.object.userData.noPointerDown) {
                console.log('noPointerDown');
                return;
            }

            // delete cube and image
            if (this.deleteMode) {
                if (intersect.object.parent === this.cubeGroup) {
                    try {
                        let vector3 = intersect.object.position;
                        let key = `${vector3.x}-${vector3.y}-${vector3.z}`;
                        let index = this.cubesPos[key].index;
                        delete this.cubesPos[key];
                        this.cubeGroup.remove(intersect.object);
                        this.currentCount[index]--;
                        this.updateSpan(index);
                    } catch (err) {
                        console.log(err);
                    }
                } else if (intersect.object.parent === this.imageGroup) {
                    try {
                        this.imageGroup.remove(intersect.object);
                        this.updateImageCount();
                    } catch (err) {
                        console.log(err);
                    }
                }

                // create cube and image
            } else {
                // image
                if (this.inputMode === 'image') {
                    this.putImage(intersect);
                } // cube
                else {
                    let vector3 = intersect.point.clone().add(intersect.face.normal);
                    vector3
                        .divideScalar(config.cubeSize)
                        .floor()
                        .multiplyScalar(config.cubeSize)
                        .addScalar(config.cubeSize / 2);
                    if (!this.isValidPosition(vector3)) return;
                    if (this.inputType == 'drag') {
                        if (this.rectX + this.rectY + this.rectZ === 3) {
                            let object = this.cubes.translucentMesh;
                            object.position.copy(vector3);

                            this.showDragHelpers(vector3);
                            this.handleDragTranslucent();
                        } else {
                            this.addCubes(this.cubes.translucentMesh.position);
                            this.handleDragTranslucent(true);
                        }
                    } else {
                        this.addCubes(vector3);
                    }
                }
            }
        }
    }

    addPreviousImages() {
        for (let i = 0; i < Math.min(this.imageMaxCount, this.prevImages.length); i++) {
            let {
                image,
                url,
                position,
                quaternion,
                size = { width: config.cubeSize, height: config.cubeSize },
            } = this.prevImages[i];
            if (!image || !url || !position || !quaternion) {
                continue;
            }

            // if (image.substring(0, 7) !== 'ipfs://') continue;
            // else image = image.slice(7);
            // image = PINATA_GATEWAY_URL + image;

            // temporary code begins
            if (image.substring(0, 7) === 'ipfs://') {
                image = image.slice(7);
                image = PINATA_GATEWAY_URL + image;
            }
            // temporary code ends

            let vector3 = new Vector3(position.x, position.y, position.z);
            let quaternion3 = new Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
            let toCorner = new THREE.Vector3(size.width / 2, size.height / 2, 0);
            toCorner.applyQuaternion(quaternion3);
            if (!this.checkImagePosition(vector3, toCorner)) {
                continue;
            }
            let geometry = new THREE.PlaneGeometry(size.width, size.height);
            const loader = new THREE.TextureLoader();
            const load = loader.load(image);
            load.encoding = THREE.sRGBEncoding;
            let material = new THREE.MeshLambertMaterial({ map: load, transparent: false, color: '0xffffff' });
            let plane = new THREE.Mesh(geometry, material);
            plane.position.copy(vector3);
            plane.quaternion.copy(quaternion3);
            plane.userData.url = url;
            this.imageGroup.add(plane);
        }
        this.updateImageCount();
    }

    addPreviousCubes() {
        for (let j = 0; j < this.prevCubes.length; j++) {
            this.prevCubes[j] = this.prevCubes[j].slice(0, this.maxCount[j]); // to render only 100 prevCubes

            for (let k = 0; k < this.prevCubes[j].length; k++) {
                const cube = this.prevCubes[j][k];
                const { position, color, index } = cube;
                let currIndex = j;
                if (index) {
                    currIndex = parseInt(index);
                }
                if (
                    position &&
                    Number.isInteger(position.x) &&
                    Number.isInteger(position.y) &&
                    Number.isInteger(position.z) &&
                    this.isValidPosition(position)
                ) {
                    const voxel = new THREE.Mesh(this.cubes.cubeGeometry, this.cubes.materials[currIndex].material);
                    voxel.castShadow = true;
                    voxel.receiveShadow = true;
                    const vector3 = new THREE.Vector3(position.x, position.y, position.z);
                    let key = `${vector3.x}-${vector3.y}-${vector3.z}`;
                    let value = {
                        position: {
                            x: vector3.x,
                            y: vector3.y,
                            z: vector3.z,
                        },
                        index: currIndex,
                        type: this.cubes.materials[currIndex].type,
                        color: color ? color : '#ffffff',
                        object: voxel,
                    };
                    this.cubesPos[key] = value;
                    voxel.position.copy(vector3);
                    // this.scene.add(voxel);
                    this.cubeGroup.add(voxel);
                    // this.objects.push(voxel);
                    this.currentCount[currIndex]++;
                }
            }
        }
    }

    handleDebugMode() {
        if (this.debugMode) {
            container.appendChild(this.stats.dom);
        } else {
            container.removeChild(this.stats.dom);
        }
    }

    onKeyDown(event) {
        switch (event.code) {
            case 'ShiftLeft':
            case 'ShiftRight':
                this.deleteMode = true;
                break;
            case 'KeyP':
                this.debugMode = !this.debugMode;
                this.handleDebugMode();
                break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'ShiftLeft':
            case 'ShiftRight':
                this.deleteMode = deleteInput.checked || false;
        }
    }

    resetCam() {
        try {
            let target = cameraPos;
            let { x, y, z } = this.camera.position;
            let position = { x, y, z };
            let tween = new TWEEN.Tween(position).to(target, 1000);
            tween.easing(TWEEN.Easing.Sinusoidal.Out);
            tween.onUpdate(() => {
                this.camera.position.x = position.x;
                this.camera.position.y = position.y;
                this.camera.position.z = position.z;
                this.camera.lookAt(0, 0, 0);
            });
            tween.onComplete(() => {
                this.controls.enabled = true;
                this.controls.target.set(0, 0, 0);
            });
            this.controls.enabled = false;
            tween.start();
        } catch (err) {
            console.log(err);
        }
    }

    render() {
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.setViewport(0, 0, container.clientWidth, window.innerHeight);
        this.renderer.render(this.scene, this.camera);
        TWEEN.update();
        this.viewHelper.render();
        if (this.debugMode) this.stats.update();
    }

    RAF() {
        requestAnimationFrame((t) => {
            if (this.previousRAF == null) {
                this.previousRAF = t;
            }
            this.render();

            //   this.Update_((t - this.previousRAF) * 0.001);
            this.previousRAF = t;
            this.RAF();
        });
    }

    onWindowResize() {
        this.camera.aspect = container.clientWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, window.innerHeight);
    }
}

// let _APP = null;

// window.addEventListener('DOMContentLoaded', () => {
//     _APP = new Builder();
// });

export default Builder;
