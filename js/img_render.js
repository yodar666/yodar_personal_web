const background = "#101010"
const TAU = Math.PI * 2

const game = document.getElementById("game")
const view = 800
game.width = view
game.height = view
const gctx = game.getContext("2d")

// ---------- utilidades de dibujo ----------

// Dibuja varias polilíneas con el mismo brillo neón (halo ancho + núcleo fino)
function neon(ctx, paths, color, u, close = false) {
    const passes = [
        { w: 10, a: 0.25, blur: 32 },
        { w: 3,  a: 1,    blur: 16 },
    ]
    for (const p of passes) {
        ctx.lineWidth = Math.max(p.w * u, 0.5)
        ctx.globalAlpha = p.a
        ctx.strokeStyle = color
        ctx.shadowColor = color
        ctx.shadowBlur = p.blur * u
        for (const pts of paths) {
            ctx.beginPath()
            pts.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))
            if (close) ctx.closePath()
            ctx.stroke()
        }
    }
    ctx.globalAlpha = 1
    ctx.shadowBlur = 0
}

// Curva polar r = fn(θ) girada `rot`
function polar(g, fn, rot = 0, span = TAU, N = 1800) {
    const pts = []
    for (let i = 0; i <= N; i++) {
        const th = i / N * span
        const r = fn(th), a = th + rot
        pts.push({ x: g.cx + r * Math.cos(a), y: g.cy + r * Math.sin(a) })
    }
    return pts
}

// Forma de lente entre dos puntos; el borde ondula con una seno
function lens(ax, ay, bx, by, W, u, t, ph = 0) {
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy)
    const nx = -dy / L, ny = dx / L
    const up = [], dn = []
    for (let i = 0; i <= 50; i++) {
        const s = i / 50, e = Math.sin(Math.PI * s)
        const w = W * e + 2.5 * u * Math.sin(s * 6 * Math.PI + t * 2 + ph) * e
        const px = ax + dx * s, py = ay + dy * s
        up.push({ x: px + nx * w, y: py + ny * w })
        dn.push({ x: px - nx * w, y: py - ny * w })
    }
    return up.concat(dn.reverse())
}

// Tallo: x = A·sin(v) desplazado en el tiempo
function stemPoint(v, cx, y0, y1, A, t) {
    return { x: cx + A * Math.sin(v * Math.PI * 2.4 + t), y: y0 + v * (y1 - y0) }
}

// ---------- flores ----------
// Cada flor define sus líneas (nombre + color) y `build`, que devuelve
// un array de trazos por línea (mismo orden) y la altura donde nace el tallo.

const wob = (th, t, n, a) => 1 + a * Math.sin(n * th + t * 2)

