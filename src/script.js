import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

console.log(GLTFLoader)

const canvas = document.querySelector('canvas.webgl')

const scene = new THREE.Scene()

const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let clickableObject = null

/**
 * ===== PLANO CON TEXTURA (webben.png) =====
 * Plano que flota arriba del TV (y: 2) con tamaño adaptativo según proporción de la imagen
 */
const textureLoader = new THREE.TextureLoader()
const webbenTexture = textureLoader.load('/webben.png', (texture) => {
    // Callback: Cuando la textura cargue, ajustar el tamaño del plano según sus proporciones
    const img = texture.image
    const aspectRatio = img.width / img.height
    
    // Definir una altura base y calcular el ancho proporcionalmente
    const planeHeight = 3
    const planeWidth = planeHeight * aspectRatio
    
    // Actualizar la geometría del plano con las dimensiones correctas
    plane.geometry.dispose()
    plane.geometry = new THREE.PlaneGeometry(planeWidth, planeHeight)
})

// Crear el mesh del plano
const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 3), // Tamaño temporal hasta que cargue la textura
    new THREE.MeshStandardMaterial({
        map: webbenTexture,
        side: THREE.DoubleSide, // Visible desde ambos lados
        transparent: true // Soportar transparencia PNG
    })
)
plane.position.set(0, 2, 0) // Posición arriba del TV
scene.add(plane)

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

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
});

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(0, 0.5, 5)
scene.add(camera)

const controls = new OrbitControls(camera, canvas)
controls.target.set(0, 0, 0) 
controls.enableDamping = true 

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true
})

renderer.setClearColor('#000000', 0) 
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
       
       gltf.scene.scale.set(4, 4, 4); 
       gltf.scene.position.set(0, 0, 0); 
       
       gltf.scene.traverse((child) => {
           if (child.isMesh) {
               child.castShadow = true; 
               child.receiveShadow = true; 
           }
       });
       
       scene.add(gltf.scene);

       if (gltf.animations && gltf.animations.length > 0) {
           mixer = new THREE.AnimationMixer(gltf.scene);
           const action = mixer.clipAction(gltf.animations[0]);
           action.play();
       }
       
       clickableObject = gltf.scene;
    },
   
    function (progress) {
       console.log('Progreso:', (progress.loaded / progress.total * 100) + '%');
    },
   
    function (error) {
       console.error('Error cargando el modelo:', error);
    }
);

const clock = new THREE.Clock()
let previousTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

    if(mixer) {
       mixer.update(deltaTime)
    }

    if (isZooming) {
        zoomProgress += deltaTime / zoomDuration
        
        if (zoomProgress >= 1) {
            window.location.href = 'page2.html'
        } else {
            const easeProgress = zoomProgress < 0.5 
                ? 2 * zoomProgress * zoomProgress 
                : 1 - Math.pow(-2 * zoomProgress + 2, 2) / 2

            camera.position.x = startCameraPosition.x + (targetPosition.x - startCameraPosition.x) * easeProgress
            camera.position.y = startCameraPosition.y + (targetPosition.y - startCameraPosition.y) * easeProgress
            camera.position.z = startCameraPosition.z + (targetPosition.z - startCameraPosition.z) * easeProgress
            
            camera.lookAt(0, 0, 0)
        }
    } else {
        controls.update()
    }

    renderer.render(scene, camera)

    window.requestAnimationFrame(tick)
}

let isZooming = false
const startCameraPosition = { x: 0, y: 0.5, z: 5 }
const targetPosition = { x: 0, y: 0, z: 0.5 } 
let zoomProgress = 0
const zoomDuration = 1.0

canvas.addEventListener('click', (event) => {
    if (isZooming) return
    
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
    
    raycaster.setFromCamera(mouse, camera)
    
    if (clickableObject) {
        const intersects = raycaster.intersectObject(clickableObject, true)
        
        if (intersects.length > 0) {
            console.log('¡Clickeaste el TV!')
            isZooming = true
            controls.enabled = false
            zoomProgress = 0
        }
    }
})

tick()