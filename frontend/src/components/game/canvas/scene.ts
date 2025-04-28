'use strict';
import { Notify } from 'quasar';
import { Euler, Mesh, AmbientLight, Clock, LoadingManager, CubeTextureLoader, TextureLoader, Scene, PerspectiveCamera, WebGLRenderer, LinearEncoding, ACESFilmicToneMapping, SpriteMaterial, Sprite, Material, Texture, PlaneBufferGeometry, BoxBufferGeometry, ShadowMapType, LinearMipmapNearestFilter, BufferGeometry, Light, Object3D, SpotLight, PointLight, WebGLRenderTarget, AnimationMixer, Vector2, MeshBasicMaterial, Raycaster } from 'three';
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { quality, qualities } from './qualities';
import clientLogic from '../logic/client';

import type { mapConfig, state } from 'src/common/game/interfaces';
import type { controlsMode } from 'src/common/game/types';
import type { Material as ThreeMaterial } from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';

type onMoveCallback = ((position: number) => void) | null;
type onStateChangeCallback = ((state: state) => void) | null;

type options = {
	accessibility: boolean,
	qualityLevel: number,
	width: number,
	height: number,
	targetElem: HTMLElement,
	onReady: (() => void) | null,
	onProgress: ((itemUrl: string, itemsLoaded: number, itemsTotal: number) => void) | null,
	onError: ((message: string) => void) | null,
	onMove: onMoveCallback,
	onStateChange: onStateChangeCallback,
};

type disposable = ThreeMaterial | BufferGeometry | Texture | Light | WebGLRenderer;

const supportedDeltaModes = [0, 1, 2];

class PongScene
{
	protected config: mapConfig;
	protected options: options;
	protected dateTheta: number;
	protected state: state;
	protected disposed: boolean;
	protected clock: Clock;
	protected raycaster: Raycaster;
	protected deviceOrientationCallback: ((e: DeviceOrientationEvent) => void);
	protected scrollMovementCallback: ((e: WheelEvent) => void);
	protected keydownMouvementCallback: ((e: KeyboardEvent) => void);
	protected keyupMouvementCallback: ((e: KeyboardEvent) => void);
	protected mouseMoveMouvementCallback: ((e: MouseEvent) => void);
	protected blurCallback: (() => void);

	protected controls: {wheel: boolean, keyboard: boolean, mouse: boolean};
	protected activeControls: {wheel: boolean, keyboard: boolean, mouse: boolean};
	protected playerMoveDistance: number;
	protected ballMoveDistanceX: number;
	protected ballMoveDistanceY: number;
	protected moveDelta: number;
	protected normalizedWheelEvent: [number | null, number | null, number | null];
	protected keys: {up: boolean, down: boolean};
	protected mouse: Vector2;
	protected mouseChanged: boolean;
	protected mouseControlAdjustmentFactor: number;
	protected mouseControlAdjustmentConst: number;

	protected loadingManager: LoadingManager;
	protected gltfLoader: GLTFLoader;
	protected fontLoader: FontLoader;
	protected skyboxLoader: CubeTextureLoader;

	protected disposable: disposable[];
	protected scene: Scene;
	protected envTexture: Texture | null;
	protected useEffects: boolean;
	protected renderer: WebGLRenderer;
	protected composer: EffectComposer;
	protected renderPass: RenderPass;
	protected fxaaPass: ShaderPass;
	protected bloomPass: UnrealBloomPass;
	protected filmPass: FilmPass;
	protected mixer: AnimationMixer;
	protected camera: PerspectiveCamera;
	protected floorMirror: Reflector | null;
	protected floor: Mesh;
	protected mouseCatcher: Mesh;
	protected envLight: AmbientLight | null;
	protected ball: Mesh;
	protected dash: Mesh | null;
	protected player1: Mesh;
	protected player2: Mesh;
	protected scoreFont: Font | null;
	protected leftScore: Mesh | null;
	protected rightScore: Mesh | null;
	protected leftAvatar: Sprite | null;
	protected rightAvatar: Sprite | null;
	protected leftAvatarImage: Texture | null;
	protected rightAvatarImage: Texture | null;
	protected textFont: Font | null;
	protected text: Mesh | null;

	track (elem: disposable | disposable[]): void
	{
		if ('dispose' in elem)
			this.disposable.push(elem);
		else if (Array.isArray(elem))
		{
			for (let i = 0; i < elem.length; ++i)
				this.disposable.push(elem[i]);
		}
	}

