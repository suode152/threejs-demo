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
const material = new THREE.PointsMaterial({
    size: 0.02,
    color: 0x00ff88, // Tech green
    transparent: true,
    opacity: 0.8,
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
scene.add(sphere);


// 鼠标交互
let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (event) => {
    mouseX = event.clientX / window.innerWidth - 0.5;
    mouseY = event.clientY / window.innerHeight - 0.5;
});

// 动画
const clock = new THREE.Clock();

function animate() {
    const elapsedTime = clock.getElapsedTime();

    // 缓慢旋转整个系统
    particlesMesh.rotation.y = elapsedTime * 0.05;
    particlesMesh.rotation.x = elapsedTime * 0.02;
    
    sphere.rotation.y = elapsedTime * 0.05;
    sphere.rotation.x = elapsedTime * 0.02;

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

/* 文本颜色缓慢随机变化 —— 使用 CSS 变量并在 JS 中平滑插值
   原理：把线性渐变的颜色停点设为 CSS 变量 --g1..--g5，JS 随机生成目标 HSL 值，
   以平滑插值的方式（ease）在当前与目标之间过渡，过渡完成后重新生成目标。
*/
(function(){
    const root = document.documentElement;
    const stops = 5;

    function randHsl(){
        // 随机色相，饱和度与明度在一定范围
        return [Math.random()*360, 50 + Math.random()*30, 35 + Math.random()*20];
    }

    function hslToString(hsl){
        return `hsl(${Math.round(hsl[0])} ${Math.round(hsl[1])}% ${Math.round(hsl[2])}%)`;
    }

    // 初始与目标
    let current = Array.from({length:stops}, ()=>randHsl());
    let target = Array.from({length:stops}, ()=>randHsl());
    let duration = 9000 + Math.random()*6000; // 9-15s
    let start = performance.now();

    function setVars(arr){
        arr.forEach((c,i)=> root.style.setProperty(`--g${i+1}`, hslToString(c)));
    }

    function easeInOut(t){ return 0.5 - 0.5*Math.cos(Math.PI*t); }

    function step(now){
        let t = (now - start) / duration;
        if (t >= 1){
            // 结束本次，设置 current = target，生成新目标
            current = target.map(x=> x.slice());
            target = Array.from({length:stops}, ()=>randHsl());
            duration = 9000 + Math.random()*6000;
            start = now;
            t = 0;
        }
        const et = easeInOut(Math.max(0, Math.min(1, t)));
        const inter = current.map((c,i)=>[
            c[0] + (target[i][0] - c[0]) * et,
            c[1] + (target[i][1] - c[1]) * et,
            c[2] + (target[i][2] - c[2]) * et,
        ]);
        setVars(inter);
        requestAnimationFrame(step);
    }

    // 初始化并启动
    setVars(current);
    requestAnimationFrame(step);
})();
