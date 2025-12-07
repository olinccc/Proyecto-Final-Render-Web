import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
console.log(GLTFLoader)

/**
 * Base
 */
// Debug
const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Raycaster para detectar clicks en objetos 3D
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let clickableObject = null

/**
 * Plane with Texture
 */
const textureLoader = new THREE.TextureLoader()
const webbenTexture = textureLoader.load('/webben.png', (texture) => {
    // Cuando la textura cargue, ajustar el tamaño del plano según sus proporciones
    const img = texture.image
    const aspectRatio = img.width / img.height
    
    // Definir una altura base y calcular el ancho proporcionalmente
    const planeHeight = 3
    const planeWidth = planeHeight * aspectRatio
    
    // Actualizar la geometría del plano
    plane.geometry.dispose()
    plane.geometry = new THREE.PlaneGeometry(planeWidth, planeHeight)
})

const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 3), // Tamaño temporal hasta que cargue la textura
    new THREE.MeshStandardMaterial({
        map: webbenTexture,
        side: THREE.DoubleSide,
        transparent: true // Por si la imagen tiene transparencia
    })
)
plane.position.set(0, 3, 0)
scene.add(plane)

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 2.4)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 15
directionalLight.shadow.camera.left = - 7
directionalLight.shadow.camera.top = 7
directionalLight.shadow.camera.right = 7
directionalLight.shadow.camera.bottom = - 7
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(2, 2, 2)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.target.set(0, 0.75, 0)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
// Make renderer clear to black that matches the page background
renderer.setClearColor('#000000')
renderer.setClearAlpha(1)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

let mixer = null;
const gltfLoader = new GLTFLoader();
gltfLoader.load(
    '/models/tv/scene.gltf',
    function (gltf)  {
       console.log('Modelo cargado:', gltf);
       
       // Posicionar y escalar el modelo
       gltf.scene.scale.set(4, 4, 4);
       gltf.scene.position.set(0, 0, 0);
       
       // Habilitar sombras en todos los meshes
       gltf.scene.traverse((child) => {
           if (child.isMesh) {
               child.castShadow = true;
               child.receiveShadow = true;
           }
       });
       
       scene.add(gltf.scene);

       // Animation
       if (gltf.animations && gltf.animations.length > 0) {
           mixer = new THREE.AnimationMixer(gltf.scene);
           const action = mixer.clipAction(gltf.animations[0]);
           action.play();
       }
       
       // Guardar el modelo como objeto clickeable
       clickableObject = gltf.scene;
    },
    function (progress) {
       console.log('Progreso:', (progress.loaded / progress.total * 100) + '%');
    },
    function (error) {
       console.error('Error cargando el modelo:', error);
    }
);

/**
 * Animate
 */
const clock = new THREE.Clock()
let previousTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

     // Model animation
    if(mixer) {
       mixer.update(deltaTime)
    }

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

// Event listener para detectar clicks en el objeto 3D
canvas.addEventListener('click', (event) => {
    // Calcular la posición normalizada del mouse
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
    
    // Lanzar el rayo desde la cámara
    raycaster.setFromCamera(mouse, camera)
    
    // Verificar intersecciones con el objeto
    if (clickableObject) {
        const intersects = raycaster.intersectObject(clickableObject, true)
        
        if (intersects.length > 0) {
            console.log('¡Clickeaste el objeto!')
            // Navegar a la segunda página
            window.location.href = 'page2.html'
        }
    }
})

tick()