import * as THREE from 'three';
// let dirtGrassImg = "./assets/tiles/dirt_grass.png";
// let grassTopImg = "./assets/tiles/grass_top.png";
// let dirtImg = "./assets/tiles/dirt.png";
// let trunkSideImg = "./assets/tiles/trunk_side.png";
// let trunkTopImg = "./assets/tiles/trunk_top.png";
// let leavesTransparentImg = "./assets/tiles/leaves_transparent.png";
// let leavesImg = "./assets/tiles/leaves.png";
// let stoneImg = "./assets/tiles/stone.png";
// let stoneSandImg = "./assets/tiles/stone_sand.png";
// let stoneDirtImg = "./assets/tiles/stone_dirt.png";
// let brickGreyImg = "./assets/tiles/brick_grey.png";
// let snowImg = "./assets/tiles/snow.png";
// let sandImg = "./assets/tiles/sand.png";
import dirtGrassImg from './assets/tiles/dirt_grass.png';
import grassTopImg from './assets/tiles/grass_top.png';
import dirtImg from './assets/tiles/dirt.png';
import trunkSideImg from './assets/tiles/trunk_side.png';
import trunkTopImg from './assets/tiles/trunk_top.png';
import leavesTransparentImg from './assets/tiles/leaves_transparent.png';
import leavesImg from './assets/tiles/leaves.png';
import stoneImg from './assets/tiles/stone.png';
import stoneSandImg from './assets/tiles/stone_sand.png';
import stoneDirtImg from './assets/tiles/stone_dirt.png';
import brickGreyImg from './assets/tiles/brick_grey.png';
import snowImg from './assets/tiles/snow.png';
import sandImg from './assets/tiles/sand.png';

const loader = new THREE.TextureLoader();

const loadMaterial = (img, props = { transparent: false }) => {
    const load = loader.load(img);
    load.encoding = THREE.sRGBEncoding;
    // load.magFilter = THREE.NearestFilter;
    // load.minFilter = THREE.NearestFilter;
    const material = new THREE.MeshPhongMaterial({ map: load });
    if (props.transparent) {
        material.transparent = true;
    }
    return material;
};

const colorMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xffffff),
    // vertexColors: THREE.VertexColors
});

const dirtGrassMaterial = loadMaterial(dirtGrassImg);
const grassTopMaterial = loadMaterial(grassTopImg);
const dirtMaterial = loadMaterial(dirtImg);
const trunkSideMaterial = loadMaterial(trunkSideImg);
const trunkTopMaterial = loadMaterial(trunkTopImg);
const leavesTransparentMaterial = loadMaterial(leavesTransparentImg, {
    transparent: true,
});
const leavesMaterial = loadMaterial(leavesImg);
const stoneMaterial = loadMaterial(stoneImg);
const stoneSandMaterial = loadMaterial(stoneSandImg);
const sandMaterial = loadMaterial(sandImg);
const stoneDirtMaterial = loadMaterial(stoneDirtImg);
const brickGreyMaterial = loadMaterial(brickGreyImg);
const snowMaterial = loadMaterial(snowImg);

export const tiles = [
    {
        type: 'stone',
        image: stoneImg,
        material: stoneMaterial,
    },
    {
        type: 'trunk',
        image: trunkSideImg,
        material: [
            trunkSideMaterial,
            trunkSideMaterial,
            trunkTopMaterial,
            trunkTopMaterial,
            trunkSideMaterial,
            trunkSideMaterial,
        ],
    },
    {
        type: 'tree-leaves',
        image: leavesTransparentImg,
        material: leavesTransparentMaterial,
    },
    {
        type: 'dirt',
        material: dirtMaterial,
        image: dirtImg,
    },
    {
        type: 'dirt-grass',
        material: [
            dirtGrassMaterial,
            dirtGrassMaterial,
            grassTopMaterial,
            dirtMaterial,
            dirtGrassMaterial,
            dirtGrassMaterial,
        ],
        image: dirtGrassImg,
    },
    {
        type: 'brick-grey',
        image: brickGreyImg,
        material: brickGreyMaterial,
    },
];

const otherTiles = [
    {
        type: 'color',
        input: 'color',
        material: colorMaterial,
    },
    {
        type: 'stone-dirt',
        image: stoneDirtImg,
        material: [
            stoneDirtMaterial,
            stoneDirtMaterial,
            dirtMaterial,
            stoneMaterial,
            stoneDirtMaterial,
            stoneDirtMaterial,
        ],
    },
    {
        type: 'stone-sand',
        image: stoneSandImg,
        material: [
            stoneSandMaterial,
            stoneSandMaterial,
            sandMaterial,
            stoneMaterial,
            stoneSandMaterial,
            stoneSandMaterial,
        ],
    },
    {
        type: 'snow',
        image: snowImg,
        material: snowMaterial,
    },
];

export default tiles;