	constructor (config: mapConfig, options: options)
	{
		this.config = config;
		this.options = Object.assign({}, {
			accessibility: false,
			qualityLevel: 1,
			targetElem: document.body,
			onReady: null,
			onProgress: undefined,
			onError: (_message: string) => // eslint-disable-line @typescript-eslint/no-unused-vars
			{
				// Hello
			},
			onMove: null,
			onStateChange: null
		}, options);
		this.dateTheta = 0;
		this.state = {
			team: -1,
			spectator: true,
			can_join: false,
			could_join: false,
			finish: false,
			date: new Date(),
			positions: [0.5, 0.5],
			scores: [0, 0],
			ball: true,
			ballX: 0.5,
			ballY: 0.5,
			ballSpeedX: 1,
			ballSpeedY: 0,
			offside: false,
			lobby: true,
			paused: true,
			frozen: true,
			text: 'Awaiting server...',
			textSize: 0.5,
			textColor: 0xff0000,
			avatars: [null, null],
			presences: [false, false],
			readyStates: [false, false]
		};
		this.raycaster = new Raycaster();

		this.deviceOrientationCallback =
			(e) =>
			{
				e.preventDefault();

				if (e.gamma)
					this._setPosition(((-e.gamma || 0) + 20) / 40);
			};
		this.scrollMovementCallback =
			(e) =>
			{
				e.preventDefault();
				if (!this.controls.wheel || !this.activeControls.wheel)
					return;

				let normalizedDelta;
				if (supportedDeltaModes.includes(e.deltaMode))
				{
					if (this.normalizedWheelEvent[e.deltaMode] === null || (this.normalizedWheelEvent[e.deltaMode] as number) > Math.abs(e.deltaY))
						this.normalizedWheelEvent[e.deltaMode] = Math.max(Math.abs(e.deltaY), 1);
					normalizedDelta = this.normalizedWheelEvent[e.deltaMode] as number;
				}
				else
					normalizedDelta = 1 / 20;

				this._addPosition(this.moveDelta * (e.deltaY / normalizedDelta));
			};
		this.keydownMouvementCallback =
			(e: KeyboardEvent) =>
			{
				switch (e.code)
				{
				case 'ArrowUp':
				case 'KeyW':
					this.keys.up = true;
					break;
				case 'ArrowDown':
				case 'KeyS':
					this.keys.down = true;
					break;
				default:
					return;
				}
				e.preventDefault();
			};
		this.keyupMouvementCallback =
			(e: KeyboardEvent) =>
			{
				switch (e.code)
				{
				case 'ArrowUp':
				case 'KeyW':
					this.keys.up = false;
					break;
				case 'ArrowDown':
				case 'KeyS':
					this.keys.down = false;
					break;
				default:
					return;
				}
				e.preventDefault();
			};
		this.mouseMoveMouvementCallback =
			(e: MouseEvent) =>
			{
				e.preventDefault();
				if (this.state.frozen)
					return;

				this.mouse.x = (e.offsetX / this.renderer.domElement.clientWidth) * 2 - 1;
				this.mouse.y = -(e.offsetY / this.renderer.domElement.clientHeight) * 2 + 1;
				this.mouseChanged = true;
			};
		this.blurCallback =
			() =>
			{
				this.keys.up = false;
				this.keys.down = false;
			};
		this.envTexture = null;
		this.floorMirror = null;
		this.envLight = null;
		this.leftAvatarImage = null;
		this.rightAvatarImage = null;
		this.text = null;

		const {
			controls,
			cameraClip, sceneFile,
			gameScale, pauseCameraPosition, pauseCameraRotation,
			ballMaterial, baseSize,
			dash, dashHeight, dashMaterial,
			floorMaterial,
			playerSize, player1Material, player2Material, moveSteps,
			scoreFont, textFont,
			lightDecayFactor, lightIntensityFactor
		} = this.config;
		const {
			width, height,
			targetElem,
			onReady, onProgress, onError
		} = this.options;

		this.disposable = [];
		this.clock = new Clock();
		this.disposed = false;

		this.controls = {
			wheel: controls.includes('wheel'),
			keyboard: controls.includes('keyboard'),
			mouse: controls.includes('mouse')
		};
		this.activeControls = this.controls;
		this.playerMoveDistance = (baseSize[1] - playerSize[1]) * gameScale;
		this.ballMoveDistanceX = (baseSize[0] - 3) * gameScale;
		this.ballMoveDistanceY = (baseSize[1] - 1) * gameScale;
		this.moveDelta = 1 / moveSteps;
		this.normalizedWheelEvent = [
			null,
			null,
			null
		];
		this.keys = {
			up: false,
			down: false
		};
		this.mouse = new Vector2();
		this.mouseChanged = false;
		this.mouseControlAdjustmentFactor = baseSize[1] / (baseSize[1] - playerSize[1]);
		this.mouseControlAdjustmentConst = -(playerSize[1] * 0.5) / baseSize[1];

		this.loadingManager = new LoadingManager();
		this.gltfLoader = new GLTFLoader(this.loadingManager);
		this.fontLoader = new FontLoader(this.loadingManager);
		this.skyboxLoader = new CubeTextureLoader(this.loadingManager);

		this.scene = new Scene();

		this.camera = new PerspectiveCamera(
			60,
			width / height,
			cameraClip[0],
			cameraClip[1]
		);

		this.camera.position.copy(pauseCameraPosition).multiplyScalar(gameScale);
		this.camera.rotation.copy(pauseCameraRotation);

		this.renderer = new WebGLRenderer({
			antialias: false,
			powerPreference: 'high-performance',
			canvas: targetElem
		});
		this.renderer.physicallyCorrectLights = true;
		this.renderer.outputEncoding = LinearEncoding;
		this.renderer.toneMapping = ACESFilmicToneMapping;

		this.useEffects = false;
		this.composer = new EffectComposer(this.renderer);

		this.renderPass = new RenderPass(this.scene, this.camera);
		this.fxaaPass = new ShaderPass(FXAAShader);
		this.bloomPass = new UnrealBloomPass(new Vector2(1, 1), 0.4, 0.5, 0.1);
		this.filmPass = new FilmPass(0.1, 0.25, 648, 0);

		this.mixer = new AnimationMixer(this.scene);

		const ballGeometry = new BoxBufferGeometry(gameScale, gameScale, gameScale);
		this.track(ballGeometry);
		this.ball = new Mesh(ballGeometry, ballMaterial);
		this.ball.receiveShadow = true;
		this.ball.castShadow = true;
		if ('transparent' in this.ball.material)
			this.ball.material.transparent = true;
		this.scene.add(this.ball);

		if (dash)
		{
			const dashNumber = dash;
			const dashLength = gameScale * baseSize[1] / dashNumber / 2;
			const spaceLength = gameScale * baseSize[1] / (dashNumber - 1) / 2;
			const dashHeightVal = typeof dashHeight !== 'undefined' ? dashHeight * gameScale : dashLength / 2;
			const singleDashGeomerty = new BoxBufferGeometry(dashLength / 2, dashHeightVal, dashLength);
			const dashParts: BufferGeometry[] = [];
			for (let i = 0; i < dashNumber; i++)
			{
				const partGeometry = singleDashGeomerty.clone();
				partGeometry.translate(0, 0, -baseSize[1] / 2 * gameScale + (dashLength + spaceLength) * i + dashLength / 2);
				dashParts.push(partGeometry);
			}
			const dashGeomerty = mergeBufferGeometries(dashParts);
			this.track(dashGeomerty);
			singleDashGeomerty.dispose();
			dashParts.forEach((geometry) =>
			{
				geometry.dispose();
			});
			this.dash = new Mesh(dashGeomerty, dashMaterial);
			this.dash.receiveShadow = true;
			this.dash.castShadow = true;
			this.scene.add(this.dash);
		}
		else
			this.dash = null;

		const floorGeometry = new BoxBufferGeometry(
			baseSize[0] * gameScale,
			baseSize[1] * gameScale,
			gameScale
		);
		this.track(floorGeometry);

		this.floor = new Mesh(floorGeometry, floorMaterial);
		(this.floor.material as Material).dithering = true;
		this.floor.receiveShadow = true;
		this.floor.castShadow = true;
		this.floor.rotation.x = -Math.PI / 2;
		this.floor.position.y = -gameScale + 0.005;
		this.floor.renderOrder = 3;
		this.floor.matrixAutoUpdate = false;
		this.floor.updateMatrix();
		this.scene.add(this.floor);

		const mouseCatcherGeomerty = new PlaneBufferGeometry(
			baseSize[0] * gameScale * 3,
			baseSize[1] * gameScale
		);
		this.track(mouseCatcherGeomerty);

		this.mouseCatcher = new Mesh(mouseCatcherGeomerty, new MeshBasicMaterial({ color: 0xff0000 }));
		this.mouseCatcher.rotation.x = -Math.PI / 2;
		this.mouseCatcher.position.y = -gameScale + 0.01 + gameScale / 2;
		this.mouseCatcher.renderOrder = 4;
		this.mouseCatcher.visible = false;
		this.mouseCatcher.matrixAutoUpdate = false;
		this.mouseCatcher.updateMatrix();
		this.scene.add(this.mouseCatcher);

		const playersGeometry = new BoxBufferGeometry(playerSize[0] * gameScale, gameScale, playerSize[1] * gameScale);
		this.track(playersGeometry);
		const playerPosX = (baseSize[0] - playerSize[0]) / 2;

		this.player1 = new Mesh(playersGeometry, player1Material);
		this.player1.position.x = -playerPosX * gameScale;
		this.player1.receiveShadow = true;
		this.player1.castShadow = true;
		this.scene.add(this.player1);

		this.player2 = new Mesh(playersGeometry, player2Material);
		this.player2.position.x = playerPosX * gameScale;
		this.player2.receiveShadow = true;
		this.player2.castShadow = true;
		this.scene.add(this.player2);

		if (sceneFile)
		{
			this.gltfLoader.load(
				sceneFile,
				(gltf: GLTF) =>
				{
					gltf.scene.traverse((node: Object3D) =>
					{
						if ('isLight' in node)
						{
							const light = node as Light;

							light.castShadow = true;
							light.receiveShadow = true;
							if ('decay' in light)
								(light as (PointLight | SpotLight)).decay *= lightDecayFactor;
							light.intensity *= lightIntensityFactor;
						}
						if ('isMesh' in node)
						{
							const mesh = node as Mesh;

							mesh.castShadow = true;
							mesh.receiveShadow = true;
							this.track(mesh.geometry);
							this.track(mesh.material);
						}
						node.matrixAutoUpdate = false;
						node.updateMatrix();
						if ('dispose' in node)
							this.track(node as disposable);
					});
					this.scene.add(gltf.scene);
					gltf.animations.forEach(
						(clip) =>
						{
							this.mixer.clipAction(clip).play();
						}
					);
					this._refreshAnimation();
					this._refreshQuality();
				}
			);
		}

		this.scoreFont = null;
		this.rightScore = null;
		this.leftScore = null;
		this.leftAvatar = null;
		this.rightAvatar = null;

		this.fontLoader.load(
			scoreFont,
			(font: Font) =>
			{
				this.scoreFont = font;
				this._refreshScore();
			}
		);

		this.textFont = null;

		this.fontLoader.load(
			textFont,
			(font: Font) =>
			{
				this.textFont = font;
				this._refreshText();
			}
		);

		this._refreshQuality();
		this._refreshSize();
		this._refreshAvatar();

		this.loadingManager.onLoad =
			() =>
			{
				if (onReady)
				{
					this.render();
					this.setAnimationLoop(this.render.bind(this));
					onReady();
				}
			};

		if (onProgress)
			this.loadingManager.onProgress = onProgress;
		if (onError)
		{
			this.loadingManager.onError = (ressourceUrl: string) =>
			{
				onError('Can\'t fetch ' + ressourceUrl + '. Please verify your network and refresh.');
			};
		}

		window.addEventListener('keydown', this.keydownMouvementCallback);
		window.addEventListener('keyup', this.keyupMouvementCallback);
		this.renderer.domElement.addEventListener('mousemove', this.mouseMoveMouvementCallback);
		window.addEventListener('blur', this.blurCallback);
	}

