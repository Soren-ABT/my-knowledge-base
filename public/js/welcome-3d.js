import * as THREE from 'three';

// ==================== 昼夜检测 (由 WelcomeLayout head 脚本统一管理) ====================
let isNight = document.documentElement.classList.contains('dark');

// ==================== 场景初始化 ====================
const canvas = document.getElementById('bg-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 80);
camera.position.set(0, 2.5, 9);
camera.lookAt(0, 0, 0);

const raycaster = new THREE.Raycaster();
raycaster.params.Line.threshold = 0.4;
const mouse = new THREE.Vector2();
const mainGroup = new THREE.Group();
scene.add(mainGroup);

// 可复用向量池
const V = [];
for (let i = 0; i < 12; i++) V.push(new THREE.Vector3());
function v(i) { return V[i]; }

function col() {
  return isNight
    ? { face: 0x181828, edge: 0x88bbff, edgeBright: 0xaaddff, orbit: 0x334466, accent: 0x7799cc, star: 0x6688bb, sunEdge: 0xaaddff, glow: 0x334466 }
    : { face: 0xe8e4df, edge: 0x3a3a3a, edgeBright: 0x555555, orbit: 0xc5c0b8, accent: 0x666666, star: 0x999999, sunEdge: 0x4a4a4a, glow: 0xddd8d0 };
}

// ==================== 星空 ====================
const starsCount = 600;
const starsGeo = new THREE.BufferGeometry();
const starsPos = new Float32Array(starsCount * 3);
const starsCol = new Float32Array(starsCount * 3);
for (let i = 0; i < starsCount; i++) {
  starsPos[i*3] = (Math.random()-0.5)*26;
  starsPos[i*3+1] = (Math.random()-0.5)*18;
  starsPos[i*3+2] = (Math.random()-0.5)*14-4;
  const sc = new THREE.Color().setHSL(0.58+Math.random()*0.2, 0.2, isNight?0.5+Math.random()*0.4:0.2+Math.random()*0.2);
  starsCol[i*3]=sc.r; starsCol[i*3+1]=sc.g; starsCol[i*3+2]=sc.b;
}
starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPos, 3));
starsGeo.setAttribute('color', new THREE.BufferAttribute(starsCol, 3));
const starsMat = new THREE.PointsMaterial({ size:0.04, vertexColors:true, blending:THREE.AdditiveBlending, depthWrite:false, transparent:true, opacity:isNight?0.85:0.35 });
const stars = new THREE.Points(starsGeo, starsMat);
scene.add(stars);

// ==================== 交互体 ====================
const allInteractiveBodies = [];

function makeBody(geometry, faceColor, edgeColor, metadata) {
  const group = new THREE.Group();
  const faceMat = new THREE.MeshStandardMaterial({ color:faceColor, roughness:0.5, metalness:0.05, transparent:true, opacity:0.26, depthWrite:true });
  const faceMesh = new THREE.Mesh(geometry, faceMat);
  faceMesh.castShadow = true; faceMesh.receiveShadow = true;
  group.add(faceMesh);
  const edgesGeo = new THREE.EdgesGeometry(geometry, 18);
  const edgeOpacity = isNight ? 0.90 : 0.72;
  const edgeMat = new THREE.LineBasicMaterial({ color:edgeColor, transparent:true, opacity:edgeOpacity, depthTest:true });
  const edgeLine = new THREE.LineSegments(edgesGeo, edgeMat);
  group.add(edgeLine);
  group.userData = {
    faceMesh, faceMat, edgeLine, edgeMat,
    baseFaceColor: faceColor, baseEdgeColor: edgeColor,
    baseFaceOpacity: 0.26, baseEdgeOpacity: edgeOpacity,
    metadata: metadata || {}, isBody: true
  };
  allInteractiveBodies.push(group);
  return group;
}

// ==================== 太阳 ====================
const c = col();
const sunGeo = new THREE.IcosahedronGeometry(0.68, 4);
const sunBody = makeBody(sunGeo, c.face, c.sunEdge, {
  name: 'Sun · Icosahedron', type: 'Icosahedron (detail 4)', faces: 5120, edges: 7680,
  vertices: 2562, orbit: 'Center (N-body anchor)', period: '—', role: 'Gravitational center'
});
sunBody.userData.isSun = true;
mainGroup.add(sunBody);

