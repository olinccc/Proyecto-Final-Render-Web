// ===== IMPORTACIONES =====
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

console.log(GLTFLoader)

/**
 * ===== CONFIGURACIÓN BASE =====
 */

// GUI para debugging (no se usa actualmente)
//const gui = new GUI()

// Canvas donde se renderiza Three.js
const canvas = document.querySelector('canvas.webgl')

// Escena 3D principal
const scene = new THREE.Scene()

// Raycaster para detectar clicks en objetos 3D
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let clickableObject = null // Guardará el modelo TV para detectar clicks

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

/**
 * ===== LUCES =====
 */
// Luz ambiental que ilumina toda la escena uniformemente
const ambientLight = new THREE.AmbientLight(0xffffff, 2.4)
scene.add(ambientLight)

// Luz direccional con sombras
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024) // Resolución del mapa de sombras
directionalLight.shadow.camera.far = 15
directionalLight.shadow.camera.left = - 7
directionalLight.shadow.camera.top = 7
directionalLight.shadow.camera.right = 7
directionalLight.shadow.camera.bottom = - 7
directionalLight.position.set(5, 5, 5) // Posición de la luz
scene.add(directionalLight)

/**
 * ===== TAMAÑOS DE VENTANA =====
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

// Event listener para ajustar el canvas al redimensionar ventana
window.addEventListener('resize', () =>
{
    // Actualizar tamaños
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Actualizar cámara (aspect ratio)
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Actualizar renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
});

/**
 * ===== CÁMARA =====
 */
// Cámara perspectiva (FOV 75°)
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(0, 0.5, 5) // Posición inicial alejada del TV
scene.add(camera)

// Controles de órbita para rotar la cámara con el mouse
const controls = new OrbitControls(camera, canvas)
controls.target.set(0, 0, 0) // Punto hacia el que mira la cámara
controls.enableDamping = true // Suavizado de movimiento

/**
 * ===== RENDERER =====
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true // Hace el canvas transparente para ver el fondo CSS
})
// Configurar fondo transparente (permite ver fondocute.png del CSS)
renderer.setClearColor('#000000', 0) // Negro con opacidad 0
renderer.shadowMap.enabled = true // Habilitar sombras
renderer.shadowMap.type = THREE.PCFSoftShadowMap // Sombras suaves
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * ===== CARGAR MODELO 3D (TV) =====
 */
let mixer = null; // Mixer para animaciones del modelo
const gltfLoader = new GLTFLoader();
gltfLoader.load(
    '/models/tv/scene.gltf', // Ruta del modelo
    // Callback de éxito
    function (gltf)  {
       console.log('Modelo cargado:', gltf);
       
       // Posicionar y escalar el modelo TV
       gltf.scene.scale.set(4, 4, 4); // Escala 4x4x4
       gltf.scene.position.set(0, 0, 0); // Centro de la escena
       
       // Habilitar sombras en todos los meshes del modelo
       gltf.scene.traverse((child) => {
           if (child.isMesh) {
               child.castShadow = true; // Proyecta sombras
               child.receiveShadow = true; // Recibe sombras
           }
       });
       
       scene.add(gltf.scene);

       // Inicializar animaciones si el modelo las tiene
       if (gltf.animations && gltf.animations.length > 0) {
           mixer = new THREE.AnimationMixer(gltf.scene);
           const action = mixer.clipAction(gltf.animations[0]);
           action.play();
       }
       
       // Guardar referencia del modelo para detectar clicks
       clickableObject = gltf.scene;
    },
    // Callback de progreso
    function (progress) {
       console.log('Progreso:', (progress.loaded / progress.total * 100) + '%');
    },
    // Callback de error
    function (error) {
       console.error('Error cargando el modelo:', error);
    }
);

/**
 * ===== LOOP DE ANIMACIÓN =====
 */
const clock = new THREE.Clock()
let previousTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

    // Actualizar animaciones del modelo (si tiene)
    if(mixer) {
       mixer.update(deltaTime)
    }

    // ===== ANIMACIÓN DE ZOOM =====
    if (isZooming) {
        zoomProgress += deltaTime / zoomDuration
        
        if (zoomProgress >= 1) {
            // Cuando la animación termina, navegar a page2.html
            window.location.href = 'page2.html'
        } else {
            // Interpolación suave con easing (ease-in-out)
            const easeProgress = zoomProgress < 0.5 
                ? 2 * zoomProgress * zoomProgress 
                : 1 - Math.pow(-2 * zoomProgress + 2, 2) / 2
            
            // Actualizar posición de la cámara (interpolación lineal con easing)
            camera.position.x = startCameraPosition.x + (targetPosition.x - startCameraPosition.x) * easeProgress
            camera.position.y = startCameraPosition.y + (targetPosition.y - startCameraPosition.y) * easeProgress
            camera.position.z = startCameraPosition.z + (targetPosition.z - startCameraPosition.z) * easeProgress
            
            // Mantener cámara mirando al centro del TV
            camera.lookAt(0, 0, 0)
        }
    } else {
        // Actualizar controles OrbitControls solo cuando no hay animación
        controls.update()
    }

    // Renderizar la escena
    renderer.render(scene, camera)

    // Llamar tick de nuevo en el siguiente frame
    window.requestAnimationFrame(tick)
}

/**
 * ===== VARIABLES PARA ANIMACIÓN DE ZOOM =====
 */
let isZooming = false // Estado de la animación
const startCameraPosition = { x: 0, y: 0.5, z: 5 } // Posición inicial de la cámara
const targetPosition = { x: 0, y: 0, z: 0.5 } // Posición final (cerca del TV)
let zoomProgress = 0 // Progreso de 0 a 1
const zoomDuration = 1.0 // Duración en segundos

/**
 * ===== DETECCIÓN DE CLICK EN EL TV =====
 */
// Event listener para detectar clicks en el canvas
canvas.addEventListener('click', (event) => {
    // No permitir clicks durante la animación
    if (isZooming) return
    
    // Convertir coordenadas del mouse a espacio normalizado (-1 a 1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
    
    // Configurar raycaster desde la cámara hacia la posición del mouse
    raycaster.setFromCamera(mouse, camera)
    
    // Verificar si el rayo intersecta con el modelo TV
    if (clickableObject) {
        const intersects = raycaster.intersectObject(clickableObject, true) // true = recursivo
        
        if (intersects.length > 0) {
            console.log('¡Clickeaste el TV!')
            // Iniciar animación de zoom hacia el TV
            isZooming = true
            controls.enabled = false // Deshabilitar controles durante la animación
            zoomProgress = 0 // Reiniciar progreso
        }
    }
})

// Iniciar loop de animación
tick()