	_getFontGeometry (font: Font, text: string, sizeRatio = 1, fontHeight: number)
	{
		const { gameScale } = this.config;

		const textGeometry =
			new TextGeometry(
				text,
				{
					font,
					size: 8 * gameScale * sizeRatio,
					height: fontHeight * gameScale * sizeRatio,
					curveSegments: 2,
					bevelEnabled: false
				}
			);

		textGeometry.computeBoundingBox();
		textGeometry.center();

		return (textGeometry);
	}

	_basicRotationLerp (euler1: Euler, euler2: Euler, ratio: number): Euler
	{
		return (
			euler1.set(
				euler1.x * (1 - ratio) + euler2.x * ratio,
				euler1.y * (1 - ratio) + euler2.y * ratio,
				euler1.z * (1 - ratio) + euler2.z * ratio
			)
		);
	}

	_refreshEnv (canUseSkyboxAsEnvironment: boolean)
	{
		const {
			skyboxAsEnvironment
		} = this.config;

		this.scene.background = this.envTexture;
		if (skyboxAsEnvironment && canUseSkyboxAsEnvironment)
			this.scene.environment = this.envTexture;
		else
			this.scene.environment = null;
	}

	_refreshFloorReflection ()
	{
		const {
			gameScale, baseSize,
			floorReflectivity, floorReflectorColor
		} = this.config;
		const {
			qualityLevel,
			width, height
		} = this.options;
		const {
			reflection, reflectionQuality, reflectionMultisample
		} = qualities[qualityLevel] as quality;

		if (this.floorMirror)
		{
			this.scene.remove(this.floorMirror);
			this.floorMirror.geometry.dispose();
			this.floorMirror.dispose();
		}
		if (reflection && floorReflectivity > 0.001)
		{
			const floorMirrorGeometry = new PlaneBufferGeometry(
				baseSize[0] * gameScale,
				baseSize[1] * gameScale
			);
			this.floorMirror = new Reflector(floorMirrorGeometry, {
				clipBias: 0.003,
				textureWidth: width * (reflectionQuality || 1),
				textureHeight: height * (reflectionQuality || 1),
				color: floorReflectorColor,
				multisample: reflectionMultisample
			});
			this.floorMirror.rotation.x = -Math.PI / 2;
			this.floorMirror.position.y = -gameScale / 2;
			this.floorMirror.matrixAutoUpdate = false;
			this.floorMirror.updateMatrix();
			this.scene.add(this.floorMirror);

			(this.floor.material as Material).transparent = true;
			(this.floor.material as Material).opacity = (1 - floorReflectivity);
		}
		else
		{
			(this.floor.material as Material).transparent = false;
			(this.floor.material as Material).opacity = 1;
		}
	}