const glowGeo1 = new THREE.TorusGeometry(0.82, 0.038, 16, 100);
const glowMat1 = new THREE.MeshBasicMaterial({ color:c.glow, transparent:true, opacity:0.28, depthWrite:false });
const glowRing1 = new THREE.Mesh(glowGeo1, glowMat1);
sunBody.add(glowRing1);
const glowGeo2 = new THREE.TorusGeometry(0.90, 0.024, 16, 120);
const glowMat2 = new THREE.MeshBasicMaterial({ color:c.glow, transparent:true, opacity:0.20, depthWrite:false });
const glowRing2 = new THREE.Mesh(glowGeo2, glowMat2);
glowRing2.rotation.x = Math.PI * 0.5;
sunBody.add(glowRing2);

// ==================== 8 星体系统 ====================
const G = 0.65;
const SUN_MASS = 8.0;
const physicsBodies = [];

const orbitDefs = [
  { r:1.25, tiltX:0.30, tiltY:0.10, mass:0.08, size:0.10, geo:new THREE.TetrahedronGeometry(0.10, 3),
    meta:{name:'Tetrahedron I',type:'Tetrahedron (d3)',faces:256,edges:384,vertices:130,orbit:'1.25 AU',period:'dynamic'} },
  { r:1.80, tiltX:-0.22, tiltY:-0.24, mass:0.11, size:0.12, geo:new THREE.OctahedronGeometry(0.12, 3),
    meta:{name:'Octahedron II',type:'Octahedron (d3)',faces:512,edges:768,vertices:258,orbit:'1.80 AU',period:'dynamic'} },
  { r:2.40, tiltX:0.42, tiltY:-0.14, mass:0.15, size:0.14, geo:new THREE.DodecahedronGeometry(0.14, 3),
    meta:{name:'Dodecahedron III',type:'Dodecahedron (d3)',faces:720,edges:1080,vertices:362,orbit:'2.40 AU',period:'dynamic',hasRing:true} },
  { r:3.05, tiltX:-0.35, tiltY:0.20, mass:0.20, size:0.16, geo:new THREE.IcosahedronGeometry(0.16, 3),
    meta:{name:'Icosahedron IV',type:'Icosahedron (d3)',faces:1280,edges:1920,vertices:642,orbit:'3.05 AU',period:'dynamic',hasMoon:true} },
  { r:3.70, tiltX:0.18, tiltY:-0.32, mass:0.18, size:0.13, geo:new THREE.TetrahedronGeometry(0.13, 4),
    meta:{name:'Tetrahedron V',type:'Tetrahedron (d4)',faces:1024,edges:1536,vertices:514,orbit:'3.70 AU',period:'dynamic'} },
  { r:4.35, tiltX:-0.28, tiltY:0.26, mass:0.25, size:0.18, geo:new THREE.OctahedronGeometry(0.18, 4),
    meta:{name:'Octahedron VI',type:'Octahedron (d4)',faces:2048,edges:3072,vertices:1026,orbit:'4.35 AU',period:'dynamic'} },
  { r:5.00, tiltX:0.50, tiltY:-0.18, mass:0.22, size:0.20, geo:new THREE.DodecahedronGeometry(0.20, 4),
    meta:{name:'Dodecahedron VII',type:'Dodecahedron (d4)',faces:2880,edges:4320,vertices:1442,orbit:'5.00 AU',period:'dynamic',hasRing:true,hasMoon:true} },
  { r:5.65, tiltX:-0.40, tiltY:0.30, mass:0.30, size:0.24, geo:new THREE.IcosahedronGeometry(0.24, 4),
    meta:{name:'Icosahedron VIII',type:'Icosahedron (d4)',faces:5120,edges:7680,vertices:2562,orbit:'5.65 AU',period:'dynamic'} },
];

