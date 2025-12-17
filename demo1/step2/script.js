// Three.js 场景设置
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// 粒子
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 1500;

const posArray = new Float32Array(particlesCount * 3);

for(let i = 0; i < particlesCount * 3; i++) {
    // 在更大的区域内散布粒子
    posArray[i] = (Math.random() - 0.5) * 15; 
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

// 材质
// 创建一个小的圆形 sprite 纹理，使点看起来为圆点而非方点
function createCircleTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    // 清空
    ctx.clearRect(0, 0, size, size);

    // 以中心为径向渐变：白色->透明，配合 PointsMaterial 的 color 着色
    const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
}

const particleTexture = createCircleTexture();

const material = new THREE.PointsMaterial({
    size: 0.03,            // 世界坐标单位的大小（原来是 0.02，可根据需要微调）
    map: particleTexture,  // 使用圆形纹理
    color: 0x00ff88,       // 着色为原来的绿
    transparent: true,
    opacity: 0.9,
    alphaTest: 0.01,
    depthWrite: false,
    sizeAttenuation: true, // 随距离缩放（保留原有视觉感）
});

// 网格
const particlesMesh = new THREE.Points(particlesGeometry, material);
scene.add(particlesMesh);

// 连接线（可选 - 开销较大，这里先使用带运动的粒子以提高性能）
// 添加第二个几何体作为结构 —— 例如一个线框球体
const sphereGeometry = new THREE.IcosahedronGeometry(3, 1);
const sphereMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x004422, 
    wireframe: true,
    transparent: true,
    opacity: 0.1
});
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphere.position.set(0, 0, 0);
scene.add(sphere);

// 内部黑色球体
const innerGeometry = new THREE.SphereGeometry(1.8, 32, 32);
const innerMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
const innerSphere = new THREE.Mesh(innerGeometry, innerMaterial);
sphere.add(innerSphere);

// 闪光点 (Sprites)
// 模拟之前的 CSS 闪光点效果，不随球体旋转，而是静止在球体表面（视觉上）
const flashDotsGroup = new THREE.Group();
sphere.add(flashDotsGroup); // 添加到 sphere，使其随球体自转

// 创建闪光点纹理
function createFlashTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // 径向渐变：白色 -> 透明，以便通过 material.color 染色
    const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.8)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
}

const flashTexture = createFlashTexture();
const flashMaterial = new THREE.SpriteMaterial({ 
    map: flashTexture, 
    transparent: true,
    depthWrite: false, // 防止遮挡问题
    blending: THREE.AdditiveBlending
});

// 点的数据 (x%, y%, delay)
const dotsData = [
    { x: 18, y: 30, d: 0 },
    { x: 40, y: 20, d: 0.6 },
    { x: 60, y: 35, d: 1.2 },
    { x: 72, y: 50, d: 0.9 },
    { x: 34, y: 65, d: 1.5 },
    { x: 20, y: 48, d: 0.3 },
    { x: 50, y: 72, d: 1.0 },
    { x: 80, y: 22, d: 0.8 },
    { x: 45, y: 45, d: 1.8 },
    { x: 30, y: 40, d: 1.3 }
];

const flashSprites = [];
const sphereRadius = 2.8; // 对应 innerSphere 的半径

dotsData.forEach(data => {
    const sprite = new THREE.Sprite(flashMaterial.clone()); // clone material to control opacity individually
    
    // 随机颜色
    const color = new THREE.Color();
    color.setHSL(Math.random(), 0.8, 0.6);
    sprite.material.color = color;

    // 将百分比坐标映射到球体表面坐标
    // x: 0% -> -R, 100% -> R
    // y: 0% -> R, 100% -> -R
    const x = (data.x / 100 - 0.5) * 2 * sphereRadius;
    const y = (0.5 - data.y / 100) * 2 * sphereRadius;
    // z: 简单投影到球面上 z = sqrt(R^2 - x^2 - y^2)
    // 注意：如果 x^2 + y^2 > R^2，说明点在圆外，这里简单处理一下防止 NaN
    let z = 0;
    const r2 = sphereRadius * sphereRadius;
    const d2 = x*x + y*y;
    if (d2 < r2) {
        z = Math.sqrt(r2 - d2);
    }
    
    // 稍微往外一点，防止与黑球重叠
    sprite.position.set(x, y, z + 0.1);
    
    // 初始大小
    sprite.scale.set(0.3, 0.3, 1); // 基础大小
    
    // 存储动画数据
    sprite.userData = {
        delay: data.d,
        duration: 3.6 // 动画周期
    };
    
    flashDotsGroup.add(sprite);
    flashSprites.push(sprite);
});