	onSkyboxLoaded (texture: Texture)
	{
		const {
			qualityLevel
		} = this.options;
		const {
			canUseSkyboxAsEnvironment
		} = qualities[qualityLevel] as quality;

		this.envTexture = texture;
		this.track(texture);
		this._refreshEnv(canUseSkyboxAsEnvironment);
	}

	_addEffect (effectName: string)
	{
		switch (effectName)
		{
		case 'bloom':
			this.composer.addPass(this.bloomPass);
			break;

		case 'film':
			this.composer.addPass(this.filmPass);
			break;

		default:
			break;
		}
	}

	_refreshEffect ()
	{
		const {
			effects
		} = this.config;
		const {
			qualityLevel
		} = this.options;
		const {
			allowedEffects,
			critical
		} = qualities[qualityLevel] as quality;

		this.useEffects = !critical;
		this.composer.passes = [];
		this.composer.addPass(this.renderPass);
		this.composer.addPass(this.fxaaPass);

		if (critical || !allowedEffects || this.options.accessibility)
			return;
		effects.forEach(
			(effectName: string) =>
			{
				if (allowedEffects.indexOf(effectName) !== -1)
					this._addEffect(effectName);
			}
		);
	}

	_refreshAnimation ()
	{
		this.mixer.setTime(((new Date()).getTime() + this.dateTheta) / 1000);
	}