orbitDefs.forEach((def) => {
  const ringGeo = new THREE.TorusGeometry(def.r, 0.016, 16, 180);
  const ringMat = new THREE.MeshBasicMaterial({ color:c.orbit, transparent:true, opacity:0.28, depthWrite:false });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI/2 + def.tiltX;
  ring.rotation.y = def.tiltY;
  mainGroup.add(ring);

  const body = makeBody(def.geo, c.face, c.edge, def.meta);
  body.position.set(def.r, 0, 0);
  mainGroup.add(body);

  const vMag = Math.sqrt(G * SUN_MASS / def.r);
  const velDir = v(0).set(0, 1, 0);
  velDir.applyAxisAngle(v(1).set(1,0,0), def.tiltX);
  velDir.applyAxisAngle(v(2).set(0,1,0), def.tiltY);
  velDir.normalize();

  physicsBodies.push({
    group: body, mass: def.mass,
    pos: new THREE.Vector3(def.r, 0, 0),
    vel: velDir.clone().multiplyScalar(vMag),
    moonAngle: 0
  });

  if (def.meta.hasRing) {
    const prGeo = new THREE.TorusGeometry(def.size*2.2, 0.026, 16, 100);
    const prMat = new THREE.MeshBasicMaterial({ color:c.orbit, transparent:true, opacity:0.32, depthWrite:false });
    const pr = new THREE.Mesh(prGeo, prMat);
    pr.rotation.x = Math.PI*0.55;
    body.add(pr);
  }
  if (def.meta.hasMoon) {
    const moonGeo = new THREE.TetrahedronGeometry(def.size*0.45, 2);
    const moon = makeBody(moonGeo, c.face, c.edge, { name:'Moon', type:'Tetrahedron (d2)', faces:64, edges:96, vertices:34, orbit:'Satellite', period:'—', role:'Orbiting moon' });
    moon.position.set(def.size*2.6, def.size*0.8, 0);
    body.add(moon);
    def._moon = moon;
  }
  def._body = body;
  def._ring = ring;
});

// ==================== 小行星带 ====================
const asteroidBelt = [];
for (let i=0; i<50; i++) {
  const r = 2.65+Math.random()*0.35, angle = Math.random()*Math.PI*2;
  const size = 0.022+Math.random()*0.04;
  const g = Math.random()<0.5?new THREE.TetrahedronGeometry(size,0):new THREE.OctahedronGeometry(size,0);
  const eg = new THREE.EdgesGeometry(g, 15);
  const em = new THREE.LineBasicMaterial({ color:c.orbit, transparent:true, opacity:0.28, depthWrite:false });
  const line = new THREE.LineSegments(eg, em);
  line.position.set(Math.cos(angle)*r, Math.sin(angle)*0.25*r*0.30, Math.sin(angle)*0.65*r);
  mainGroup.add(line);
  asteroidBelt.push({ mesh:line, radius:r, speed:0.10+Math.random()*0.25, angle });
}

// ==================== 鼠标 & 摄像机状态 ====================
let mouseX=0, mouseY=0, targetX=0, targetY=0;
let hoveredBody = null;
let selectedPhysicsBody = null;
let sunPosterMode = false;
let cameraDistance = 2.5, targetCameraDistance = 2.5;
const camVel = new THREE.Vector3();
const lookVel = new THREE.Vector3();
const currentLookTarget = new THREE.Vector3(0,0,0);
const targetLookTarget = new THREE.Vector3(0,0,0);
let avgDt = 0.016;
let zoomHudTimer = null;
const zoomHud = document.getElementById('zoom-hud');

function showZoomHud() {
  const level = (cameraDistance / 2.5).toFixed(1);
  zoomHud.textContent = level + '×';
  zoomHud.classList.add('visible');
  clearTimeout(zoomHudTimer);
  zoomHudTimer = setTimeout(() => zoomHud.classList.remove('visible'), 1800);
}

// ==================== 事件监听 ====================
document.addEventListener('mousemove', (e) => {
  targetX = (e.clientX/window.innerWidth)*2-1;
  targetY = -(e.clientY/window.innerHeight)*2+1;
  mouse.x = targetX; mouse.y = targetY;
});

document.addEventListener('click', (e) => {
  mouse.x = (e.clientX/window.innerWidth)*2-1;
  mouse.y = -(e.clientY/window.innerHeight)*2+1;
  spawnRipple(e.clientX, e.clientY);
  raycaster.setFromCamera(mouse, camera);
  const targets = allInteractiveBodies.map(b=>b.userData.faceMesh).filter(m=>m);
  const intersects = raycaster.intersectObjects(targets, false);
  if (intersects.length>0) {
    const parent = intersects[0].object.parent;
    if (parent && parent.userData.isBody) selectBody(parent);
  } else { deselectBody(); }
});