// 鼠标交互
let mouseX = 0;
let mouseY = 0;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

document.addEventListener('mousemove', (event) => {
    mouseX = event.clientX / window.innerWidth - 0.5;
    mouseY = event.clientY / window.innerHeight - 0.5;
    
    // Raycaster 需要的归一化坐标 (-1 到 +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// 动画
const clock = new THREE.Clock();
let targetScale = 1;
let targetOpacity = 0.1;
let currentRotationSpeed = { x: 0.02, y: 0.05 };

function animate() {
    const elapsedTime = clock.getElapsedTime();

    // Raycaster 检测
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(innerSphere);
    const isHovered = intersects.length > 0;

    // 吸附动效逻辑
    if (isHovered) {
        // 悬停时：紧贴黑球，透明度增加，旋转变慢（吸附感）
        targetScale = 0.65; // 3 * 0.65 = 1.95 > 1.8 (innerSphere)
        targetOpacity = 0.3;
        // 目标速度变慢
        currentRotationSpeed.x = THREE.MathUtils.lerp(currentRotationSpeed.x, 0.002, 0.05);
        currentRotationSpeed.y = THREE.MathUtils.lerp(currentRotationSpeed.y, 0.005, 0.05);
        document.body.style.cursor = 'pointer';
    } else {
        // 离开时：恢复原状
        targetScale = 1;
        targetOpacity = 0.1;
        // 恢复原速
        currentRotationSpeed.x = THREE.MathUtils.lerp(currentRotationSpeed.x, 0.02, 0.05);
        currentRotationSpeed.y = THREE.MathUtils.lerp(currentRotationSpeed.y, 0.05, 0.05);
        document.body.style.cursor = 'default';
    }

    // 平滑插值更新 Scale 和 Opacity
    sphere.scale.setScalar(THREE.MathUtils.lerp(sphere.scale.x, targetScale, 0.1));
    sphereMaterial.opacity = THREE.MathUtils.lerp(sphereMaterial.opacity, targetOpacity, 0.1);

    // 缓慢旋转整个系统
    particlesMesh.rotation.y = elapsedTime * 0.05;
    particlesMesh.rotation.x = elapsedTime * 0.02;
    
    // 线框球体旋转
    sphere.rotation.y += currentRotationSpeed.y;
    sphere.rotation.x += currentRotationSpeed.x;

    // 闪光点动画
    flashSprites.forEach(sprite => {
        const totalTime = elapsedTime;
        const cycleTime = 3.6; // 周期
        // 计算当前在周期中的时间点 (考虑延迟)
        let t = (totalTime - sprite.userData.delay) % cycleTime;
        if (t < 0) t += cycleTime;
        
        let opacity = 0;
        let scale = 0.6; // 基础缩放倍率
        
        // 模拟 CSS keyframes: 
        // 0% -> 20% (0.72s): opacity 0->0.9, scale 0.6->1.1
        // 20% -> 50% (1.8s): opacity 0.9->0.4, scale 1.1->0.9
        // 50% -> 100% (3.6s): opacity 0.4->0, scale 0.9->0.6
        
        if (t < 0.72) {
            const p = t / 0.72; // 0 -> 1
            opacity = p * 0.9;
            scale = 0.6 + p * 0.5;
        } else if (t < 1.8) {
            const p = (t - 0.72) / (1.8 - 0.72); // 0 -> 1
            opacity = 0.9 - p * 0.5;
            scale = 1.1 - p * 0.2;
        } else {
            const p = (t - 1.8) / (3.6 - 1.8); // 0 -> 1
            opacity = 0.4 - p * 0.4;
            scale = 0.9 - p * 0.3;
        }
        
        sprite.material.opacity = opacity;
        const baseSize = 0.2; // Sprite 的基础世界尺寸 (缩小)
        sprite.scale.set(baseSize * scale, baseSize * scale, 1);
    });

    // 鼠标交互视差
    camera.position.x += (mouseX * 2 - camera.position.x) * 0.05;
    camera.position.y += (-mouseY * 2 - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

camera.position.z = 5;

animate();

// 窗口尺寸变更处理
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
