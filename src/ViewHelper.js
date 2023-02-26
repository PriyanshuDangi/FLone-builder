import * as THREE from 'three';
import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';

class ViewHelper extends THREE.Scene {
    constructor(builder) {
        super();
        this.mainCamera = builder.camera;
        this.canvasContainer = builder.container;
        this.renderer = builder.renderer;
        this.backgroundColor = builder.backgroundColor;
        this.init();
    }

    init() {
        let scope = this;

        this.point = new THREE.Vector3();
        this.dim = 128;
        this.turnRate = 2 * Math.PI;

        this.container = document.createElement('div');
        this.container.id = 'viewHelper';
        this.container.style.position = 'absolute';
        this.container.style.bottom = '0px';
        this.container.style.left = '0px';
        // this.container.style.left = this.renderer.domElement.clientWidth - 128 + 'px';
        this.container.style.width = this.dim + 'px';
        this.container.style.height = this.dim + 'px';

        this.container.addEventListener('pointerdown', (event) => {
            event.stopPropagation();
        });

        this.container.addEventListener('pointerup', (event) => {
            event.stopPropagation();
            scope.handleClick(event);
        });

        document.body.appendChild(this.container);

        this.targetPosition = new THREE.Vector3();
        this.targetQuaternion = new THREE.Quaternion();

        const color1 = new THREE.Color('#ff3653');
        const color2 = new THREE.Color('#8adb00');
        const color3 = new THREE.Color('#2c8fff');

        this.interactiveObjects = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // this.background = new THREE.Color(0x000000);
        this.camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0, 4);
        this.camera.position.set(1, 1, 1);
        this.camera.lookAt(0, 0, 0);

        const geometry = new THREE.BoxGeometry(0.8, 0.05, 0.05).translate(0.4, 0, 0);

        const xAxis = new THREE.Mesh(geometry, this.getAxisMaterial(color1));
        const yAxis = new THREE.Mesh(geometry, this.getAxisMaterial(color2));
        const zAxis = new THREE.Mesh(geometry, this.getAxisMaterial(color3));

        yAxis.rotation.z = Math.PI / 2;
        zAxis.rotation.y = -Math.PI / 2;

        this.add(xAxis);
        this.add(zAxis);
        this.add(yAxis);

        this.posXAxisHelper = new THREE.Sprite(this.getSpriteMaterial(color1, 'X'));
        this.posXAxisHelper.userData.type = 'posX';
        this.posYAxisHelper = new THREE.Sprite(this.getSpriteMaterial(color2, 'Y'));
        this.posYAxisHelper.userData.type = 'posY';
        this.posZAxisHelper = new THREE.Sprite(this.getSpriteMaterial(color3, 'Z'));
        this.posZAxisHelper.userData.type = 'posZ';
        this.negXAxisHelper = new THREE.Sprite(this.getSpriteMaterial(color1));
        this.negXAxisHelper.userData.type = 'negX';
        this.negYAxisHelper = new THREE.Sprite(this.getSpriteMaterial(color2));
        this.negYAxisHelper.userData.type = 'negY';
        this.negZAxisHelper = new THREE.Sprite(this.getSpriteMaterial(color3));
        this.negZAxisHelper.userData.type = 'negZ';

        this.posXAxisHelper.position.x = 1;
        this.posYAxisHelper.position.y = 1;
        this.posZAxisHelper.position.z = 1;
        this.negXAxisHelper.position.x = -1;
        this.negXAxisHelper.scale.setScalar(0.8);
        this.negYAxisHelper.position.y = -1;
        this.negYAxisHelper.scale.setScalar(0.8);
        this.negZAxisHelper.position.z = -1;
        this.negZAxisHelper.scale.setScalar(0.8);

        this.add(this.posXAxisHelper);
        this.add(this.posYAxisHelper);
        this.add(this.posZAxisHelper);
        this.add(this.negXAxisHelper);
        this.add(this.negYAxisHelper);
        this.add(this.negZAxisHelper);

