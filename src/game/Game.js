import * as THREE from 'three';

export class Game {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this.isRunning = false;
    this.isGameOver = false;
    this.score = 0;

    // Game states
    this.gameState = 'intro'; // 'intro', 'ready', 'playing', 'gameover'
    this.introStep = 0;
    this.introTimer = 0;

    // Game settings
    this.gameSpeed = 15;
    this.maxGameSpeed = 35;
    this.speedIncreaseRate = 0.5;
    this.lanes = [-3, 0, 3];
    this.currentLane = 1;
    this.targetLane = 1;

    // Player state
    this.isJumping = false;
    this.isSliding = false;
    this.slideTimeout = null;
    this.jumpVelocity = 0;
    this.gravity = 30;
    this.jumpForce = 12;

    // Ramp tracking
    this.isOnRamp = false;
    this.rampHeight = 0;
    this.wasOnElevatedSurface = false; // Track if cat was on ramp/roof before jumping

    // Track
    this.trackSegments = [];
    this.buildings = [];
    this.segmentLength = 50;
    this.numSegments = 6;

    // Obstacles
    this.obstacles = [];
    this.obstacleSpawnDistance = -80;
    this.minObstacleGap = 30;
    this.lastObstacleZ = this.obstacleSpawnDistance;
    this.lastBlockedLanes = []; // Track lanes blocked in previous spawn

    // Collectibles
    this.collectibles = [];
    this.fishCollected = 0;

    // Chaser dog
    this.chaserDog = null;
    this.chaserDistance = 8;
    this.chaserBaseDistance = 8;

    // Intro scene objects
    this.introDogBowl = null;
    this.introSceneGroup = null;