	_refreshQuality ()
	{
		const {
			sceneFile, additionnalLight,
			skybox, skyboxAsEnvironment, EnvironmentColor,
			hasShadow
		} = this.config;
		const {
			qualityLevel
		} = this.options;
		const {
			critical,
			pixelRatio,
			useShadowmap, shadowmap, shadowmapSize,
			reflection,
			canUseSkyboxAsEnvironment
		} = qualities[qualityLevel] as quality;

		if (pixelRatio === 'device')
			this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		else
			this.renderer.setPixelRatio(pixelRatio || 1);

		if (useShadowmap && hasShadow)
		{
			this.renderer.shadowMap.enabled = true;
			this.renderer.shadowMap.type = (shadowmap as ShadowMapType);
		}
		else

			this.renderer.shadowMap.enabled = false;

		this._refreshFloorReflection();

		if ((reflection || !sceneFile) && skybox)
		{
			if (this.envTexture)
				this._refreshEnv(canUseSkyboxAsEnvironment);
			else
				this.skyboxLoader.load(skybox, this.onSkyboxLoaded.bind(this));
		}
		else
		{
			this.scene.background = null;
			this.scene.environment = null;
		}

		if (this.envLight)
		{
			this.scene.remove(this.envLight);
			this.envLight.dispose();
			this.envLight = null;
		}
		if (!skybox || !(skyboxAsEnvironment && canUseSkyboxAsEnvironment))
		{
			this.envLight = new AmbientLight(EnvironmentColor, 2.0);
			this.envLight.matrixAutoUpdate = false;
			this.envLight.updateMatrix();
			this.scene.add(this.envLight);
		}

		this.scene.traverse(
			function (node: Object3D)
			{
				if ('isLight' in node)
				{
					const light = node as Light;
					if ('shadow' in node)
					{
						light.shadow.mapSize.width =
							light.shadow.mapSize.height =
								(shadowmapSize || 256);
						if (light.shadow.map)
						{
							light.shadow.map.dispose();
							light.shadow.map = null as unknown as WebGLRenderTarget;
						}
					}
					if (critical && additionnalLight)
					{
						if (additionnalLight.includes(light.name))
							light.visible = false;
					}
					else
						light.visible = true;
				}
			}
		);

		this._refreshEffect();
	}

	_refreshSize ()
	{
		const {
			width, height
		} = this.options;
		const {
			fov,
			forceRotationRatio
		} = this.config;

		this.renderer.setSize(width, height);
		this.composer.setSize(width, height);
		this.camera.aspect = width / height;

		if (width * 0.5625 < height)
			this.camera.fov = Math.atan(Math.tan(fov * Math.PI / 360) / this.camera.aspect / 0.5625) * 360 / Math.PI;
		else
			this.camera.fov = fov;

		if (this.camera.aspect < forceRotationRatio)
		{
			Notify.create({
				type: 'info',
				icon: 'screen_rotation',
				position: 'top',
				message: 'Please rotate your screen for better experience'
			});
		}

		this.camera.updateProjectionMatrix();
		this._refreshFloorReflection();

		const pixelRatio = this.renderer.getPixelRatio();

		this.fxaaPass.material.uniforms.resolution.value.x = 1 / (width * pixelRatio);
		this.fxaaPass.material.uniforms.resolution.value.y = 1 / (height * pixelRatio);
	}

