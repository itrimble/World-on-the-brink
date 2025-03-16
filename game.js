class Game {
    constructor() {
        // Log to verify script loading
        console.log('THREE:', THREE);
        console.log('OrbitControls:', THREE.OrbitControls);

        // Initialize Three.js scene
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // Load Earth texture
        const textureLoader = new THREE.TextureLoader();
        const earthTexture = textureLoader.load('https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg');

        // Create globe with texture
        const geometry = new THREE.SphereGeometry(5, 32, 32);
        const material = new THREE.MeshPhongMaterial({ map: earthTexture });
        this.globe = new THREE.Mesh(geometry, material);
        this.scene.add(this.globe);

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 3, 5);
        this.scene.add(directionalLight);

        // Position camera
        this.camera.position.z = 10;

        // Initialize OrbitControls with error handling
        try {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enablePan = false;
        } catch (e) {
            console.error('Failed to initialize OrbitControls:', e);
        }

        // Game state
        this.politicalCapital = 100;
        this.tension = 0;
        this.influence = { USA: 0, USSR: 0 };
        this.isPaused = false;

        // Event definitions
        this.events = [
            {
                description: "A coup attempt erupts in a South American country!",
                choices: [
                    { text: "Support the government", effects: { tension: 5, influence: { USA: 10, USSR: -5 }, capital: -10 } },
                    { text: "Support the rebels", effects: { tension: 10, influence: { USA: -5, USSR: 10 }, capital: -15 } },
                    { text: "Do nothing", effects: { tension: 0, influence: { USA: -2, USSR: -2 }, capital: 0 } }
                ]
            },
            {
                description: "A European ally requests military aid against Soviet influence.",
                choices: [
                    { text: "Send troops", effects: { tension: 15, influence: { USA: 15, USSR: -10 }, capital: -20 } },
                    { text: "Provide economic aid", effects: { tension: 5, influence: { USA: 10, USSR: -5 }, capital: -10 } },
                    { text: "Stay neutral", effects: { tension: 2, influence: { USA: -5, USSR: 5 }, capital: 0 } }
                ]
            }
            // Add more events here
        ];

        // Start event timer
        this.scheduleNextEvent();

        // Initial UI update
        this.updateUI();

        // Add pause toggle on spacebar
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                this.isPaused = !this.isPaused;
            }
        });
    }

    update() {
        if (!this.isPaused) {
            if (this.controls) this.controls.update();
            // Add subtle tension increase over time
            this.tension += 0.01;
            this.updateUI();
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    scheduleNextEvent() {
        const delay = Math.random() * 20000 + 10000; // Random delay between 10-30 seconds
        setTimeout(() => {
            if (!this.isPaused) this.triggerEvent();
            this.scheduleNextEvent();
        }, delay);
    }

    triggerEvent() {
        const event = this.events[Math.floor(Math.random() * this.events.length)];
        const panel = document.getElementById('event-panel');
        document.getElementById('event-description').innerText = event.description;
        document.getElementById('choice1').innerText = event.choices[0].text;
        document.getElementById('choice2').innerText = event.choices[1].text;
        document.getElementById('choice3').innerText = event.choices[2].text;
        panel.style.display = 'block';

        // Pause game during event
        this.isPaused = true;

        // Set up choice handlers
        document.getElementById('choice1').onclick = () => this.applyChoice(event.choices[0]);
        document.getElementById('choice2').onclick = () => this.applyChoice(event.choices[1]);
        document.getElementById('choice3').onclick = () => this.applyChoice(event.choices[2]);
    }

    applyChoice(choice) {
        this.tension += choice.effects.tension;
        this.influence.USA += choice.effects.influence.USA;
        this.influence.USSR += choice.effects.influence.USSR;
        this.politicalCapital += choice.effects.capital;
        document.getElementById('event-panel').style.display = 'none';
        this.isPaused = false; // Resume game
        this.updateUI();

        // Check for game over conditions
        if (this.tension >= 100) {
            alert("Nuclear war has broken out! Game over.");
            this.resetGame();
        } else if (this.politicalCapital <= 0) {
            alert("You've run out of political capital! Game over.");
            this.resetGame();
        }
    }

    updateUI() {
        document.getElementById('capital').innerText = this.politicalCapital;
        document.getElementById('tension').innerText = Math.floor(this.tension);
        document.getElementById('usa-influence').innerText = this.influence.USA;
        document.getElementById('ussr-influence').innerText = this.influence.USSR;
    }

    resetGame() {
        this.politicalCapital = 100;
        this.tension = 0;
        this.influence = { USA: 0, USSR: 0 };
        this.isPaused = false;
        this.updateUI();
    }
}

// Initialize game after all scripts are loaded
window.addEventListener('load', () => {
    const game = new Game();
    function loop() {
        game.update();
        game.render();
        requestAnimationFrame(loop);
    }
    loop();
});