    // Touch controls
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.swipeThreshold = 50;
  }

  init() {
    this.setupScene();
    this.setupCamera();
    this.setupRenderer();
    this.setupLighting();
    this.createIntroScene();
    this.setupEventListeners();
    this.animate();

    console.log('Catway Surfers initialized!');
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 30, 120);
  }

  setupCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 500);
    this.camera.position.set(0, 3, 8);
    this.camera.lookAt(0, 1, 0);
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const container = document.getElementById('game-container');
    container.appendChild(this.renderer.domElement);
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(10, 20, 10);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 1024;
    this.directionalLight.shadow.mapSize.height = 1024;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 100;
    this.directionalLight.shadow.camera.left = -30;
    this.directionalLight.shadow.camera.right = 30;
    this.directionalLight.shadow.camera.top = 30;
    this.directionalLight.shadow.camera.bottom = -30;
    this.scene.add(this.directionalLight);
  }

  createIntroScene() {
    this.introSceneGroup = new THREE.Group();

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(30, 30);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x4a7c59 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.introSceneGroup.add(ground);

    // Dog house in background
    const house = this.createIntroDogHouse();
    house.position.set(3, 0, -3);
    this.introSceneGroup.add(house);

    // Dog bowl
    this.introDogBowl = this.createDogBowl();
    this.introDogBowl.position.set(0, 0, 0);
    this.introSceneGroup.add(this.introDogBowl);

    // Create cat for intro
    this.createPlaceholderCat();
    this.cat.position.set(-5, 0, 2);
    this.cat.rotation.y = 0.3;

    // Create chaser dog (hidden initially)
    this.createChaserDog();
    this.chaserDog.position.set(5, 0, -2);
    this.chaserDog.rotation.y = -Math.PI;
    this.chaserDog.visible = false;

    this.scene.add(this.introSceneGroup);

    // Start intro
    this.startIntro();
  }

  createIntroDogHouse() {
    const house = new THREE.Group();

    const baseGeometry = new THREE.BoxGeometry(3, 2.5, 3);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xCD853F });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 1.25;
    base.castShadow = true;
    house.add(base);

    const roofGeometry = new THREE.ConeGeometry(2.5, 1.5, 4);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 3.25;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    house.add(roof);

    const doorGeometry = new THREE.CircleGeometry(0.6, 16);
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 1, 1.51);
    house.add(door);

    // "DOG" sign
    const signGeometry = new THREE.BoxGeometry(1.5, 0.4, 0.1);
    const signMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(0, 2.3, 1.55);
    house.add(sign);

    return house;
  }

  createDogBowl() {
    const bowl = new THREE.Group();

    // Bowl base
    const bowlGeometry = new THREE.CylinderGeometry(0.6, 0.4, 0.3, 16);
    const bowlMaterial = new THREE.MeshStandardMaterial({ color: 0xff4444 });
    const bowlMesh = new THREE.Mesh(bowlGeometry, bowlMaterial);
    bowlMesh.position.y = 0.15;
    bowlMesh.castShadow = true;
    bowl.add(bowlMesh);

    // Food in bowl
    this.bowlFood = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const kibbleGeometry = new THREE.SphereGeometry(0.08, 8, 8);
      const kibbleMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
      const kibble = new THREE.Mesh(kibbleGeometry, kibbleMaterial);
      kibble.position.set(
        (Math.random() - 0.5) * 0.4,
        0.3,
        (Math.random() - 0.5) * 0.4
      );
      this.bowlFood.add(kibble);
    }
    bowl.add(this.bowlFood);

    return bowl;
  }

  startIntro() {
    this.gameState = 'intro';
    this.introStep = 0;
    this.introTimer = 0;
    this.updateIntroText("A hungry cat spots some delicious dog food...");
  }

  updateIntroText(text) {
    const introText = document.getElementById('intro-text');
    if (introText) {
      introText.textContent = text;
    }
  }

  updateIntro(delta) {
    this.introTimer += delta;
    const time = this.clock.getElapsedTime();

    // Animate cat legs while walking
    if (this.catLegs) {
      this.catLegs[0].rotation.x = Math.sin(time * 8) * 0.4;
      this.catLegs[1].rotation.x = -Math.sin(time * 8) * 0.4;
      this.catLegs[2].rotation.x = -Math.sin(time * 8) * 0.4;
      this.catLegs[3].rotation.x = Math.sin(time * 8) * 0.4;
    }
    if (this.catTail) {
      this.catTail.rotation.z = Math.sin(time * 5) * 0.3;
    }

    switch (this.introStep) {
      case 0: // Cat approaches bowl
        if (this.cat.position.x < -0.5) {
          this.cat.position.x += delta * 1.5;
          this.cat.position.z += delta * -0.7;
          this.cat.rotation.y = Math.atan2(-0.7, 1.5);
        } else if (this.introTimer > 2) {
          this.introStep = 1;
          this.introTimer = 0;
          this.updateIntroText("*munch munch* Mmm, tasty!");
          this.cat.rotation.y = 0;
        }
        break;

      case 1: // Cat eating
        // Eating animation - cat head bobs
        this.cat.position.y = Math.sin(time * 10) * 0.05;

        // Remove food pieces one by one
        if (this.bowlFood.children.length > 0 && this.introTimer > 0.5) {
          this.bowlFood.remove(this.bowlFood.children[0]);
          this.introTimer = 0.3;
        }

        if (this.bowlFood.children.length === 0) {
          this.introStep = 2;
          this.introTimer = 0;
          this.updateIntroText("*WOOF WOOF!* The dog is coming!");
          this.chaserDog.visible = true;
          this.chaserDog.position.set(5, 0, -2);
        }
        break;

      case 2: // Dog appears and barks
        // Dog runs in
        if (this.chaserDog.position.x > 2) {
          this.chaserDog.position.x -= delta * 3;
          this.chaserDog.rotation.y = Math.PI;

          // Dog leg animation
          if (this.dogLegs) {
            this.dogLegs[0].rotation.x = Math.sin(time * 12) * 0.6;
            this.dogLegs[1].rotation.x = -Math.sin(time * 12) * 0.6;
            this.dogLegs[2].rotation.x = -Math.sin(time * 12) * 0.6;
            this.dogLegs[3].rotation.x = Math.sin(time * 12) * 0.6;
          }
        }

        // Cat looks scared
        this.cat.rotation.y = Math.sin(time * 15) * 0.2 + Math.PI;

        if (this.introTimer > 2) {
          this.introStep = 3;
          this.introTimer = 0;
          this.updateIntroText("RUN!!!");
        }
        break;

      case 3: // Transition to game
        if (this.introTimer > 1) {
          this.skipIntro();
        }
        break;
    }
  }

  skipIntro() {
    // Clean up intro scene
    if (this.introSceneGroup) {
      this.scene.remove(this.introSceneGroup);
    }

    // Hide intro UI
    document.getElementById('intro-screen').style.display = 'none';
    document.getElementById('start-screen').style.display = 'block';

    // Setup game scene
    this.setupGameScene();
    this.gameState = 'ready';
  }

  setupGameScene() {
    // Reset camera for gameplay
    this.camera.position.set(0, 6, 12);
    this.camera.lookAt(0, 1, -10);

    // Create track
    this.createTrack();

    // Reset cat position
    this.cat.position.set(this.lanes[this.currentLane], 0, 0);
    this.cat.rotation.y = 0;
    this.cat.scale.set(1, 1, 1);

    // Reset chaser
    this.chaserDog.position.set(0, 0, this.chaserDistance);
    this.chaserDog.rotation.y = 0;
    this.chaserDog.visible = true;
  }

  createTrack() {
    for (let i = 0; i < this.numSegments; i++) {
      const segment = this.createTrackSegment();
      segment.position.z = -i * this.segmentLength;
      this.trackSegments.push(segment);
      this.scene.add(segment);

      const buildingGroup = this.createBuildingsForSegment(-i * this.segmentLength);
      this.buildings.push(buildingGroup);
      this.scene.add(buildingGroup);
    }
  }

  createTrackSegment() {
    const segment = new THREE.Group();

    const roadGeometry = new THREE.PlaneGeometry(12, this.segmentLength);
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    segment.add(road);

    const dividerMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    [-1.5, 1.5].forEach(x => {
      for (let z = -this.segmentLength / 2 + 2; z < this.segmentLength / 2; z += 4) {
        const dividerGeometry = new THREE.PlaneGeometry(0.15, 2);
        const divider = new THREE.Mesh(dividerGeometry, dividerMaterial);
        divider.rotation.x = -Math.PI / 2;
        divider.position.set(x, 0.01, z);
        segment.add(divider);
      }
    });

    const sidewalkGeometry = new THREE.PlaneGeometry(3, this.segmentLength);
    const sidewalkMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 });
    [-7.5, 7.5].forEach(x => {
      const sidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
      sidewalk.rotation.x = -Math.PI / 2;
      sidewalk.position.set(x, 0.05, 0);
      sidewalk.receiveShadow = true;
      segment.add(sidewalk);
    });

    const grassGeometry = new THREE.PlaneGeometry(30, this.segmentLength);
    const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x4a7c59, roughness: 1 });
    [-24, 24].forEach(x => {
      const grass = new THREE.Mesh(grassGeometry, grassMaterial);
      grass.rotation.x = -Math.PI / 2;
      grass.position.set(x, -0.1, 0);
      segment.add(grass);
    });

    return segment;
  }

  createBuildingsForSegment(zOffset) {
    const group = new THREE.Group();
    const buildingColors = [0xd4a574, 0x8b7355, 0xa0522d, 0xbc8f8f, 0x696969, 0x808080];

    for (let z = 0; z < this.segmentLength; z += 15) {
      [-14, 14].forEach(side => {
        const width = 6 + Math.random() * 4;
        const height = 8 + Math.random() * 15;
        const depth = 6 + Math.random() * 4;

        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshStandardMaterial({
          color: buildingColors[Math.floor(Math.random() * buildingColors.length)]
        });
        const building = new THREE.Mesh(geometry, material);
        building.position.set(side + (Math.random() - 0.5) * 3, height / 2, -z + (Math.random() - 0.5) * 5);
        building.castShadow = true;
        building.receiveShadow = true;
        group.add(building);
      });
    }

    group.position.z = zOffset;
    return group;
  }

  createPlaceholderCat() {
    this.cat = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xff9933 });

    const bodyGeometry = new THREE.CapsuleGeometry(0.5, 0.8, 8, 16);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    body.position.y = 0.8;
    body.castShadow = true;
    this.cat.add(body);

    const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.set(0, 1.2, -0.6);
    head.castShadow = true;
    this.cat.add(head);

    const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    [[-0.15, 1.3, -0.9], [0.15, 1.3, -0.9]].forEach(pos => {
      const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      eye.position.set(...pos);
      this.cat.add(eye);
    });

    const earGeometry = new THREE.ConeGeometry(0.15, 0.3, 4);
    [[-0.25, 1.55, -0.6, -0.3], [0.25, 1.55, -0.6, 0.3]].forEach(([x, y, z, rot]) => {
      const ear = new THREE.Mesh(earGeometry, bodyMaterial);
      ear.position.set(x, y, z);
      ear.rotation.z = rot;
      this.cat.add(ear);
    });

    const tailGeometry = new THREE.CylinderGeometry(0.08, 0.12, 1, 8);
    const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
    tail.position.set(0, 1, 0.8);
    tail.rotation.x = -0.6;
    tail.castShadow = true;
    this.cat.add(tail);
    this.catTail = tail;

    this.catLegs = [];
    const legGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8);
    [[-0.25, 0.25, -0.3], [0.25, 0.25, -0.3], [-0.25, 0.25, 0.3], [0.25, 0.25, 0.3]].forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, bodyMaterial);
      leg.position.set(...pos);
      leg.castShadow = true;
      this.cat.add(leg);
      this.catLegs.push(leg);
    });

    this.scene.add(this.cat);
  }

  createChaserDog() {
    this.chaserDog = new THREE.Group();
    const dogMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });

    const bodyGeometry = new THREE.CapsuleGeometry(0.6, 1.2, 8, 16);
    const body = new THREE.Mesh(bodyGeometry, dogMaterial);
    body.rotation.x = Math.PI / 2;
    body.position.y = 1;
    body.castShadow = true;
    this.chaserDog.add(body);

    const headGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const head = new THREE.Mesh(headGeometry, dogMaterial);
    head.position.set(0, 1.3, -0.9);
    head.castShadow = true;
    this.chaserDog.add(head);

    const snoutGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.4, 8);
    const snout = new THREE.Mesh(snoutGeometry, dogMaterial);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 1.2, -1.3);
    this.chaserDog.add(snout);

    const noseGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const noseMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.set(0, 1.2, -1.5);
    this.chaserDog.add(nose);

    const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    [[-0.2, 1.45, -1.2], [0.2, 1.45, -1.2]].forEach(pos => {
      const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      eye.position.set(...pos);
      this.chaserDog.add(eye);
    });

    const earGeometry = new THREE.CapsuleGeometry(0.15, 0.3, 4, 8);
    [[-0.35, 1.5, -0.7, 0.5], [0.35, 1.5, -0.7, -0.5]].forEach(([x, y, z, rot]) => {
      const ear = new THREE.Mesh(earGeometry, dogMaterial);
      ear.position.set(x, y, z);
      ear.rotation.z = rot;
      this.chaserDog.add(ear);
    });

    this.dogLegs = [];
    const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8);
    [[-0.3, 0.3, -0.4], [0.3, 0.3, -0.4], [-0.3, 0.3, 0.5], [0.3, 0.3, 0.5]].forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, dogMaterial);
      leg.position.set(...pos);
      leg.castShadow = true;
      this.chaserDog.add(leg);
      this.dogLegs.push(leg);
    });

    const tailGeometry = new THREE.CylinderGeometry(0.06, 0.1, 0.8, 8);
    this.dogTail = new THREE.Mesh(tailGeometry, dogMaterial);
    this.dogTail.position.set(0, 1.2, 1.2);
    this.dogTail.rotation.x = -0.8;
    this.chaserDog.add(this.dogTail);

    this.scene.add(this.chaserDog);
  }

  createDogHouse(lane) {
    const house = new THREE.Group();
    house.userData.type = 'doghouse';
    house.userData.lane = lane;

    const baseGeometry = new THREE.BoxGeometry(2, 1.5, 2);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xCD853F });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.75;
    base.castShadow = true;
    house.add(base);

    const roofGeometry = new THREE.ConeGeometry(1.6, 1, 4);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 2;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    house.add(roof);

    const doorGeometry = new THREE.CircleGeometry(0.4, 16);
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 0.6, 1.01);
    house.add(door);

    house.position.set(this.lanes[lane], 0, this.obstacleSpawnDistance);
    return house;
  }

  createObstacleDog(lane) {
    const dog = new THREE.Group();
    dog.userData.type = 'dog';
    dog.userData.lane = lane;

    // Random dog colors: reddish brown, light brown, golden retriever yellow
    const dogColors = [0x8B2500, 0xA0522D, 0xD4A574, 0xC4A45C, 0x8B4513];
    const dogColor = dogColors[Math.floor(Math.random() * dogColors.length)];
    const dogMaterial = new THREE.MeshStandardMaterial({ color: dogColor });

    const bodyGeometry = new THREE.CapsuleGeometry(0.4, 0.7, 8, 16);
    const body = new THREE.Mesh(bodyGeometry, dogMaterial);
    body.rotation.x = Math.PI / 2;
    body.position.y = 0.7;
    body.castShadow = true;
    dog.add(body);

    const headGeometry = new THREE.SphereGeometry(0.35, 16, 16);
    const head = new THREE.Mesh(headGeometry, dogMaterial);
    head.position.set(0, 0.9, -0.6);
    head.castShadow = true;
    dog.add(head);

    const snoutGeometry = new THREE.BoxGeometry(0.2, 0.15, 0.3);
    const snout = new THREE.Mesh(snoutGeometry, dogMaterial);
    snout.position.set(0, 0.85, -0.9);
    dog.add(snout);

    const legGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8);
    [[-0.2, 0.2, -0.2], [0.2, 0.2, -0.2], [-0.2, 0.2, 0.3], [0.2, 0.2, 0.3]].forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, dogMaterial);
      leg.position.set(...pos);
      dog.add(leg);
    });

    dog.position.set(this.lanes[lane], 0, this.obstacleSpawnDistance);
    return dog;
  }

  createCatCatcherTruck(lane) {
    const truck = new THREE.Group();
    truck.userData.type = 'truck';
    truck.userData.lane = lane;
    truck.userData.roofHeight = 4.4; // Top of cargo box

    const truckMaterial = new THREE.MeshStandardMaterial({ color: 0x2255aa });
    const whiteMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const blackMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6 });

    // Ground clearance - raise everything to show slide-under space
    const groundClearance = 1.0;

    // Truck cab (front) - raised
    const cabGeometry = new THREE.BoxGeometry(2.2, 1.8, 1.8);
    const cab = new THREE.Mesh(cabGeometry, truckMaterial);
    cab.position.set(0, groundClearance + 1.1, 1.5);
    cab.castShadow = true;
    truck.add(cab);

    // Windshield
    const windshieldGeometry = new THREE.PlaneGeometry(1.8, 0.9);
    const windshieldMaterial = new THREE.MeshStandardMaterial({ color: 0x88ccff, metalness: 0.5 });
    const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
    windshield.position.set(0, groundClearance + 1.5, 2.41);
    truck.add(windshield);

    // Truck cargo box (back) - tall so you can't jump over, raised
    const cargoGeometry = new THREE.BoxGeometry(2.4, 3.2, 4);
    const cargo = new THREE.Mesh(cargoGeometry, whiteMaterial);
    cargo.position.set(0, groundClearance + 1.8, -0.8);
    cargo.castShadow = true;
    truck.add(cargo);

    // "CAT CATCHER" sign on side (left)
    const signGeometry = new THREE.BoxGeometry(0.05, 0.8, 3);
    const signMaterial = new THREE.MeshStandardMaterial({ color: 0xff4444 });
    const signLeft = new THREE.Mesh(signGeometry, signMaterial);
    signLeft.position.set(-1.23, groundClearance + 1.8, -0.8);
    truck.add(signLeft);

    // "CAT CATCHER" sign on side (right)
    const signRight = new THREE.Mesh(signGeometry, signMaterial);
    signRight.position.set(1.23, groundClearance + 1.8, -0.8);
    truck.add(signRight);

    // Larger wheels to support raised body
    const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
    const wheelPositions = [
      [-1.1, 0.5, 1.2],
      [1.1, 0.5, 1.2],
      [-1.1, 0.5, -1.5],
      [1.1, 0.5, -1.5]
    ];
    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, blackMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(...pos);
      truck.add(wheel);
    });

    // Visible undercarriage frame - shows the space to slide through
    const frameGeometry = new THREE.BoxGeometry(1.8, 0.15, 5);
    const frame = new THREE.Mesh(frameGeometry, metalMaterial);
    frame.position.set(0, groundClearance, 0);
    truck.add(frame);

    // Axles connecting wheels
    const axleGeometry = new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8);
    const frontAxle = new THREE.Mesh(axleGeometry, metalMaterial);
    frontAxle.rotation.z = Math.PI / 2;
    frontAxle.position.set(0, 0.5, 1.2);
    truck.add(frontAxle);

    const rearAxle = new THREE.Mesh(axleGeometry, metalMaterial);
    rearAxle.rotation.z = Math.PI / 2;
    rearAxle.position.set(0, 0.5, -1.5);
    truck.add(rearAxle);

    truck.position.set(this.lanes[lane], 0, this.obstacleSpawnDistance);
    return truck;
  }

  createTallTruck(lane) {
    const truck = new THREE.Group();
    truck.userData.type = 'tallTruck';
    truck.userData.lane = lane;
    truck.userData.roofHeight = 3.5; // 2 stories tall

    const truckMaterial = new THREE.MeshStandardMaterial({ color: 0x995522 }); // Brown
    const cargoMaterial = new THREE.MeshStandardMaterial({ color: 0xdddddd }); // Light gray cargo
    const blackMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });

    // Truck cab (front)
    const cabGeometry = new THREE.BoxGeometry(2.2, 1.8, 1.8);
    const cab = new THREE.Mesh(cabGeometry, truckMaterial);
    cab.position.set(0, 0.9, 1.5);
    cab.castShadow = true;
    truck.add(cab);

    // Windshield
    const windshieldGeometry = new THREE.PlaneGeometry(1.8, 0.9);
    const windshieldMaterial = new THREE.MeshStandardMaterial({ color: 0x88ccff, metalness: 0.5 });
    const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
    windshield.position.set(0, 1.3, 2.41);
    truck.add(windshield);

    // Main cargo box (2 stories tall, no ground clearance - can't slide under)
    const cargoGeometry = new THREE.BoxGeometry(2.5, 3.5, 5);
    const cargo = new THREE.Mesh(cargoGeometry, cargoMaterial);
    cargo.position.set(0, 1.75, -1);
    cargo.castShadow = true;
    truck.add(cargo);

    // Roof platform (walkable)
    const roofGeometry = new THREE.BoxGeometry(2.6, 0.15, 5.2);
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, 3.55, -1);
    roof.receiveShadow = true;
    truck.add(roof);

    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
    const wheelPositions = [
      [-1.1, 0.4, 1.2],
      [1.1, 0.4, 1.2],
      [-1.1, 0.4, -2],
      [1.1, 0.4, -2]
    ];
    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, blackMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(...pos);
      truck.add(wheel);
    });

    // Side stripe decoration
    const stripeGeometry = new THREE.BoxGeometry(0.05, 0.3, 4.5);
    const stripeMaterial = new THREE.MeshStandardMaterial({ color: 0x3366aa });
    const leftStripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
    leftStripe.position.set(-1.28, 2, -1);
    truck.add(leftStripe);
    const rightStripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
    rightStripe.position.set(1.28, 2, -1);
    truck.add(rightStripe);

    truck.position.set(this.lanes[lane], 0, this.obstacleSpawnDistance);
    return truck;
  }

  createRampTruck(lane) {
    const truck = new THREE.Group();
    truck.userData.type = 'rampTruck';
    truck.userData.lane = lane;
    truck.userData.roofHeight = 3.5; // Height of the roof (2 stories)

    // Fixed ramp length, random roof/platform length (4 to 20 units, like 1-5 doghouses)
    const rampLength = 7;
    const roofLength = 4 + Math.floor(Math.random() * 17); // 4 to 20 units
    truck.userData.rampLength = rampLength;
    truck.userData.roofLength = roofLength;

    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const rampMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaa55 }); // Yellow-ish ramp

    // Main structure (2 stories tall, solid block) - at end of ramp
    const buildingDepth = roofLength;
    const buildingGeometry = new THREE.BoxGeometry(2.5, 3.5, buildingDepth);
    const building = new THREE.Mesh(buildingGeometry, wallMaterial);
    building.position.set(0, 1.75, -buildingDepth / 2);
    building.castShadow = true;
    truck.add(building);

    // Roof platform (where cat walks) - scales with building
    const roofGeometry = new THREE.BoxGeometry(2.8, 0.2, roofLength + 0.5);
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, 3.6, -roofLength / 2);
    roof.receiveShadow = true;
    truck.add(roof);

    // Ramp going from ground (front, towards player) up to roof (back)
    const rampAngle = 0.47; // Fixed angle for fixed ramp length
    const rampGeometry = new THREE.BoxGeometry(2.4, 0.2, rampLength);
    const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
    ramp.position.set(0, 1.75, rampLength / 2 - 0.5); // Center of ramp
    ramp.rotation.x = rampAngle;
    ramp.castShadow = true;
    truck.add(ramp);

    // Ramp side rails
    const rampRailGeometry = new THREE.BoxGeometry(0.1, 0.5, rampLength);
    const leftRampRail = new THREE.Mesh(rampRailGeometry, wallMaterial);
    leftRampRail.position.set(-1.15, 1.95, rampLength / 2 - 0.5);
    leftRampRail.rotation.x = rampAngle;
    truck.add(leftRampRail);
    const rightRampRail = new THREE.Mesh(rampRailGeometry, wallMaterial);
    rightRampRail.position.set(1.15, 1.95, rampLength / 2 - 0.5);
    rightRampRail.rotation.x = rampAngle;
    truck.add(rightRampRail);

    // Back wall (so you know it's solid)
    const backWallGeometry = new THREE.BoxGeometry(2.8, 0.5, 0.2);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, 3.75, -roofLength - 0.1);
    truck.add(backWall);

    truck.position.set(this.lanes[lane], 0, this.obstacleSpawnDistance);

    // Spawn fish on the ramp/roof (50% chance per ramp)
    if (Math.random() < 0.5) {
      const numFish = 1 + Math.floor(Math.random() * 3); // 1-3 fish
      for (let i = 0; i < numFish; i++) {
        // Random position along ramp or roof
        const onRoof = Math.random() < 0.4;
        let fishZ, fishY;
        if (onRoof) {
          fishZ = -Math.random() * roofLength;
          fishY = 3.5 + 1; // On roof + floating height
        } else {
          // On ramp - calculate height based on position
          const rampProgress = Math.random();
          fishZ = rampLength * (1 - rampProgress) - 0.5;
          fishY = rampProgress * 3.5 + 1; // Ramp height + floating
        }
        const fish = this.createFish(lane, this.obstacleSpawnDistance + fishZ);
        fish.position.y = fishY;
        this.collectibles.push(fish);
        this.scene.add(fish);
      }
    }

    return truck;
  }

  createFish(lane, zPos) {
    const fish = new THREE.Group();
    fish.userData.type = 'fish';
    fish.userData.lane = lane;

    const fishMaterial = new THREE.MeshStandardMaterial({ color: 0x4169E1, metalness: 0.3 });

    const bodyGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    bodyGeometry.scale(1, 0.6, 1.5);
    const body = new THREE.Mesh(bodyGeometry, fishMaterial);
    body.castShadow = true;
    fish.add(body);

    const tailGeometry = new THREE.ConeGeometry(0.2, 0.3, 3);
    const tail = new THREE.Mesh(tailGeometry, fishMaterial);
    tail.rotation.x = Math.PI / 2;
    tail.position.z = 0.4;
    fish.add(tail);

    const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye.position.set(0.1, 0.05, -0.2);
    fish.add(eye);

    fish.position.set(this.lanes[lane], 1, zPos);
    fish.rotation.y = Math.PI;
    return fish;
  }

  spawnTallTruckWithFish(lane, zPos) {
    const tallTruck = this.createTallTruck(lane);
    tallTruck.position.z = zPos;
    this.obstacles.push(tallTruck);
    this.scene.add(tallTruck);

    // 50% chance to spawn fish on top
    if (Math.random() < 0.5) {
      const numFish = 1 + Math.floor(Math.random() * 2); // 1-2 fish
      for (let f = 0; f < numFish; f++) {
        const fish = this.createFish(lane, zPos - 2 + Math.random() * 4);
        fish.position.y = 3.5 + 1; // Roof height + floating
        this.collectibles.push(fish);
        this.scene.add(fish);
      }
    }
  }

  spawnObstacle() {
    // Only spawn when we've traveled minObstacleGap distance since last spawn
    if (this.lastObstacleZ < this.obstacleSpawnDistance + this.minObstacleGap) return;

    // Decide how many lanes to block (1 or 2, never all 3)
    const numObstacles = Math.random() < 0.7 ? 1 : 2;

    // Pick random lanes
    const availableLanes = [0, 1, 2];
    const usedLanes = [];

    // Track if we spawn a ramp - if so, no other obstacles in this frame
    let spawnedRamp = false;

    for (let i = 0; i < numObstacles; i++) {
      // If a ramp was spawned, don't spawn any more obstacles at this Z position
      if (spawnedRamp) break;

      const laneIndex = Math.floor(Math.random() * availableLanes.length);
      const lane = availableLanes.splice(laneIndex, 1)[0];
      usedLanes.push(lane);

      // Decide obstacle type (12% cat catcher, 15% ramp, 36% doghouse, 37% dog)
      // Tall trucks spawn WITH ramp trucks, not separately
      const rand = Math.random();
      let obstacle;
      if (rand < 0.12) {
        obstacle = this.createCatCatcherTruck(lane);
      } else if (rand < 0.27) {
        obstacle = this.createRampTruck(lane);
        spawnedRamp = true; // Mark that we spawned a ramp - no other obstacles in same frame
        // 70% chance to spawn tall trucks near the ramp
        if (Math.random() < 0.7) {
          const roofLen = obstacle.userData.roofLength || 4;
          const jumpDistance = 8 + Math.random() * 4; // 8-12 units jump distance

          // Decide pattern: single, side-by-side, or line
          const pattern = Math.random();

          if (pattern < 0.4) {
            // Single tall truck in random lane
            const truckLane = Math.floor(Math.random() * 3);
            this.spawnTallTruckWithFish(truckLane, this.obstacleSpawnDistance - roofLen - jumpDistance);
          } else if (pattern < 0.7) {
            // Two trucks side by side (2 random lanes)
            const lanes = [0, 1, 2];
            const lane1 = lanes.splice(Math.floor(Math.random() * 3), 1)[0];
            const lane2 = lanes[Math.floor(Math.random() * 2)];
            const zPos = this.obstacleSpawnDistance - roofLen - jumpDistance;
            this.spawnTallTruckWithFish(lane1, zPos);
            this.spawnTallTruckWithFish(lane2, zPos);
          } else {
            // Line of trucks (2-3 in same lane)
            const truckLane = Math.floor(Math.random() * 3);
            const numTrucks = 2 + Math.floor(Math.random() * 2); // 2-3 trucks
            for (let t = 0; t < numTrucks; t++) {
              const zPos = this.obstacleSpawnDistance - roofLen - jumpDistance - (t * 6);
              this.spawnTallTruckWithFish(truckLane, zPos);
            }
          }
        }
      } else if (rand < 0.63) {
        obstacle = this.createDogHouse(lane);
      } else {
        obstacle = this.createObstacleDog(lane);
      }

      this.obstacles.push(obstacle);
      this.scene.add(obstacle);
    }

    // Spawn fish in a clear lane
    if (Math.random() < 0.7 && availableLanes.length > 0) {
      const fishLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
      const fish = this.createFish(fishLane, this.obstacleSpawnDistance - 5);
      this.collectibles.push(fish);
      this.scene.add(fish);
    }

    this.lastObstacleZ = this.obstacleSpawnDistance;
  }

  checkCollisions() {
    if (!this.cat || this.isGameOver) return;

    const catBox = new THREE.Box3().setFromObject(this.cat);
    catBox.expandByScalar(-0.2);

    // Roof detection - check ramp trucks and cat catcher trucks for landing
    this.isOnRamp = false;
    this.rampHeight = 0;

    for (const obstacle of this.obstacles) {
      const truckZ = obstacle.position.z;
      const truckLane = obstacle.userData.lane;

      // Check if truck is in range (cat at z=0) - wider range for long ramps
      if (truckZ > -15 && truckZ < 30 && this.targetLane === truckLane) {

        if (obstacle.userData.type === 'rampTruck') {
          // Ramp truck - calculate height based on position
          const roofHeight = obstacle.userData.roofHeight || 3.5;
          const rampLen = obstacle.userData.rampLength || 7;
          const roofLen = obstacle.userData.roofLength || 4;

          // Ramp goes from ground (truckZ + rampLen) to roof level (truckZ)
          // Roof goes from truckZ to (truckZ - roofLen)
          const rampStart = truckZ + rampLen; // Front of ramp (ground level)
          const rampEnd = truckZ;              // Top of ramp (roof level)
          const roofEnd = truckZ - roofLen;    // Back of roof
          const catZ = 0; // Cat is always at z=0

          if (catZ <= rampStart && catZ >= roofEnd) {
            // Can't slide under a ramp - cancel slide and walk up
            if (this.isSliding) {
              this.cancelSlide();
            }

            this.isOnRamp = true;
            this.wasOnElevatedSurface = true; // Remember we were on a ramp

            if (catZ > rampEnd) {
              // Cat is on the ramp - calculate height based on progress
              // rampStart = ground (height 0), rampEnd = roof (height roofHeight)
              const rampProgress = (rampStart - catZ) / (rampStart - rampEnd);
              const calculatedHeight = rampProgress * roofHeight;
              this.rampHeight = Math.max(this.rampHeight, calculatedHeight);
            } else {
              // Cat is on the roof
              this.rampHeight = Math.max(this.rampHeight, roofHeight);
            }
          }
        }
        else if (obstacle.userData.type === 'truck') {
          // Cat Catcher truck - can ONLY land on roof if previously on elevated surface
          const roofHeight = obstacle.userData.roofHeight || 4.4;
          if (this.isOnRamp || this.wasOnElevatedSurface) {
            this.isOnRamp = true; // Mark as on elevated surface
            this.wasOnElevatedSurface = true; // Keep tracking
            this.rampHeight = Math.max(this.rampHeight, roofHeight);
          }
        }
        else if (obstacle.userData.type === 'tallTruck') {
          // Tall truck - can ONLY land on roof if previously on elevated surface
          const roofHeight = obstacle.userData.roofHeight || 3.5;
          if (this.isOnRamp || this.wasOnElevatedSurface) {
            this.isOnRamp = true; // Mark as on elevated surface
            this.wasOnElevatedSurface = true; // Keep tracking
            this.rampHeight = Math.max(this.rampHeight, roofHeight);
          }
        }
      }
    }

    // If on ramp/roof and not jumping, stop any falling
    if (this.isOnRamp && !this.isJumping) {
      this.jumpVelocity = 0;
    }

    // Reset wasOnElevatedSurface when cat lands on the ground
    if (!this.isOnRamp && !this.isJumping && this.cat.position.y < 0.5) {
      this.wasOnElevatedSurface = false;
    }

    // Now handle other obstacle collisions with bounding box
    for (const obstacle of this.obstacles) {
      if (obstacle.userData.type === 'rampTruck') continue; // Already handled above

      if (obstacle.position.z > -2 && obstacle.position.z < 2) {
        const obstacleBox = new THREE.Box3().setFromObject(obstacle);

        if (catBox.intersectsBox(obstacleBox)) {
          if (obstacle.userData.type === 'doghouse') {
            // Doghouse: can jump over
            if (!this.isJumping || this.cat.position.y < 1.5) {
              this.gameOver();
              return;
            }
          } else if (obstacle.userData.type === 'truck') {
            // Cat Catcher Truck: must slide under OR be on the roof
            const truckRoofHeight = obstacle.userData.roofHeight || 4.4;
            const isOnTruckRoof = this.cat.position.y >= truckRoofHeight - 0.5;
            if (!this.isSliding && !isOnTruckRoof) {
              this.gameOver();
              return;
            }
          } else if (obstacle.userData.type === 'tallTruck') {
            // Tall Truck: can't slide under, must be on the roof
            const truckRoofHeight = obstacle.userData.roofHeight || 3.5;
            const isOnTruckRoof = this.cat.position.y >= truckRoofHeight - 0.5;
            if (!isOnTruckRoof) {
              this.gameOver();
              return;
            }
          } else {
            // Dogs: always hit
            this.gameOver();
            return;
          }
        }
      }
    }

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const fish = this.collectibles[i];
      if (fish.position.z > -2 && fish.position.z < 2) {
        const fishBox = new THREE.Box3().setFromObject(fish);
        fishBox.expandByScalar(0.5);

        if (catBox.intersectsBox(fishBox)) {
          this.scene.remove(fish);
          this.collectibles.splice(i, 1);
          this.fishCollected++;
          this.score += 50;
        }
      }
    }

    if (this.chaserDistance <= 2) {
      this.gameOver();
    }
  }

  gameOver() {
    this.isGameOver = true;
    this.gameState = 'gameover';

    document.getElementById('score').style.display = 'none';
    const gameOverScreen = document.getElementById('game-over-screen');
    if (!gameOverScreen) {
      const overlay = document.getElementById('ui-overlay');
      const screen = document.createElement('div');
      screen.id = 'game-over-screen';
      screen.innerHTML = `
        <h1>CAUGHT!</h1>
        <div class="final-score">Score: ${Math.floor(this.score)}</div>
        <div class="fish-count">Fish: ${this.fishCollected}</div>
        <p>Tap to play again</p>
      `;
      screen.style.cssText = `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white; pointer-events: auto;`;
      screen.querySelector('h1').style.cssText = 'font-size: 48px; color: #ff6b6b; margin-bottom: 10px;';
      screen.querySelector('.final-score').style.cssText = 'font-size: 32px; margin-bottom: 10px;';
      screen.querySelector('.fish-count').style.cssText = 'font-size: 24px; margin-bottom: 20px; color: #4169E1;';
      screen.querySelector('p').style.cssText = 'font-size: 20px; opacity: 0.8;';
      overlay.appendChild(screen);
    } else {
      gameOverScreen.querySelector('.final-score').textContent = `Score: ${Math.floor(this.score)}`;
      gameOverScreen.querySelector('.fish-count').textContent = `Fish: ${this.fishCollected}`;
      gameOverScreen.style.display = 'block';
    }
  }

  resetGame() {
    this.obstacles.forEach(o => this.scene.remove(o));
    this.collectibles.forEach(c => this.scene.remove(c));
    this.obstacles = [];
    this.collectibles = [];

    this.score = 0;
    this.fishCollected = 0;
    this.gameSpeed = 15;
    this.currentLane = 1;
    this.targetLane = 1;
    this.isJumping = false;
    this.isSliding = false;
    this.jumpVelocity = 0;
    this.isOnRamp = false;
    this.rampHeight = 0;
    this.wasOnElevatedSurface = false;
    this.chaserDistance = this.chaserBaseDistance;
    this.lastObstacleZ = this.obstacleSpawnDistance;
    this.lastBlockedLanes = [];
    this.isGameOver = false;

    this.cat.position.set(this.lanes[1], 0, 0);
    this.cat.scale.y = 1;

    this.chaserDog.position.set(0, 0, this.chaserDistance);
    this.chaserDog.visible = true;
    this.dogChaseTime = 0;

    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) gameOverScreen.style.display = 'none';

    document.getElementById('score').style.display = 'block';
    this.gameState = 'playing';
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.onResize());

    // Skip intro button
    const skipButton = document.getElementById('skip-intro');
    if (skipButton) {
      skipButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.skipIntro();
      });
      skipButton.addEventListener('touchend', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.skipIntro();
      });
    }

    const interactionHandler = (e) => {
      e.preventDefault();
      if (this.gameState === 'gameover') {
        this.resetGame();
      } else if (this.gameState === 'ready') {
        this.startGame();
      }
    };

    document.addEventListener('click', interactionHandler);
    document.addEventListener('touchend', (e) => {
      if (this.gameState === 'gameover' || this.gameState === 'ready') {
        interactionHandler(e);
      } else if (this.gameState === 'playing') {
        this.handleTouchEnd(e);
      }
    }, { passive: false });

    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
  }

  handleKeyDown(e) {
    if (this.gameState === 'intro') {
      if (e.code === 'Space' || e.code === 'Enter') {
        this.skipIntro();
      }
      return;
    }
    if (this.gameState === 'gameover') {
      if (e.code === 'Enter' || e.code === 'Space') {
        this.resetGame();
      }
      return;
    }
    if (this.gameState === 'ready') {
      if (e.code === 'Enter' || e.code === 'Space') {
        this.startGame();
      }
      return;
    }
    if (this.gameState !== 'playing') return;

    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.moveLeft();
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.moveRight();
        break;
      case 'ArrowUp':
      case 'KeyW':
      case 'Space':
        e.preventDefault();
        this.jump();
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.slide();
        break;
    }
  }

  handleTouchStart(e) {
    if (this.gameState !== 'playing') return;
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  }

  handleTouchEnd(e) {
    if (this.gameState !== 'playing') return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchEndX - this.touchStartX;
    const deltaY = touchEndY - this.touchStartY;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > this.swipeThreshold) {
        if (deltaX > 0) this.moveRight();
        else this.moveLeft();
      }
    } else {
      if (Math.abs(deltaY) > this.swipeThreshold) {
        if (deltaY < 0) this.jump();
        else this.slide();
      }
    }
  }

  moveLeft() {
    if (this.targetLane > 0) this.targetLane--;
  }

  moveRight() {
    if (this.targetLane < 2) this.targetLane++;
  }

  jump() {
    // If sliding, cancel slide and jump instead
    if (this.isSliding) {
      this.cancelSlide();
      this.isJumping = true;
      this.jumpVelocity = this.jumpForce;
      return;
    }
    // Normal jump
    if (!this.isJumping) {
      this.isJumping = true;
      this.jumpVelocity = this.jumpForce;
    }
  }

  slide() {
    // If jumping, cancel jump and slide instead
    if (this.isJumping) {
      this.isJumping = false;
      this.jumpVelocity = 0;
      this.cat.position.y = this.rampHeight; // Use ramp height if on ramp, otherwise 0
      this.startSlide();
      return;
    }
    // Normal slide
    if (!this.isSliding) {
      this.startSlide();
    }
  }

  startSlide() {
    this.isSliding = true;
    this.cat.scale.y = 0.5;
    // Clear any existing slide timeout
    if (this.slideTimeout) {
      clearTimeout(this.slideTimeout);
    }
    this.slideTimeout = setTimeout(() => {
      this.isSliding = false;
      this.cat.scale.y = 1;
      this.slideTimeout = null;
    }, 500);
  }

  cancelSlide() {
    if (this.slideTimeout) {
      clearTimeout(this.slideTimeout);
      this.slideTimeout = null;
    }
    this.isSliding = false;
    this.cat.scale.y = 1;
  }

  startGame() {
    this.gameState = 'playing';
    this.score = 0;
    this.fishCollected = 0;
    this.currentLane = 1;
    this.targetLane = 1;
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('score').style.display = 'block';
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  updateGame(delta) {
    this.score += delta * 10;
    document.getElementById('score').textContent = `Score: ${Math.floor(this.score)} | Fish: ${this.fishCollected}`;

    if (this.gameSpeed < this.maxGameSpeed) {
      this.gameSpeed += this.speedIncreaseRate * delta;
    }

    this.trackSegments.forEach(segment => {
      segment.position.z += this.gameSpeed * delta;
      if (segment.position.z > this.segmentLength) {
        segment.position.z -= this.numSegments * this.segmentLength;
      }
    });

    this.buildings.forEach(buildingGroup => {
      buildingGroup.position.z += this.gameSpeed * delta;
      if (buildingGroup.position.z > this.segmentLength) {
        buildingGroup.position.z -= this.numSegments * this.segmentLength;
      }
    });

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obstacle = this.obstacles[i];
      // Cat Catcher trucks move faster towards the player, tall trucks stay still
      if (obstacle.userData.type === 'truck') {
        obstacle.position.z += (this.gameSpeed + 20) * delta;
      } else if (obstacle.userData.type === 'tallTruck') {
        // Tall truck stays stationary - only moves with normal game speed
        obstacle.position.z += this.gameSpeed * delta;
      } else {
        obstacle.position.z += this.gameSpeed * delta;
      }
      if (obstacle.position.z > 20) {
        this.scene.remove(obstacle);
        this.obstacles.splice(i, 1);
      }
    }

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const fish = this.collectibles[i];
      fish.position.z += this.gameSpeed * delta;
      fish.rotation.y += delta * 2;
      if (fish.position.z > 20) {
        this.scene.remove(fish);
        this.collectibles.splice(i, 1);
      }
    }

    this.lastObstacleZ += this.gameSpeed * delta;
    this.spawnObstacle();

    // Check collisions BEFORE updating cat position/animation
    this.checkCollisions();

    const targetX = this.lanes[this.targetLane];
    this.cat.position.x += (targetX - this.cat.position.x) * 10 * delta;

    if (this.isJumping) {
      this.cat.position.y += this.jumpVelocity * delta;
      this.jumpVelocity -= this.gravity * delta;
      // Land on ramp/roof if on one, otherwise ground
      const landingHeight = this.rampHeight;
      if (this.cat.position.y <= landingHeight) {
        this.cat.position.y = landingHeight;
        this.isJumping = false;
        this.jumpVelocity = 0;
      }
    }

    const time = this.clock.getElapsedTime();
    if (this.catLegs && !this.isJumping) {
      this.catLegs[0].rotation.x = Math.sin(time * 15) * 0.5;
      this.catLegs[1].rotation.x = -Math.sin(time * 15) * 0.5;
      this.catLegs[2].rotation.x = -Math.sin(time * 15) * 0.5;
      this.catLegs[3].rotation.x = Math.sin(time * 15) * 0.5;
    }
    if (this.catTail) {
      this.catTail.rotation.z = Math.sin(time * 8) * 0.3;
    }
    if (!this.isJumping) {
      // Check if cat walked off edge of a roof (cat is elevated but no longer on ramp)
      if (this.cat.position.y > this.rampHeight + 0.5) {
        // Start falling - use jumping physics with 0 initial velocity
        if (this.isSliding) {
          this.cancelSlide(); // Cancel slide when falling
        }
        this.isJumping = true;
        this.jumpVelocity = 0;
      } else if (!this.isSliding) {
        // Add bobbing animation on top of ramp height (if on ramp)
        const bobbing = Math.abs(Math.sin(time * 15)) * 0.1;
        this.cat.position.y = this.rampHeight + bobbing;
      }
    }

    if (this.dogLegs) {
      this.dogLegs[0].rotation.x = Math.sin(time * 12) * 0.6;
      this.dogLegs[1].rotation.x = -Math.sin(time * 12) * 0.6;
      this.dogLegs[2].rotation.x = -Math.sin(time * 12) * 0.6;
      this.dogLegs[3].rotation.x = Math.sin(time * 12) * 0.6;
    }
    if (this.dogTail) {
      this.dogTail.rotation.z = Math.sin(time * 10) * 0.4;
    }

    // Dog chases for 5 seconds, then gradually falls behind and disappears
    if (this.chaserDog.visible) {
      this.chaserDog.position.x += (this.cat.position.x - this.chaserDog.position.x) * 2 * delta;
      this.chaserDog.position.y = Math.abs(Math.sin(time * 12)) * 0.15;

      // Track how long the dog has been chasing
      this.dogChaseTime = (this.dogChaseTime || 0) + delta;

      // After 5 seconds, dog starts falling behind at 3 units per second
      if (this.dogChaseTime > 5) {
        this.chaserDistance += delta * 3;
      }

      this.chaserDog.position.z = this.chaserDistance;

      // Hide dog when it's far enough behind (out of view)
      if (this.chaserDistance > 30) {
        this.chaserDog.visible = false;
      }
    }
  }

  update(delta) {
    switch (this.gameState) {
      case 'intro':
        this.updateIntro(delta);
        break;
      case 'playing':
        this.updateGame(delta);
        break;
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
    this.update(delta);
    this.renderer.render(this.scene, this.camera);
  }
}