        this.interactiveObjects.push(this.posXAxisHelper);
        this.interactiveObjects.push(this.posYAxisHelper);
        this.interactiveObjects.push(this.posZAxisHelper);
        this.interactiveObjects.push(this.negXAxisHelper);
        this.interactiveObjects.push(this.negYAxisHelper);
        this.interactiveObjects.push(this.negZAxisHelper);
    }

    render() {
        var x = this.container.style.left.replace('px', '');
        this.renderer.setClearColor(0xffffff, 1);
        this.renderer.clearDepth();
        this.renderer.setScissorTest(true);
        this.renderer.setScissor(x, 0, this.dim, this.dim);
        this.renderer.setViewport(x, 0, this.dim, this.dim);
        var quaternion = this.mainCamera.quaternion.clone();
        var position = this.mainCamera.position.clone();
        this.camera.position.copy(position.normalize().multiplyScalar(2));
        this.camera.quaternion.copy(quaternion.normalize());
        this.camera.lookAt(new THREE.Vector3());

        this.point.set(0, 0, 1);
        this.point.applyQuaternion(this.mainCamera.quaternion);

        if (this.point.x >= 0) {
            this.posXAxisHelper.material.opacity = 1;
            this.negXAxisHelper.material.opacity = 0.5;
        } else {
            this.posXAxisHelper.material.opacity = 0.5;
            this.negXAxisHelper.material.opacity = 1;
        }

        if (this.point.y >= 0) {
            this.posYAxisHelper.material.opacity = 1;
            this.negYAxisHelper.material.opacity = 0.5;
        } else {
            this.posYAxisHelper.material.opacity = 0.5;
            this.negYAxisHelper.material.opacity = 1;
        }

        if (this.point.z >= 0) {
            this.posZAxisHelper.material.opacity = 1;
            this.negZAxisHelper.material.opacity = 0.5;
        } else {
            this.posZAxisHelper.material.opacity = 0.5;
            this.negZAxisHelper.material.opacity = 1;
        }

        this.renderer.render(this, this.camera);
        this.renderer.setScissorTest(false);
    }

    handleClick(event) {
        // if (this.animating === true) return false;

        const rect = this.container.getBoundingClientRect();
        const offsetX = rect.left + (this.container.offsetWidth - this.dim);
        const offsetY = rect.top + (this.container.offsetHeight - this.dim);
        this.mouse.x = ((event.clientX - offsetX) / (rect.width - offsetX)) * 2 - 1;
        this.mouse.y = -((event.clientY - offsetY) / (rect.bottom - offsetY)) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersects = this.raycaster.intersectObjects(this.interactiveObjects);

        if (intersects.length > 0) {
            const intersection = intersects[0];
            const object = intersection.object;

            this.prepareAnimationData(object, new Vector3(0, 0, 0));

            this.animating = true;

            return true;
        } else {
            return false;
        }
    }

    prepareAnimationData(object, focusPoint) {
        console.log(object.userData.type);
        switch (object.userData.type) {
            case 'posX':
                this.targetPosition.set(1, 0, 0);
                this.targetQuaternion.setFromEuler(new THREE.Euler(0, Math.PI * 0.5, 0));
                break;

            case 'posY':
                this.targetPosition.set(0, 1, 0);
                this.targetQuaternion.setFromEuler(new THREE.Euler(-Math.PI * 0.5, 0, 0));
                break;

            case 'posZ':
                this.targetPosition.set(0, 0, 1);
                this.targetQuaternion.setFromEuler(new THREE.Euler());
                break;

            case 'negX':
                this.targetPosition.set(-1, 0, 0);
                this.targetQuaternion.setFromEuler(new THREE.Euler(0, -Math.PI * 0.5, 0));
                break;

            case 'negY':
                this.targetPosition.set(0, -1, 0);
                this.targetQuaternion.setFromEuler(new THREE.Euler(Math.PI * 0.5, 0, 0));
                break;

            case 'negZ':
                this.targetPosition.set(0, 0, -1);
                this.targetQuaternion.setFromEuler(new THREE.Euler(0, Math.PI, 0));
                break;

            default:
                console.error('ViewHelper: Invalid axis.');
        }

        let radius = this.mainCamera.position.distanceTo(focusPoint);
        this.mainCamera.position.copy(this.targetPosition.multiplyScalar(radius));
        this.mainCamera.quaternion.rotateTowards(this.targetQuaternion, this.turnRate);
    }

    getAxisMaterial(color) {
        return new THREE.MeshBasicMaterial({ color: color, toneMapped: false });
    }

    getSpriteMaterial(color, text = null) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;

        const context = canvas.getContext('2d');
        context.beginPath();
        context.arc(32, 32, 16, 0, 2 * Math.PI);
        context.closePath();
        context.fillStyle = color.getStyle();
        context.fill();

        if (text !== null) {
            context.font = '24px Arial';
            context.textAlign = 'center';
            context.fillStyle = '#000000';
            context.fillText(text, 32, 41);
        }

        const texture = new THREE.CanvasTexture(canvas);

        return new THREE.SpriteMaterial({ map: texture, toneMapped: false });
    }
}

export default ViewHelper;