	_setPosition (ratio: number)
	{
		const { positions, team } = this.state;
		const previousRatio = positions[team];

		if (typeof previousRatio === 'undefined' || isNaN(previousRatio))
			return;

		let position = Math.round(ratio * 1000);

		if (position !== Math.round(previousRatio * 1000))
		{
			if (position > 1000)
				position = 1000;
			else if (position < 0)
				position = 0;
			positions[team] = position / 1000;

			if (this.options.onMove)
				this.options.onMove(position);
		}
	}

	_addPosition (delta: number)
	{
		const { positions, team } = this.state;

		this._setPosition(positions[team] + delta);
	}

	_unfreeze ()
	{
		const { frozen } = this.state;

		if (!frozen)
			return;

		if ('ontouchstart' in window)
			window.addEventListener('deviceorientation', this.deviceOrientationCallback);
		else
			this.renderer.domElement.addEventListener('wheel', this.scrollMovementCallback);
	}

	_freeze ()
	{
		const { frozen } = this.state;

		if (frozen)
			return;

		if ('ontouchstart' in window)
			window.removeEventListener('deviceorientation', this.deviceOrientationCallback);
		else
			this.renderer.domElement.removeEventListener('wheel', this.scrollMovementCallback);
	}

	_refreshScore ()
	{
		const { scores } = this.state;
		const { gameScale, scoreMaterial, scoreFontHeight, scorePositions, scoreRotations } = this.config;

		if (!this.scoreFont)
			return;

		if (this.leftScore)
		{
			this.scene.remove(this.leftScore);
			this.leftScore.geometry.dispose();
		}

		const leftScoreGeometry = this._getFontGeometry(this.scoreFont, scores[0] + '', undefined, scoreFontHeight);
		this.leftScore = new Mesh(leftScoreGeometry, scoreMaterial);
		this.leftScore.receiveShadow = true;
		this.leftScore.castShadow = true;
		this.leftScore.position.copy(scorePositions[0]).multiplyScalar(gameScale);
		this.leftScore.rotation.copy(scoreRotations[0]);
		this.leftScore.matrixAutoUpdate = false;
		this.leftScore.updateMatrix();
		this.scene.add(this.leftScore);

		if (this.rightScore)
		{
			this.scene.remove(this.rightScore);
			this.rightScore.geometry.dispose();
		}

		const rightScoreGeometry = this._getFontGeometry(this.scoreFont, scores[1] + '', undefined, scoreFontHeight);
		this.rightScore = new Mesh(rightScoreGeometry, scoreMaterial);
		this.rightScore.receiveShadow = true;
		this.rightScore.castShadow = true;
		this.rightScore.position.copy(scorePositions[1]).multiplyScalar(gameScale);
		this.rightScore.rotation.copy(scoreRotations[1]);
		this.rightScore.matrixAutoUpdate = false;
		this.rightScore.updateMatrix();
		this.scene.add(this.rightScore);
	}

	_refreshAvatar ()
	{
		const { avatars } = this.state;
		const { gameScale, avatarPositions, avatarScale } = this.config;

		if (this.leftAvatar)
		{
			this.scene.remove(this.leftAvatar);
			(this.leftAvatarImage as Texture).dispose();
			this.leftAvatar.geometry.dispose();
			this.leftAvatar.material.dispose();
			this.leftAvatar = null;
		}

		if (avatars[0])
		{
			this.leftAvatarImage = new TextureLoader().load(avatars[0]);
			this.leftAvatarImage.minFilter = this.leftAvatarImage.magFilter = LinearMipmapNearestFilter;
			const leftAvatarMaterial = new SpriteMaterial({ map: this.leftAvatarImage, sizeAttenuation: false });
			leftAvatarMaterial.precision = 'highp';
			leftAvatarMaterial.toneMapped = false;
			this.leftAvatar = new Sprite(leftAvatarMaterial);
			this.leftAvatar.scale.set(avatarScale * gameScale, avatarScale * gameScale, 1);
			this.leftAvatar.position.copy(avatarPositions[0]).multiplyScalar(gameScale);
			this.leftAvatar.matrixAutoUpdate = false;
			this.leftAvatar.updateMatrix();
			this.scene.add(this.leftAvatar);
		}

		if (this.rightAvatar)
		{
			this.scene.remove(this.rightAvatar);
			(this.rightAvatarImage as Texture).dispose();
			this.rightAvatar.geometry.dispose();
			this.rightAvatar.material.dispose();
			this.rightAvatar = null;
		}

		if (avatars[1])
		{
			this.rightAvatarImage = new TextureLoader().load(avatars[1]);
			this.rightAvatarImage.minFilter = this.rightAvatarImage.magFilter = LinearMipmapNearestFilter;
			const rightAvatarMaterial = new SpriteMaterial({ map: this.rightAvatarImage, sizeAttenuation: false });
			rightAvatarMaterial.precision = 'highp';
			rightAvatarMaterial.toneMapped = false;
			this.rightAvatar = new Sprite(rightAvatarMaterial);
			this.rightAvatar.scale.set(avatarScale * gameScale, avatarScale * gameScale, 1);
			this.rightAvatar.position.copy(avatarPositions[1]).multiplyScalar(gameScale);
			this.rightAvatar.matrixAutoUpdate = false;
			this.rightAvatar.updateMatrix();
			this.scene.add(this.rightAvatar);
		}

		this._refreshPresences();
		this._refreshReadyStates();
	}

