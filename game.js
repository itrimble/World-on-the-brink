class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // Globe setup
        const textureLoader = new THREE.TextureLoader();
        const earthTexture = textureLoader.load('https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg');
        const geometry = new THREE.SphereGeometry(5, 32, 32);
        const material = new THREE.MeshPhongMaterial({ map: earthTexture });
        this.globe = new THREE.Mesh(geometry, material);
        this.scene.add(this.globe);

        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 3, 5);
        this.scene.add(directionalLight);

        this.camera.position.z = 10;
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enablePan = false;

        // Map plane setup (initially invisible)
        const mapGeometry = new THREE.PlaneGeometry(20, 20);
        const mapMaterial = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0 });
        this.mapPlane = new THREE.Mesh(mapGeometry, mapMaterial);
        this.mapPlane.position.set(0, 0, 5);
        this.scene.add(this.mapPlane);

        // Game state
        this.politicalCapital = 100;
        this.tension = 0;
        this.influence = { USA: 0, USSR: 0 };
        this.isPaused = false;
        this.currentCrisis = null;
        this.isMapView = false;
        this.targetCameraPosition = new THREE.Vector3();
        // this.rotationProgress = 0; // Will be removed for new Lerp

        // Map plane animation properties
        this.mapOpacityTarget = 0;
        this.isAnimatingMapOpacity = false;
        this.mapPlaneFadeSpeed = 0.05; // Opacity change per frame

        // Region highlight management
        this.currentHighlight = null;

        // Regions and events for March 2025
        this.regions = {
            "South China Sea": { lat: 12, lon: 113 },
            "Europe": { lat: 50, lon: 15 },
            "Sahel Region": { lat: 15, lon: 0 },
            "Middle East": { lat: 30, lon: 45 }
        };
        this.events = [
            {
                description: "Naval standoff in the South China Sea threatens global trade!",
                region: "South China Sea",
                choices: [
                    { text: "Send diplomatic envoy", effects: { tension: 5, influence: { USA: 10, USSR: -5 }, capital: -10 } },
                    { text: "Deploy naval forces", effects: { tension: 15, influence: { USA: 15, USSR: -10 }, capital: -20 } },
                    { text: "Ignore the crisis", effects: { tension: 0, influence: { USA: -5, USSR: 5 }, capital: 0 } }
                ]
            },
            {
                description: "Cyberattack on European infrastructure—Russia suspected!",
                region: "Europe",
                choices: [
                    { text: "Launch counter-cyberattack", effects: { tension: 10, influence: { USA: 10, USSR: -10 }, capital: -15 } },
                    { text: "Impose sanctions", effects: { tension: 5, influence: { USA: 5, USSR: -5 }, capital: -10 } },
                    { text: "Do nothing", effects: { tension: 2, influence: { USA: -2, USSR: 2 }, capital: 0 } }
                ]
            },
            {
                description: "Drought in the Sahel Region sparks resource wars!",
                region: "Sahel Region",
                choices: [
                    { text: "Send humanitarian aid", effects: { tension: 5, influence: { USA: 10, USSR: -5 }, capital: -10 } },
                    { text: "Deploy peacekeeping forces", effects: { tension: 10, influence: { USA: 15, USSR: -10 }, capital: -20 } },
                    { text: "Ignore the crisis", effects: { tension: 0, influence: { USA: -5, USSR: 5 }, capital: 0 } }
                ]
            },
            {
                description: "Financial crisis in the Middle East triggers unrest!",
                region: "Middle East",
                choices: [
                    { text: "Provide economic support", effects: { tension: 5, influence: { USA: 10, USSR: -5 }, capital: -10 } },
                    { text: "Mediate negotiations", effects: { tension: 3, influence: { USA: 5, USSR: -3 }, capital: -5 } },
                    { text: "Do nothing", effects: { tension: 2, influence: { USA: -3, USSR: 3 }, capital: 0 } }
                ]
            }
        ];

        this.scheduleNextEvent();
        this.updateUI();

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') this.isPaused = !this.isPaused;
        });
    }

    update() {
        if (!this.isPaused) {
            // Smooth camera movement towards target region
            if (this.currentCrisis && !this.isMapView && this.targetCameraPosition) {
                const stepAlpha = 0.05; // Smoothing factor for Lerp
                this.camera.position.lerp(this.targetCameraPosition, stepAlpha);
                this.camera.lookAt(0, 0, 0); // Keep looking at the center of the globe
            }

            if (!this.isMapView) {
                this.controls.update(); // Only update controls if not in map view and camera is not being programmatically moved
                this.tension += 0.01; // Example: tension increases over time
                if (this.currentCrisis && this.isRegionCentered(this.currentCrisis.region)) {
                    document.getElementById('zoom-in-button').style.display = 'block';
                } else {
                    document.getElementById('zoom-in-button').style.display = 'none';
                }
            }

            // Animate map plane opacity
            if (this.isAnimatingMapOpacity) {
                if (this.mapPlane.material.opacity < this.mapOpacityTarget) {
                    this.mapPlane.material.opacity += this.mapPlaneFadeSpeed;
                    if (this.mapPlane.material.opacity >= this.mapOpacityTarget) {
                        this.mapPlane.material.opacity = this.mapOpacityTarget;
                        this.isAnimatingMapOpacity = false;
                    }
                } else if (this.mapPlane.material.opacity > this.mapOpacityTarget) {
                    this.mapPlane.material.opacity -= this.mapPlaneFadeSpeed;
                    if (this.mapPlane.material.opacity <= this.mapOpacityTarget) {
                        this.mapPlane.material.opacity = this.mapOpacityTarget;
                        this.isAnimatingMapOpacity = false;
                    }
                } else {
                     this.isAnimatingMapOpacity = false;
                }
            }
            this.updateUI();
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    scheduleNextEvent() {
        const delay = Math.random() * 20000 + 10000;
        setTimeout(() => {
            if (!this.isPaused) this.triggerEvent();
            this.scheduleNextEvent();
        }, delay);
    }

    triggerEvent() {
        this.currentCrisis = this.events[Math.floor(Math.random() * this.events.length)];
        // this.rotationProgress = 0; // Removed
        this.setCameraToRegion(this.currentCrisis.region); // This sets this.targetCameraPosition
        this.highlightRegion(this.currentCrisis.region);
        const panel = document.getElementById('event-panel');
        document.getElementById('event-description').innerText = `${this.currentCrisis.description} Navigate to ${this.currentCrisis.region} on the globe.`;
        document.getElementById('choice1').innerText = this.currentCrisis.choices[0].text;
        document.getElementById('choice2').innerText = this.currentCrisis.choices[1].text;
        document.getElementById('choice3').innerText = this.currentCrisis.choices[2].text;
        panel.style.display = 'block';
        this.isPaused = true;
    }

    setCameraToRegion(regionName) {
        const region = this.regions[regionName];
        const { lat, lon } = region;
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        const x = -10 * Math.sin(phi) * Math.cos(theta);
        const y = 10 * Math.cos(phi);
        const z = 10 * Math.sin(phi) * Math.sin(theta);
        this.targetCameraPosition.set(x, y, z);
    }

    highlightRegion(regionName) {
        // Remove previous highlight if it exists
        if (this.currentHighlight) {
            this.scene.remove(this.currentHighlight);
            this.currentHighlight.geometry.dispose(); // Dispose geometry
            this.currentHighlight.material.dispose(); // Dispose material
            this.currentHighlight = null;
        }

        const region = this.regions[regionName];
        const { lat, lon } = region;
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        const x = -5 * Math.sin(phi) * Math.cos(theta); // Radius 5 to be on surface of globe
        const y = 5 * Math.cos(phi);
        const z = 5 * Math.sin(phi) * Math.sin(theta);

        const highlightGeometry = new THREE.SphereGeometry(0.2, 16, 16); // Size 0.2, 16x16 segments
        const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.75 }); // Red, slightly transparent
        this.currentHighlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
        this.currentHighlight.position.set(x, y, z);
        this.scene.add(this.currentHighlight);
    }

    isRegionCentered(regionName) {
        const region = this.regions[regionName];
        const { lat, lon } = region;
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        const x = -5 * Math.sin(phi) * Math.cos(theta);
        const y = 5 * Math.cos(phi);
        const z = 5 * Math.sin(phi) * Math.sin(theta);

        const vector = new THREE.Vector3(x, y, z);
        vector.project(this.camera);
        const screenX = (vector.x + 1) * window.innerWidth / 2;
        const screenY = (-vector.y + 1) * window.innerHeight / 2;

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const threshold = 100;
        return Math.abs(screenX - centerX) < threshold && Math.abs(screenY - centerY) < threshold;
    }

    zoomToMap() {
        if (!this.currentCrisis || !this.isRegionCentered(this.currentCrisis.region)) return;
        this.isMapView = true;
        this.controls.enabled = false;
        this.camera.position.set(0, 0, 10);
        this.camera.lookAt(0, 0, 0);
        this.globe.visible = false;
        // this.mapPlane.material.opacity = 1; // Replaced by animation
        this.mapOpacityTarget = 1;
        this.isAnimatingMapOpacity = true;
        document.getElementById('event-panel').style.display = 'none';
        document.getElementById('zoom-in-button').style.display = 'none';
        document.getElementById('zoom-out-button').style.display = 'block';
    }

    zoomToGlobe() {
        this.isMapView = false;
        this.controls.enabled = true;
        this.camera.position.set(0, 0, 10);
        this.camera.lookAt(0, 0, 0);
        this.globe.visible = true;
        // this.mapPlane.material.opacity = 0; // Replaced by animation
        this.mapOpacityTarget = 0;
        this.isAnimatingMapOpacity = true;
        document.getElementById('zoom-out-button').style.display = 'none';
        if (this.currentCrisis) {
            document.getElementById('event-panel').style.display = 'block';
            document.getElementById('zoom-in-button').style.display = 'block';
        }
    }

    applyChoice(choiceIndex) {
        const choice = this.currentCrisis.choices[choiceIndex];
        this.tension += choice.effects.tension;
        this.influence.USA += choice.effects.influence.USA;
        this.influence.USSR += choice.effects.influence.USSR;
        this.politicalCapital += choice.effects.capital;
        document.getElementById('event-panel').style.display = 'none';
        document.getElementById('zoom-in-button').style.display = 'none';
        this.isPaused = false;
        this.currentCrisis = null;
        if (this.currentHighlight) { // Remove highlight when crisis is resolved
            this.scene.remove(this.currentHighlight);
            this.currentHighlight.geometry.dispose();
            this.currentHighlight.material.dispose();
            this.currentHighlight = null;
        }
        this.globe.visible = true;
        // this.mapPlane.material.opacity = 0; // Replaced by animation
        this.mapOpacityTarget = 0; 
        this.isAnimatingMapOpacity = true;
        this.isMapView = false;
        this.controls.enabled = true;
        this.updateUI();

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
        this.currentCrisis = null;
        if (this.currentHighlight) { // Also remove highlight on game reset
            this.scene.remove(this.currentHighlight);
            this.currentHighlight.geometry.dispose();
            this.currentHighlight.material.dispose();
            this.currentHighlight = null;
        }
        this.isMapView = false;
        this.controls.enabled = true;
        this.globe.visible = true;
        // this.mapPlane.material.opacity = 0; // Replaced by animation
        this.mapOpacityTarget = 0;
        this.isAnimatingMapOpacity = true;
        document.getElementById('zoom-in-button').style.display = 'none';
        document.getElementById('zoom-out-button').style.display = 'none';
        this.updateUI();
    }
}

window.addEventListener('load', () => {
    window.game = new Game();
    document.getElementById('choice1').addEventListener('click', () => window.game.applyChoice(0));
    document.getElementById('choice2').addEventListener('click', () => window.game.applyChoice(1));
    document.getElementById('choice3').addEventListener('click', () => window.game.applyChoice(2));
    function loop() {
        window.game.update();
        window.game.render();
        requestAnimationFrame(loop);
    }
    loop();
});