document.addEventListener('wheel', (e) => {
  e.preventDefault();
  targetCameraDistance += e.deltaY * 0.005;
  targetCameraDistance = Math.max(0.8, Math.min(8.0, targetCameraDistance));
  showZoomHud();
}, { passive: false });

let lastPinchDist = 0;
document.addEventListener('touchstart', (e) => {
  if (e.touches.length === 2) {
    lastPinchDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
  }
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  if (e.touches.length === 2) {
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const delta = lastPinchDist - dist;
    targetCameraDistance += delta * 0.012;
    targetCameraDistance = Math.max(0.8, Math.min(8.0, targetCameraDistance));
    lastPinchDist = dist;
    showZoomHud();
  }
  if (e.touches.length === 1) {
    targetX=(e.touches[0].clientX/window.innerWidth)*2-1;
    targetY=-(e.touches[0].clientY/window.innerHeight)*2+1;
    mouse.x=targetX; mouse.y=targetY;
  }
}, { passive: true });

document.addEventListener('touchend', (e) => {
  if (e.touches.length === 0 && e.changedTouches.length === 1) {
    const tx = e.changedTouches[0].clientX, ty = e.changedTouches[0].clientY;
    spawnRipple(tx, ty);
    raycaster.setFromCamera(mouse, camera);
    const targets = allInteractiveBodies.map(b=>b.userData.faceMesh).filter(m=>m);
    const intersects = raycaster.intersectObjects(targets, false);
    if (intersects.length>0) {
      const parent = intersects[0].object.parent;
      if (parent && parent.userData.isBody) selectBody(parent);
    } else deselectBody();
  }
});