	_refreshPresences ()
	{
		const { presences } = this.state;

		if (this.leftAvatar)
			this.leftAvatar.material.opacity = presences[0] ? 1 : 0.65;
		if (this.rightAvatar)
			this.rightAvatar.material.opacity = presences[1] ? 1 : 0.65;
	}

	_refreshReadyStates ()
	{
		const { readyStates } = this.state;

		if (this.leftAvatar)
			this.leftAvatar.material.color.set(readyStates[0] ? 0x7fff7f : 0xffffff);
		if (this.rightAvatar)
			this.rightAvatar.material.color.set(readyStates[1] ? 0x7fff7f : 0xffffff);
	}

	_refreshText ()
	{
		const { text, textSize, textColor, paused } = this.state;
		const { gameScale, textMaterial, textFontHeight, textPausePosition, textPlayPosition, textPauseRotation, textPlayRotation } = this.config;
		let oldPos, oldRot;

		if (!this.textFont)
			return;

		if (this.text)
		{
			oldPos = this.text.position.clone();
			oldRot = this.text.rotation.clone();
			this.scene.remove(this.text);
			this.text.geometry.dispose();
		}
		else
		{
			oldPos = (paused ? textPausePosition : textPlayPosition).clone().multiplyScalar(gameScale);
			oldRot = paused ? textPauseRotation : textPlayRotation;
		}

		textMaterial.color.set(textColor);
		if ('emissive' in textMaterial)
			textMaterial.emissive.set(textColor);
		const textGeometry = this._getFontGeometry(this.textFont, text, textSize, textFontHeight);
		this.text = new Mesh(textGeometry, textMaterial);
		this.text.receiveShadow = true;
		this.text.castShadow = true;
		this.text.position.copy(oldPos);
		this.text.rotation.copy(oldRot);
		this.scene.add(this.text);
	}

	render ()
	{
		if (this.disposed)
			return;

		const {
			positions, ballX, ballY, lobby, ball,
			offside, ballSpeedX, ballSpeedY
		} = this.state;
		const {
			transitionSpeed, gameScale,
			pauseCameraPosition, pauseCameraRotation, playCameraPosition, playCameraRotation,
			textPausePosition, textPauseRotation, textPlayPosition, textPlayRotation,
			offsideOpacityMultiplier
		} = this.config;

		const delta = this.clock.getDelta();
		const lerpValue = Math.min(1, delta * transitionSpeed);

		if (lobby)
		{
			this.camera.position.lerp(pauseCameraPosition.clone().multiplyScalar(gameScale), lerpValue);
			this._basicRotationLerp(this.camera.rotation, pauseCameraRotation, lerpValue);

			if (this.text)
			{
				this.text.position.lerp(textPausePosition.clone().multiplyScalar(gameScale), lerpValue);
				this._basicRotationLerp(this.text.rotation, textPauseRotation, lerpValue);
			}
		}
		else
		{
			this.camera.position.lerp(playCameraPosition.clone().multiplyScalar(gameScale), lerpValue);
			this._basicRotationLerp(this.camera.rotation, playCameraRotation, lerpValue);

			if (this.text)
			{
				this.text.position.lerp(textPlayPosition.clone().multiplyScalar(gameScale), lerpValue);
				this._basicRotationLerp(this.text.rotation, textPlayRotation, lerpValue);
			}
		}

		if (!this.state.frozen)
		{
			if (this.controls.keyboard && this.activeControls.keyboard && (this.keys.up || this.keys.down) && !(this.keys.up && this.keys.down))
			{
				const sign = (this.keys.up ? -1 : 0) + (this.keys.down ? 1 : 0);
				this._addPosition(sign * 1.4 * delta);
			}

			if (this.controls.mouse && this.activeControls.mouse && this.mouseChanged)
			{
				this.raycaster.setFromCamera(this.mouse, this.camera);
				const intersects = this.raycaster.intersectObject(this.mouseCatcher);

				if (intersects.length >= 1 && intersects[0].uv?.y)
				{
					const y = intersects[0].uv?.y;
					this._setPosition((1 - y) * this.mouseControlAdjustmentFactor + this.mouseControlAdjustmentConst);
				}
				this.mouseChanged = false;
			}
		}

		clientLogic(this.state, this.config, delta);

		this.player1.position.z = (positions[0] - 0.5) * this.playerMoveDistance;
		this.player2.position.z = (positions[1] - 0.5) * this.playerMoveDistance;
		this.ball.position.x = (ballX - 0.5) * this.ballMoveDistanceX;
		this.ball.position.z = (ballY - 0.5) * this.ballMoveDistanceY;

		if (offside)
		{
			if (!ballSpeedX && !ballSpeedY)
				this.ball.visible = false;
			else
				this.ball.visible = ball;
		}
		else
			this.ball.visible = ball;
		if ('opacity' in this.ball.material)
		{
			this.ball.material.opacity = Math.min(1 + this.state.ballX * offsideOpacityMultiplier, (1 - this.state.ballX) * offsideOpacityMultiplier + 1);
			this.ball.castShadow = this.ball.material.opacity > 0.99;
		}

		if (!this.options.accessibility)
			this.mixer.update(delta);

		if (this.useEffects)
			this.composer.render();
		else
			this.renderer.render(this.scene, this.camera);
	}

