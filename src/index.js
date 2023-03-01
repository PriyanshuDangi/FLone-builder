import Builder from './script';
import './loader.css';
import { PINATA_GATEWAY_URL } from './config/app';
import axios from 'axios';

const cubeLoader = document.getElementById('cubeLoader');
const disconnectButton = document.getElementById('disconnect');
const disconnectHomeButton = document.getElementById('disconnect-home-btn');
const cubeDiv = document.getElementById('cubeDiv');
const messageDiv = document.getElementById('messageDiv');
const allContainer = document.getElementById('all');

const max_cube_count = 150; // hardcoded max number of cubes

class state {
    constructor() {
        this.init();
    }

    async init() {
        this.pkh = null;
        this.token_id = 0;
        this.hash = null;
        this.message = '';
        this.error = false;
        this.maxCount = [
            max_cube_count,
            max_cube_count,
            max_cube_count,
            max_cube_count,
            max_cube_count,
            max_cube_count,
        ];
        this.previousCubes = [];
        this.previousImages = [];

        try {
            this.setTokenId();
            await this.fetchPreviousData();
            cubeLoader.classList.add('none');
            allContainer.classList.remove('hide');
            this.builder = new Builder(this.token_id, this.maxCount, this.previousCubes, this.previousImages);
        } catch (err) {
            console.log(err);
            this.error = true;
            if (err.name == 'Error') {
                this.message = err.message;
            } else {
                this.message = 'Error!';
            }
            if (cubeLoader.classList.contains('none')) {
                cubeLoader.classList.remove('none');
            }
            cubeDiv.classList.add('none');
            messageDiv.classList.remove('none');
            messageDiv.innerHTML = this.message;
            if (this.message === 'You are not the owner of this land!') {
                disconnectHomeButton.classList.remove('none');
            }
        }
        disconnectHomeButton.addEventListener('click', this.disconnect.bind(this), false);
        disconnectButton.addEventListener('click', this.disconnect.bind(this), false);
    }

    setTokenId() {
        const url = new URLSearchParams(window.location.search);
        let token_id = url.get('token_id');
        let hash = url.get('hash');
        if (token_id) {
            this.token_id = token_id;
        }
        if (hash) {
            this.hash = hash;
        }
        console.log(this.token_id);
    }
    async disconnect() {}

    async fetchPreviousData() {
        try {
            let hash = this.hash;
            if (!hash) {
                return;
            }
            let url = PINATA_GATEWAY_URL + hash;
            const res = await axios.get(url);
            this.previousCubes = res.data.cubes;

            this.previousImages = res.data.images ? res.data.images : [];
        } catch (err) {
            console.log(err);
        }
    }
}

let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
    _APP = new state();
});