function spawnRipple(x, y) {
  const ripple = document.createElement('div'); ripple.className = 'ripple';
  ripple.style.left = x + 'px'; ripple.style.top = y + 'px';
  document.body.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

// ==================== 选中逻辑 ====================
function selectBody(body) {
  deselectBody();
  let targetBody = body;
  if (body.parent && body.parent !== mainGroup && body.parent.userData && body.parent.userData.isBody) {
    targetBody = body.parent;
  }
  for (const pb of physicsBodies) { if (pb.group === targetBody) { selectedPhysicsBody = pb; break; } }
  if (!selectedPhysicsBody && targetBody === sunBody) {
    selectedPhysicsBody = { group: sunBody, mass: SUN_MASS, pos: new THREE.Vector3(0,0,0), vel: new THREE.Vector3(0,0,0), meta: sunBody.userData.metadata, isSun: true };
    sunPosterMode = Math.random() < 0.5;
  }
  if (!selectedPhysicsBody) return;
  const ud = targetBody.userData;
  ud.faceMat.opacity = 0.48; ud.edgeMat.opacity = 1;
  ud.edgeMat.color.set(isNight?0xddeeff:0x111111); ud.faceMat.color.set(isNight?0x334466:0xffffff);
  cameraDistance = 2.5; targetCameraDistance = 2.5;
  camVel.set(0,0,0); lookVel.set(0,0,0);
  showInfoPanel(ud.metadata || selectedPhysicsBody.meta);
}

function deselectBody() {
  if (!selectedPhysicsBody) return;
  const ud = selectedPhysicsBody.group.userData;
  if (ud && ud.isBody) {
    ud.faceMat.color.set(ud.baseFaceColor); ud.faceMat.opacity = ud.baseFaceOpacity;
    ud.edgeMat.color.set(ud.baseEdgeColor); ud.edgeMat.opacity = ud.baseEdgeOpacity;
  }
  selectedPhysicsBody = null; sunPosterMode = false;
  hideInfoPanel();
}

// ==================== 信息面板 ====================
const infoPanel = document.getElementById('infoPanel'), ipName = document.getElementById('ipName');
const ipStats = document.getElementById('ipStats'), ipIcon = document.getElementById('ipIcon');
const ipClose = document.getElementById('ipClose'), hintText = document.getElementById('hintText');
ipClose.addEventListener('click', (e) => { e.stopPropagation(); deselectBody(); });
function showInfoPanel(meta) {
  if (!meta) return; ipName.textContent = meta.name || 'Unknown';
  const pb = selectedPhysicsBody; const speed = pb && pb.vel ? pb.vel.length().toFixed(3) : '—';
  ipStats.innerHTML = '<span>Type: '+(meta.type||'—')+'</span><span>Faces: '+(meta.faces||'—')+'</span><span>Edges: '+(meta.edges||'—')+'</span><span>Vertices: '+(meta.vertices||'—')+'</span><span>Speed: '+speed+' u/s</span><span>Orbit: '+(meta.orbit||'—')+'</span>';
  ipIcon.textContent = meta.role ? '\u{1F537}' : '\u{1F536}'; infoPanel.classList.add('visible'); if (hintText) hintText.style.opacity = '0';
}
function hideInfoPanel() { infoPanel.classList.remove('visible'); if (hintText) hintText.style.opacity = '0.55'; }

// ==================== 自定义光标 ====================
const cursorEl = document.getElementById('custom-cursor');
document.addEventListener('mousemove', (e) => { cursorEl.style.left = e.clientX + 'px'; cursorEl.style.top = e.clientY + 'px'; });
document.addEventListener('mouseover', (e) => { if (e.target.closest('a, button, .btn, [onclick]')) cursorEl.classList.add('hovering'); });
document.addEventListener('mouseout', (e) => {
  if (e.target.closest('a, button, .btn, [onclick]')) {
    const rel = e.relatedTarget;
    if (!rel || !rel.closest('a, button, .btn, [onclick]')) cursorEl.classList.remove('hovering');
  }
});

// ==================== 物理更新 ====================
function updatePhysics(dt) {
  const subSteps = avgDt > 0.045 ? 1 : avgDt > 0.028 ? 2 : 3;
  const h = dt / subSteps;
  for (let s = 0; s < subSteps; s++) {
    for (const pb of physicsBodies) {
      const dx = -pb.pos.x, dy = -pb.pos.y, dz = -pb.pos.z;
      const distSq = dx*dx + dy*dy + dz*dz;
      const dist = Math.sqrt(distSq);
      const dc = Math.max(dist, 0.25);
      const fm = G * SUN_MASS * pb.mass / (dc * dc);
      pb.vel.x += fm * dx / (dc * pb.mass) * h;
      pb.vel.y += fm * dy / (dc * pb.mass) * h;
      pb.vel.z += fm * dz / (dc * pb.mass) * h;
      pb.pos.x += pb.vel.x * h; pb.pos.y += pb.vel.y * h; pb.pos.z += pb.vel.z * h;
    }
    for (let i = 0; i < physicsBodies.length; i++) { for (let j = i+1; j < physicsBodies.length; j++) {
      const a = physicsBodies[i], b = physicsBodies[j];
      const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y, dz = b.pos.z - a.pos.z;
      const distSq = dx*dx + dy*dy + dz*dz; const dist = Math.sqrt(distSq);
      if (dist < 0.12) continue;
      const fm = G * a.mass * b.mass / distSq;
      const fx = fm * dx / dist, fy = fm * dy / dist, fz = fm * dz / dist;
      a.vel.x += fx / a.mass * h; a.vel.y += fy / a.mass * h; a.vel.z += fz / a.mass * h;
      b.vel.x -= fx / b.mass * h; b.vel.y -= fy / b.mass * h; b.vel.z -= fz / b.mass * h;
    }}
  }
  for (const pb of physicsBodies) pb.group.position.copy(pb.pos);
}

function resetHover(body) {
  const ud = body.userData;
  if (ud && ud.isBody) {
    ud.faceMat.color.set(ud.baseFaceColor); ud.faceMat.opacity = ud.baseFaceOpacity;
    ud.edgeMat.color.set(ud.baseEdgeColor); ud.edgeMat.opacity = ud.baseEdgeOpacity;
  }
}

// ==================== 动画循环 ====================
let firstFrameRendered = false;
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.12);
  const t = performance.now()*0.001;
  avgDt = avgDt * 0.88 + dt * 0.12;

  mouseX += (targetX-mouseX)*5*dt;
  mouseY += (targetY-mouseY)*5*dt;

  updatePhysics(dt);

  sunBody.rotation.x += 0.002; sunBody.rotation.y += 0.003; sunBody.rotation.z += 0.001;
  glowRing1.rotation.z += 0.004; glowRing2.rotation.y += 0.005;

  for (const pb of physicsBodies) {
    pb.group.rotation.x += 0.005; pb.group.rotation.y += 0.007;
    const def = orbitDefs.find(d => d._body === pb.group);
    if (def && def._moon) {
      pb.moonAngle = (pb.moonAngle||0) + 2.5*dt;
      const ma = pb.moonAngle;
      def._moon.position.x = Math.cos(ma)*0.38;
      def._moon.position.y = Math.sin(ma)*0.18;
      def._moon.position.z = Math.sin(ma)*0.22;
    }
  }

  asteroidBelt.forEach(ast => {
    ast.angle+=ast.speed*dt; const a=ast.angle;
    ast.mesh.position.x=Math.cos(a)*ast.radius;
    ast.mesh.position.y=Math.sin(a)*0.25*ast.radius*0.28;
    ast.mesh.position.z=Math.sin(a)*0.65*ast.radius;
    ast.mesh.rotation.x+=0.01; ast.mesh.rotation.y+=0.014;
  });
  stars.rotation.y+=0.0002; stars.rotation.x+=0.0001;

  // 悬停检测
  if (!selectedPhysicsBody) {
    raycaster.setFromCamera(mouse, camera);
    const targets = allInteractiveBodies.map(b=>b.userData.faceMesh).filter(m=>m);
    const intersects = raycaster.intersectObjects(targets, false);
    if (hoveredBody && (!intersects.length || intersects[0].object.parent!==hoveredBody)) {
      resetHover(hoveredBody); hoveredBody=null; cursorEl.classList.remove('hovering');
    }
    if (intersects.length>0 && !hoveredBody) {
      const parent=intersects[0].object.parent;
      if (parent&&parent.userData.isBody) {
        hoveredBody=parent;
        const ud=hoveredBody.userData;
        ud.faceMat.color.set(isNight?0x5577aa:0xffffff);
        ud.faceMat.opacity=Math.min(1,ud.baseFaceOpacity+0.25);
        ud.edgeMat.color.set(isNight?0xddeeff:0x000000);
        ud.edgeMat.opacity=1;
        cursorEl.classList.add('hovering');
      }
    }
  }

  // 弹簧摄像机
  cameraDistance += (targetCameraDistance - cameraDistance) * 3.5 * dt;
  const scale = cameraDistance / 2.5;
  v(0).copy(sunBody.position);

  if (selectedPhysicsBody) {
    const planetPos = v(1).copy(selectedPhysicsBody.group.position);
    const isSun = selectedPhysicsBody.isSun;

    if (isSun && sunPosterMode) {
      const posterOffset = v(2).set(
        3.5 + Math.sin(t*0.6)*0.6,
        -2.0 + Math.cos(t*0.8)*0.5,
        6.5 + Math.sin(t*0.5)*0.4
      );
      targetLookTarget.copy(v(0)).add(v(3).set(0.25, -0.15, 0));
      v(4).copy(v(0)).add(posterOffset);
    } else {
      const mixFac = isSun ? 0 : 0.16;
      const mixedLook = v(2).copy(v(0)).lerp(planetPos, mixFac);
      targetLookTarget.copy(mixedLook);
      const planetDir = v(3).copy(planetPos).sub(v(0)).normalize();
      if (planetDir.length() < 0.01) planetDir.set(0, 0.6, 0.8).normalize();
      v(4).copy(v(0)).addScaledVector(planetDir, cameraDistance + (isSun ? 1.2 : 1.6));
      v(4).x += Math.sin(t*0.7)*0.16 + Math.cos(t*1.3)*0.12;
      v(4).y += Math.cos(t*0.9)*0.20 + Math.sin(t*1.1)*0.14;
      v(4).z += Math.sin(t*0.5)*0.10 + Math.cos(t*0.8)*0.16;
    }
  } else {
    targetLookTarget.set(0, 0, 0);
    v(4).set(mouseX * 1.5 * scale, (2.5 - mouseY * 0.8) * scale, 9 * scale);
  }

  const camStiffness = 5.5, camDamping = 3.0;
  v(5).subVectors(v(4), camera.position).multiplyScalar(camStiffness);
  camVel.add(v(5).multiplyScalar(dt));
  camVel.multiplyScalar(Math.exp(-camDamping * dt));
  camera.position.add(v(5).copy(camVel).multiplyScalar(dt));

  const lookStiffness = 6.0, lookDamping = 3.5;
  v(5).subVectors(targetLookTarget, currentLookTarget).multiplyScalar(lookStiffness);
  lookVel.add(v(5).multiplyScalar(dt));
  lookVel.multiplyScalar(Math.exp(-lookDamping * dt));
  currentLookTarget.add(v(5).copy(lookVel).multiplyScalar(dt));
  camera.lookAt(currentLookTarget);

  if (!selectedPhysicsBody) {
    mainGroup.rotation.y += (mouseX*0.15-mainGroup.rotation.y)*1.8*dt;
    mainGroup.rotation.x += (-mouseY*0.08-mainGroup.rotation.x)*1.8*dt;
  }

  renderer.render(scene, camera);

  // 首帧后隐藏 loading
  if (!firstFrameRendered) {
    firstFrameRendered = true;
    if (typeof window.__hideLoader === 'function') {
      setTimeout(() => window.__hideLoader(), 200);
    }
  }
}
animate();