	setAnimationLoop (animate: (() => void) | null)
	{
		this.renderer.setAnimationLoop(animate);
	}

	setState (state: Partial<state>, latency: number)
	{
		const oldState = Object.assign({}, this.state);
		const newState = Object.assign({}, this.state, state);

		if (oldState.frozen !== newState.frozen)
		{
			if (newState.frozen)
				this._freeze();
			else
				this._unfreeze();
		}
		else if (!newState.frozen && !newState.lobby &&
			typeof state.positions !== 'undefined' && typeof oldState.positions !== 'undefined' &&
			!isNaN(oldState.positions[oldState.team]))
			state.positions[newState.team] = oldState.positions[oldState.team];

		this.state = Object.assign(this.state, state);

		if (newState.scores[0] !== oldState.scores[0] || newState.scores[1] !== oldState.scores[1])
			this._refreshScore();

		if (newState.text !== oldState.text || newState.textSize !== oldState.textSize || newState.textColor !== oldState.textColor)
			this._refreshText();

		if (newState.avatars[0] !== oldState.avatars[0] || newState.avatars[1] !== oldState.avatars[1])
			this._refreshAvatar();
		if (newState.presences[0] !== oldState.presences[0] || newState.presences[1] !== oldState.presences[1])
			this._refreshPresences();
		if (newState.readyStates[0] !== oldState.readyStates[0] || newState.readyStates[1] !== oldState.readyStates[1])
			this._refreshReadyStates();

		if (latency)
		{
			this.clock.getDelta();
			clientLogic(this.state, this.config, latency / 1000);
		}

		if (this.options.onStateChange)
			this.options.onStateChange(newState);
	}

	setDateTheta (theta: number)
	{
		this.dateTheta = theta;
		this._refreshAnimation();
	}

	setSize (width: number, height: number)
	{
		this.options.width = width;
		this.options.height = height;
		this._refreshSize();
	}

	setAccessibility (accessibility: boolean)
	{
		this.options.accessibility = accessibility;
		this._refreshQuality();
		if (accessibility)
			this.mixer.setTime(0);
		else
			this._refreshAnimation();
		this.mixer.update(0);
	}

	setQuality (quality: number)
	{
		quality = Math.min(quality, qualities.length - 1);
		quality = Math.max(quality, 0);

		this.options.qualityLevel = quality;
		this._refreshQuality();
	}

	setControl (control: controlsMode, enable: boolean)
	{
		if (control in this.activeControls)
			this.activeControls[control] = enable;
	}

	setOnMove (callback: onMoveCallback)
	{
		this.options.onMove = callback;
	}

	setOnStateChange (callback: onStateChangeCallback)
	{
		this.options.onStateChange = callback;
	}

	dispose ()
	{
		this.disposed = true;
		this._freeze();

		window.removeEventListener('keydown', this.keydownMouvementCallback);
		window.removeEventListener('keyup', this.keyupMouvementCallback);
		window.removeEventListener('mousemove', this.mouseMoveMouvementCallback);
		window.removeEventListener('blur', this.blurCallback);

		if (this.floorMirror)
		{
			this.track(this.floorMirror.geometry);
			this.track(this.floorMirror.material);
		}
		if (this.leftScore)

			this.track(this.leftScore.geometry);

		if (this.rightScore)

			this.track(this.rightScore.geometry);

		if (this.envLight)
			this.track(this.envLight);
		if (this.leftAvatarImage)
			this.track(this.leftAvatarImage);
		if (this.leftAvatar)
		{
			this.track(this.leftAvatar.geometry);
			this.track(this.leftAvatar.material);
		}
		if (this.rightAvatarImage)
			this.track(this.rightAvatarImage);
		if (this.rightAvatar)
		{
			this.track(this.rightAvatar.geometry);
			this.track(this.rightAvatar.material);
		}
		if (this.text)
			this.track(this.text.geometry);

		this.track(this.renderer);

		for (let i = 0; i < this.disposable.length - 1; ++i)
		{
			if ('dispose' in this.disposable[i])
				this.disposable[i].dispose();
		}
		this.disposable = [];
		this.renderer.renderLists.dispose();
	}
}

export type { mapConfig, options };
export default PongScene;