const flowers = {
    rosa: {
        name: "Rosa",
        lines: [
            { label: "Pétalos 1", color: "#ff2bd6" },
            { label: "Pétalos 2", color: "#ff3c7e" },
            { label: "Pétalos 3", color: "#ff8a1f" },
            { label: "Pétalos 4", color: "#ffe629" },
            { label: "Centro",    color: "#ffffff" },
        ],
        build(g) {
            const K = 5 / 4 // r = cos(kθ)
            const L = [[1, 0, .10], [.82, .6, -.14], [.64, 1.2, .18], [.46, 1.8, -.22], [.28, 2.4, .26]]
            return {
                base: g.cy + g.R * .45,
                paths: L.map(([s, rot, sp]) => [polar(g,
                    th => g.R * s * Math.cos(K * th) * wob(th, g.t, 9, .05),
                    rot + g.t * sp, 8 * Math.PI, 2400)]),
            }
        },
    },

    margarita: {
        name: "Margarita",
        lines: [
            { label: "Pétalos exteriores", color: "#ffffff" },
            { label: "Pétalos interiores", color: "#ff9de6" },
            { label: "Centro",             color: "#ffe629" },
        ],
        build(g) {
            const petal = s => th => g.R * s * (.4 + .6 * Math.abs(Math.cos(6 * th))) * wob(th, g.t, 8, .03)
            return {
                base: g.cy + g.R * .3,
                paths: [
                    [polar(g, petal(1), g.t * .10)],
                    [polar(g, petal(.72), Math.PI / 12 - g.t * .10)],
                    [polar(g, th => g.R * .2 * wob(th, g.t, 10, .06), 0, TAU, 200)],
                ],
            }
        },
    },

    girasol: {
        name: "Girasol",
        lines: [
            { label: "Pétalos exteriores", color: "#ffb800" },
            { label: "Pétalos interiores", color: "#ff7a00" },
            { label: "Disco",              color: "#c45cff" },
            { label: "Espiral",            color: "#ffe629" },
        ],
        build(g) {
            const petal = s => th => g.R * s * (.62 + .38 * Math.abs(Math.cos(10 * th))) * wob(th, g.t, 7, .025)
            return {
                base: g.cy + g.R * .4,
                paths: [
                    [polar(g, petal(1), g.t * .08)],
                    [polar(g, petal(.8), Math.PI / 20 - g.t * .08)],
                    [polar(g, th => g.R * .42 * wob(th, g.t, 12, .02), 0, TAU, 300)],
                    [polar(g, th => g.R * .4 * th / (6 * Math.PI) * wob(th, g.t, 12, .04), g.t * .3, 6 * Math.PI, 900)],
                ],
            }
        },
    },

    tulipan: {
        name: "Tulipán",
        lines: [
            { label: "Pétalo izquierdo", color: "#ff2b5e" },
            { label: "Pétalo central",   color: "#ff9a1f" },
            { label: "Pétalo derecho",   color: "#ff2b5e" },
        ],
        build(g) {
            const { cx, cy, R, u, t } = g
            const bx = cx, by = cy + R * .6
            const sway = k => R * .04 * Math.sin(t * 1.5 + k)
            return {
                base: by,
                paths: [
                    [lens(bx, by, cx - R * .55 + sway(0), cy - R * .6, R * .26, u, t, 0)],
                    [lens(bx, by, cx + sway(1),           cy - R * .9, R * .28, u, t, 1)],
                    [lens(bx, by, cx + R * .55 + sway(2), cy - R * .6, R * .26, u, t, 2)],
                ],
                closed: [true, true, true],
            }
        },
    },

    lirio: {
        name: "Lirio",
        lines: [
            { label: "Pétalos exteriores", color: "#b266ff" },
            { label: "Pétalos interiores", color: "#ff9de6" },
            { label: "Estambres",          color: "#ffe629" },
        ],
        build(g) {
            const { cx, cy, R, u, t } = g
            const petals = (start, len, W) => [0, 1, 2].map(i => {
                const a = start + i * TAU / 3 + t * .15
                return lens(cx, cy, cx + len * Math.cos(a), cy + len * Math.sin(a), W, u, t, i)
            })
            const stamens = [0, 1, 2, 3, 4, 5].map(k => {
                const a = k * TAU / 6 + t * .15, pts = []
                for (let i = 0; i <= 30; i++) {
                    const s = i / 30, r = .5 * R * s, w = 4 * u * Math.sin(s * 8 + t * 2 + k)
                    pts.push({ x: cx + r * Math.cos(a) - w * Math.sin(a), y: cy + r * Math.sin(a) + w * Math.cos(a) })
                }
                return pts
            })
            return {
                base: cy + R * .5,
                paths: [petals(-Math.PI / 2, R, R * .3), petals(Math.PI / 2, R * .8, R * .24), stamens],
                closed: [true, true, false],
            }
        },
    },
}

const stemLines = [
    { label: "Tallo",          color: "#19f5ff" },
    { label: "Hoja izquierda", color: "#39ff88" },
    { label: "Hoja derecha",   color: "#39ff88" },
]

// ---------- dibujo principal ----------