// ==================== 响应式 ====================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ==================== 昼夜切换 ====================
function updateThreeTheme() {
  const nc = col();

  starsMat.opacity = isNight?0.85:0.35;
  const scArr = starsGeo.attributes.color.array;
  for (let i=0;i<starsCount;i++){
    const sc=new THREE.Color().setHSL(0.58+Math.random()*0.2,0.2,isNight?0.5+Math.random()*0.4:0.2+Math.random()*0.2);
    scArr[i*3]=sc.r; scArr[i*3+1]=sc.g; scArr[i*3+2]=sc.b;
  }
  starsGeo.attributes.color.needsUpdate=true;
  glowMat1.color.set(nc.glow); glowMat2.color.set(nc.glow);

  for (const body of allInteractiveBodies) {
    const ud = body.userData;
    if (!ud || !ud.isBody) continue;
    ud.baseFaceColor = nc.face;
    ud.baseEdgeColor = ud.isSun ? nc.sunEdge : nc.edge;
    ud.baseEdgeOpacity = isNight ? 0.90 : 0.72;
    if (body !== hoveredBody && body !== selectedPhysicsBody?.group) {
      ud.faceMat.color.set(ud.baseFaceColor);
      ud.faceMat.opacity = ud.baseFaceOpacity;
      ud.edgeMat.color.set(ud.baseEdgeColor);
      ud.edgeMat.opacity = ud.baseEdgeOpacity;
    }
  }

  orbitDefs.forEach(def => { if (def._ring) def._ring.material.color.set(nc.orbit); });
  asteroidBelt.forEach(ast=>{ast.mesh.material.color.set(nc.orbit);});

  if (hoveredBody) {
    const ud = hoveredBody.userData;
    ud.faceMat.color.set(isNight?0x5577aa:0xffffff);
    ud.faceMat.opacity = Math.min(1, ud.baseFaceOpacity + 0.25);
    ud.edgeMat.color.set(isNight?0xddeeff:0x000000);
    ud.edgeMat.opacity = 1;
  }
  if (selectedPhysicsBody) {
    const ud = selectedPhysicsBody.group.userData;
    ud.edgeMat.color.set(isNight?0xddeeff:0x111111);
    ud.faceMat.color.set(isNight?0x334466:0xffffff);
    ud.edgeMat.opacity = 1;
  }
}

// Listen for theme changes (dispatched by the unified head toggle)
if (window.__wcThemeHandler) window.removeEventListener('theme-change', window.__wcThemeHandler);
window.__wcThemeHandler = function(e) {
  isNight = e.detail.dark;
  updateThreeTheme();
};
window.addEventListener('theme-change', window.__wcThemeHandler);

// Bind button to centralized theme toggle
document.getElementById('modeToggle').addEventListener('click', function() {
  if (window.__theme && typeof window.__theme.toggle === 'function') window.__theme.toggle();
});
</script>
