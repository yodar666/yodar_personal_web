const background = "#101010"
game.width = 800
game.height = 800
const ctx = game.getContext("2d")

const selForma = document.getElementById("forma")
const selAnimacion = document.getElementById("animacion")
const selColor = document.getElementById("color")
const selVelocidad = document.getElementById("velocidad")
const selCamara = document.getElementById("camara")

function clear(){
    ctx.fillStyle = background
    ctx.fillRect(0, 0, game.width, game.height)
}

function point({x,y}, color){
    const s = 20;
    ctx.fillStyle = color
    ctx.fillRect(x - s/2, y - s/2, s, s)
}

function line(p1, p2, color){
    ctx.lineWidth = 3;
    ctx.strokeStyle = color
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.stroke();
}

function screen(p) {
    return {
        x: (p.x + 1) / 2 * game.width,
        y: (1 - (p.y + 1) / 2) * game.height
    }
}

function project({ x, y, z }) {
    return {
        x: x / z,
        y: y / z
    }
}

const FPS = 60;
const TILT = 0.3;   // inclinación fija para que las formas planas no se vean de canto

function traslate_x({x,y,z}, dx){
    return {x: x + dx, y, z}
}

function traslate_y({x,y,z}, dy){
    return {x, y: y + dy, z}
}

function traslate_z({x,y,z}, dz){
    return {x, y, z: z + dz}
}

function rotate_xz({x,y,z}, angle){   // giro sobre el eje Y
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    return {
        x: x*c - z*s,
        y,
        z: x*s + z*c,
    }
}

function rotate_yz({x,y,z}, angle){   // giro sobre el eje X
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    return {
        x,
        y: y*c - z*s,
        z: y*s + z*c,
    }
}

// ---- Animaciones ----
// Cada una recibe el tiempo t (ya multiplicado por la velocidad) y devuelve la pose:
//   ay: giro sobre Y, ax: giro sobre X, dx: desplazamiento en X, dz: distancia
const POSE_BASE = { ay: 0, ax: 0, dx: 0, dz: 1 }

function anim_estatico(t){
    return { ...POSE_BASE }
}

function anim_rotar_y(t){
    return { ...POSE_BASE, ay: t * Math.PI }
}

function anim_rotar_x(t){
    return { ...POSE_BASE, ax: t * Math.PI }
}

function anim_rotar_xy(t){
    return { ...POSE_BASE, ay: t * Math.PI, ax: t * Math.PI * 0.6 }
}

// La figura recorre una elipse en el plano X-Z: se acerca, se aleja y se desplaza de lado
function anim_eliptica(t){
    const a = t * Math.PI * 0.5
    return { ...POSE_BASE, dx: 0.5 * Math.cos(a), dz: 1.6 + 0.9 * Math.sin(a) }
}

const animaciones = {
    estatico: anim_estatico,
    rotar_y: anim_rotar_y,
    rotar_x: anim_rotar_x,
    rotar_xy: anim_rotar_xy,
    eliptica: anim_eliptica,
}

// camaraY: altura de la cámara (positivo = sube, la figura se ve más abajo)
function transform(v, pose, camaraY){
    let r = rotate_xz(v, pose.ay)
    r = rotate_yz(r, pose.ax + TILT)
    r = traslate_x(r, pose.dx)
    r = traslate_z(r, pose.dz)
    r = traslate_y(r, -camaraY)
    return screen(project(r))
}

// ---- Formas ----
let formas = {}
let t = 0

// Dibuja un cuadro. Parámetros: animación, color, figura, velocidad de la animación, altura de la cámara
function mostrar(animacion, color, figura, velocidad, camaraY = 0){
    t += velocidad / FPS

    const forma = formas[figura]
    if (!forma) return
    const pose = (animaciones[animacion] || anim_estatico)(t)
    const { vs, fs } = forma

    clear()
    for (const f of fs){
        for (let i = 0; i < f.length; ++i){
            const a = vs[f[i]];
            const b = vs[f[(i+1)%f.length]];
            line(transform(a, pose, camaraY), transform(b, pose, camaraY), color)
        }
    }
}

function frame(){
    mostrar(selAnimacion.value, selColor.value, selForma.value, Number(selVelocidad.value), Number(selCamara.value))
    setTimeout(frame, 1000 / FPS)
}

async function cargar(){
    try {
        const res = await fetch("../datos/formas.json")
        formas = await res.json()
    } catch (e) {
        clear()
        ctx.fillStyle = "#ff5050"
        ctx.font = "20px monospace"
        ctx.fillText("No se pudo cargar datos/formas.json (usa un servidor local)", 20, 40)
        console.error(e)
        return
    }
    for (const nombre of Object.keys(formas)){
        selForma.add(new Option(nombre, nombre))
    }
    const pedida = new URLSearchParams(location.search).get("forma")
    if (pedida in formas) selForma.value = pedida

    frame()
}

cargar()