function draw(ctx, S, t, key, colors, on) {
    const f = flowers[key], n = f.lines.length, u = S / 800
    ctx.globalCompositeOperation = "source-over"
    ctx.fillStyle = background
    ctx.fillRect(0, 0, S, S)
    ctx.globalCompositeOperation = "lighter"
    ctx.lineJoin = ctx.lineCap = "round"

    const g = { cx: S / 2, cy: S / 2, R: S * .30, u, t }
    const built = f.build(g)
    const y1 = S * .96, A = 26 * u

    // tallo y hojas
    const stem = []
    for (let i = 0; i <= 120; i++) stem.push(stemPoint(i / 120, g.cx, built.base, y1, A, t))
    if (on[n]) neon(ctx, [stem], colors[n], u)
    const p1 = stemPoint(.45, g.cx, built.base, y1, A, t)
    const p2 = stemPoint(.72, g.cx, built.base, y1, A, t)
    if (on[n + 1]) neon(ctx, [lens(p1.x, p1.y, p1.x - 170 * u, p1.y - 80 * u, 26 * u, u, t, 0)], colors[n + 1], u, true)
    if (on[n + 2]) neon(ctx, [lens(p2.x, p2.y, p2.x + 190 * u, p2.y - 85 * u, 30 * u, u, t, 1)], colors[n + 2], u, true)

    // flor
    built.paths.forEach((paths, i) => {
        if (on[i]) neon(ctx, paths, colors[i], u, built.closed ? built.closed[i] : false)
    })
    ctx.globalCompositeOperation = "source-over"
}

// ---------- estado y controles ----------

let t = 0, paused = false, last = performance.now()
let current = "rosa"
const saved = {} // colores por flor, para no perderlos al cambiar

const savedOn = {} // líneas activadas por flor

const defaultColors = key => flowers[key].lines.concat(stemLines).map(l => l.color)
const colorsOf = key => saved[key] || (saved[key] = defaultColors(key))
const onOf = key => savedOn[key] || (savedOn[key] = defaultColors(key).map(() => true))

const flowerSel = document.getElementById("flower")
const pickers = document.getElementById("pickers")
const res = document.getElementById("res")
const custom = document.getElementById("custom")
const pauseBtn = document.getElementById("pause")

for (const [k, f] of Object.entries(flowers)) flowerSel.add(new Option(f.name, k))

function buildPickers() {
    pickers.innerHTML = ""
    const colors = colorsOf(current), on = onOf(current)
    flowers[current].lines.concat(stemLines).forEach((l, i) => {
        const label = document.createElement("label")
        const check = document.createElement("input")
        check.type = "checkbox"
        check.checked = on[i]
        check.setAttribute("aria-label", "Mostrar " + l.label)
        check.addEventListener("change", () => { on[i] = check.checked })
        const input = document.createElement("input")
        input.type = "color"
        input.value = colors[i]
        input.addEventListener("input", () => { colors[i] = input.value })
        label.append(check, input, l.label)
        pickers.append(label)
    })
}

flowerSel.addEventListener("change", () => { current = flowerSel.value; buildPickers() })
document.getElementById("reset").addEventListener("click", () => {
    saved[current] = defaultColors(current)
    delete savedOn[current]
    buildPickers()
})
res.addEventListener("change", () => { custom.hidden = res.value !== "custom" })
pauseBtn.addEventListener("click", () => {
    paused = !paused
    pauseBtn.textContent = paused ? "Reanudar" : "Pausar"
})

document.getElementById("save").addEventListener("click", () => {
    let S = res.value === "custom" ? parseInt(custom.value, 10) : parseInt(res.value, 10)
    if (!S || S < 16) S = 16
    if (S > 8192) S = 8192 // límite práctico de muchos navegadores

    // Se vuelve a dibujar a la resolución elegida, no se escala la vista previa
    const off = document.createElement("canvas")
    off.width = off.height = S
    draw(off.getContext("2d"), S, t, current, colorsOf(current), onOf(current))
    off.toBlob(blob => {
        const a = document.createElement("a")
        a.href = URL.createObjectURL(blob)
        a.download = `${current}-neon-${S}x${S}.png`
        a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    }, "image/png")
})

function frame(now) {
    if (!paused) t += (now - last) / 1000
    last = now
    draw(gctx, view, t, current, colorsOf(current), onOf(current))
    requestAnimationFrame(frame)
}

buildPickers()
requestAnimationFrame(frame)