// ==============================================================
// home-enhance.js — 首页增强脚本
// 功能：
// 1. Hero 粒子背景（D3 force simulation）
// 2. 学习进度追踪（localStorage）
// 3. 路线图时间轴
// 4. 卡片迷你可视化（D3 条形图 / 色卡 / 折线 / 散点 / 极坐标）
// 5. 知识图谱（D3 force layout）
// 零依赖：纯 JS + D3.js v7 CDN
// ==============================================================

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// ---------- 配置 ----------
const LESSONS = [
  { id: "lesson-01", num: "01", zh: "数据", en: "Data", chapters: ["ch-1-1","ch-1-2","ch-1-3","ch-1-4","ch-1-5"], color: "#6366f1" },
  { id: "lesson-02", num: "02", zh: "流程", en: "Workflow", chapters: ["ch-2-1","ch-2-2","ch-2-3","ch-2-4"], color: "#0ea5e9" },
  { id: "lesson-03", num: "03", zh: "色彩", en: "Color", chapters: ["ch-3-1","ch-3-2","ch-3-3","ch-3-4","ch-3-5","ch-3-6","ch-3-7","ch-3-8"], color: "#f59e0b" },
  { id: "lesson-04", num: "04", zh: "低维", en: "Low-Dim", chapters: ["ch-4-1","ch-4-2","ch-4-3","ch-4-4","ch-4-5"], color: "#10b981" },
  { id: "lesson-05", num: "05", zh: "时序", en: "Time Series", chapters: ["ch-5-1","ch-5-2","ch-5-3","ch-5-4","ch-5-5"], color: "#ef4444" },
];

const STORAGE_KEY = "vis-learning-progress";

// ---------- 1. Hero 背景粒子 ----------
function initHeroBg() {
  const container = document.getElementById("hero-bg");
  if (!container) return;
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);

  const W = container.clientWidth;
  const H = container.clientHeight;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const particles = [];
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 2 + 1,
    });
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);
    // 连线
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.strokeStyle = `rgba(255,255,255,${0.08 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    // 粒子
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(tick);
  }
  tick();

  window.addEventListener("resize", () => {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  });
}

// ---------- 2. 学习进度 ----------
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}
function saveProgress(p) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}
function getLessonProgress(lessonId) {
  const p = loadProgress();
  const lesson = LESSONS.find(l => l.id === lessonId);
  if (!lesson) return { count: 0, total: 0, percent: 0 };
  const visited = lesson.chapters.filter(ch => p[lessonId + ":" + ch]).length;
  return { count: visited, total: lesson.chapters.length, percent: Math.round(visited / lesson.chapters.length * 100) };
}
function updateProgressUI() {
  // 总进度
  const all = LESSONS.reduce((sum, l) => sum + getLessonProgress(l.id).percent, 0) / LESSONS.length;
  const el = document.getElementById("progress-count");
  if (el) {
    el.textContent = Math.round(all) + "%";
    el.style.color = all > 60 ? "#10b981" : all > 30 ? "#f59e0b" : "#fff";
  }
  // 卡片进度条
  document.querySelectorAll("[data-lesson]").forEach(card => {
    const lid = card.dataset.lesson;
    const prog = getLessonProgress(lid);
    const fill = card.querySelector(".progress-fill");
    if (fill) fill.style.width = prog.percent + "%";
    // 进度环
    const ring = card.querySelector(".progress-ring");
    if (ring) ring.setAttribute("stroke-dasharray", `${prog.percent} 100`);
  });
  // 路线图
  LESSONS.forEach(l => {
    const step = document.querySelector(`[data-roadmap="${l.id}"]`);
    if (step) {
      step.classList.toggle("visited", getLessonProgress(l.id).percent > 0);
    }
  });
}
function initProgressReset() {
  const btn = document.getElementById("reset-progress");
  if (btn) {
    btn.addEventListener("click", () => {
      if (confirm("确定要重置学习进度吗？此操作不可撤销。")) {
        saveProgress({});
        updateProgressUI();
      }
    });
  }
}

// ---------- 3. 路线图 ----------
function initRoadmap() {
  const container = document.getElementById("roadmap-container");
  if (!container) return;
  const isEn = document.documentElement.lang === "en";
  const nodes = LESSONS.map(l => {
    const prog = getLessonProgress(l.id);
    return `
      <a class="roadmap-step ${prog.percent > 0 ? "visited" : ""}" 
         data-roadmap="${l.id}" 
         href="${l.id}/" style="text-decoration:none">
        <div class="roadmap-node" style="background:${l.color}">${l.num}</div>
        <div class="roadmap-label">${isEn ? l.en : l.zh}</div>
        <div class="roadmap-sub">${prog.count}/${prog.total}</div>
      </a>`;
  });
  container.innerHTML = nodes.join("");
}

// ---------- 4. 迷你可视化 ----------
function initMiniCharts() {
  // Ch1: 条形图（数据分布）
  const c1 = document.getElementById("mini-chart-01");
  if (c1) {
    const data = [25, 40, 30, 45, 20];
    const svg = d3.select(c1).append("svg").attr("viewBox", "0 0 120 50");
    const x = d3.scaleBand().domain(data.map((_, i) => i)).range([2, 118]).padding(0.15);
    const y = d3.scaleLinear().domain([0, d3.max(data)]).range([45, 5]);
    svg.selectAll("rect").data(data).join("rect")
      .attr("x", (_, i) => x(i)).attr("y", d => y(d))
      .attr("width", x.bandwidth()).attr("height", d => 45 - y(d))
      .attr("fill", "#6366f1").attr("rx", 2);
  }

  // Ch2: 树状图（流程）
  const c2 = document.getElementById("mini-chart-02");
  if (c2) {
    const svg = d3.select(c2).append("svg").attr("viewBox", "0 0 120 50");
    // 简单的树形结构
    const nodes = [{x:60,y:8}, {x:30,y:28}, {x:60,y:28}, {x:90,y:28}, {x:15,y:44}, {x:45,y:44}, {x:75,y:44}, {x:105,y:44}];
    const links = [[0,1],[0,2],[0,3],[1,4],[1,5],[3,6],[3,7]];
    links.forEach(([a,b]) => {
      svg.append("line").attr("x1", nodes[a].x).attr("y1", nodes[a].y)
        .attr("x2", nodes[b].x).attr("y2", nodes[b].y)
        .attr("stroke", "#0ea5e9").attr("stroke-width", 1.5);
    });
    nodes.forEach(n => {
      svg.append("circle").attr("cx", n.x).attr("cy", n.y).attr("r", 4)
        .attr("fill", "#0ea5e9");
    });
  }

  // Ch3: 色卡
  const c3 = document.getElementById("mini-chart-03");
  if (c3) {
    const colors = ["#ef4444","#f59e0b","#10b981","#0ea5e9","#6366f1","#a855f7","#ec4899"];
    const svg = d3.select(c3).append("svg").attr("viewBox", "0 0 120 50");
    const g = svg.append("g").attr("transform", "translate(4, 10)");
    colors.forEach((c, i) => {
      g.append("rect").attr("x", i * 16).attr("y", 0).attr("width", 14).attr("height", 30)
        .attr("fill", c).attr("rx", 2);
    });
  }

  // Ch4: 折线 + 散点
  const c4 = document.getElementById("mini-chart-04");
  if (c4) {
    const pts = [[10,35],[25,22],[40,30],[55,12],[70,25],[85,18],[100,28],[115,10]];
    const line = d3.line();
    const svg = d3.select(c4).append("svg").attr("viewBox", "0 0 120 50");
    svg.append("path").attr("d", line(pts)).attr("fill", "none")
      .attr("stroke", "#10b981").attr("stroke-width", 2);
    pts.forEach(p => {
      svg.append("circle").attr("cx", p[0]).attr("cy", p[1]).attr("r", 3)
        .attr("fill", "#10b981");
    });
  }

  // Ch5: 极坐标/螺旋
  const c5 = document.getElementById("mini-chart-05");
  if (c5) {
    const svg = d3.select(c5).append("svg").attr("viewBox", "0 0 120 50");
    // 画一个简化的螺旋
    let pathStr = "M 60 25";
    for (let i = 0; i < 8; i++) {
      const angle = i * 0.8;
      const r = 3 + i * 2.2;
      const x = 60 + Math.cos(angle) * r;
      const y = 25 + Math.sin(angle) * r * 0.9;
      pathStr += ` L ${x} ${y}`;
    }
    svg.append("path").attr("d", pathStr).attr("fill", "none")
      .attr("stroke", "#ef4444").attr("stroke-width", 2).attr("stroke-linecap", "round");
    // 几个环绕的小圆点
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      svg.append("circle")
        .attr("cx", 60 + Math.cos(a) * 18)
        .attr("cy", 25 + Math.sin(a) * 12)
        .attr("r", 1.8).attr("fill", "#ef4444");
    }
  }
}

// ---------- 5. 知识图谱 ----------
function initKnowledgeGraph() {
  const container = document.getElementById("graph-container");
  if (!container) return;
  const W = container.clientWidth;
  const H = container.clientHeight;

  // 节点数据
  const chapterColors = { 1: "#6366f1", 2: "#0ea5e9", 3: "#f59e0b", 4: "#10b981", 5: "#ef4444" };
  const nodes = [
    { id: "Data", chapter: 1, size: 30 },
    { id: "DIKW", chapter: 1, size: 16 }, { id: "Stevens", chapter: 1, size: 16 },
    { id: "Mackinlay", chapter: 1, size: 16 }, { id: "Data-Join", chapter: 1, size: 16 },
    { id: "Transform", chapter: 1, size: 14 },

    { id: "Workflow", chapter: 2, size: 30 },
    { id: "Card", chapter: 2, size: 16 }, { id: "d3.rollup", chapter: 2, size: 14 },
    { id: "Reingold-Tilford", chapter: 2, size: 14 }, { id: "Event", chapter: 2, size: 14 },

    { id: "Color", chapter: 3, size: 30 },
    { id: "RGB/HSV", chapter: 3, size: 14 }, { id: "Lab", chapter: 3, size: 14 },
    { id: "Colormap", chapter: 3, size: 16 }, { id: "Wong", chapter: 3, size: 12 },
    { id: "CVD", chapter: 3, size: 14 }, { id: "Harmony", chapter: 3, size: 14 },

    { id: "Low-Dim", chapter: 4, size: 30 },
    { id: "Transform2D", chapter: 4, size: 14 }, { id: "Curve", chapter: 4, size: 14 },
    { id: "Cleveland", chapter: 4, size: 14 }, { id: "Marching", chapter: 4, size: 14 },

    { id: "Time", chapter: 5, size: 30 },
    { id: "Attributes", chapter: 5, size: 14 }, { id: "Calendar", chapter: 5, size: 14 },
    { id: "Spiral", chapter: 5, size: 14 }, { id: "Storyline", chapter: 5, size: 16 },

    // 跨章节连接概念
    { id: "D3.js", chapter: 0, size: 22 },
    { id: "Visualization", chapter: 0, size: 26 },
  ];

  // 链接数据（知识关联）
  const links = [
    // Ch1 内部
    ["Data", "DIKW"], ["Data", "Stevens"], ["Data", "Data-Join"],
    ["Data", "Transform"], ["Stevens", "Mackinlay"], ["Mackinlay", "Transform"],
    // Ch2 内部
    ["Workflow", "Card"], ["Workflow", "d3.rollup"], ["Workflow", "Reingold-Tilford"],
    ["Workflow", "Event"], ["Card", "Data"], ["d3.rollup", "Transform"],
    // Ch3 内部
    ["Color", "RGB/HSV"], ["Color", "Lab"], ["Color", "Colormap"],
    ["Color", "Harmony"], ["Colormap", "Wong"], ["Colormap", "CVD"],
    // Ch4 内部
    ["Low-Dim", "Transform2D"], ["Low-Dim", "Curve"], ["Low-Dim", "Cleveland"],
    ["Low-Dim", "Marching"], ["Transform2D", "Transform"], ["Curve", "Cleveland"],
    // Ch5 内部
    ["Time", "Attributes"], ["Time", "Calendar"], ["Time", "Spiral"],
    ["Time", "Storyline"], ["Calendar", "Colormap"],
    // 跨章节
    ["Visualization", "Data"], ["Visualization", "Workflow"],
    ["Visualization", "Color"], ["Visualization", "Low-Dim"], ["Visualization", "Time"],
    ["D3.js", "Data-Join"], ["D3.js", "Transform"], ["D3.js", "Reingold-Tilford"],
    ["D3.js", "Colormap"], ["D3.js", "Curve"],
  ];

  const svg = d3.select(container).append("svg").attr("viewBox", `0 0 ${W} ${H}`);
  const g = svg.append("g");

  // 缩放支持
  svg.call(d3.zoom().scaleExtent([0.3, 3]).on("zoom", (e) => g.attr("transform", e.transform)));

  // 把 [s, t] 数组转成 {source, target} 对象，确保 forceLink 能正确解析
  const linkData = links.map(([s, t]) => ({ source: s, target: t }));

  // simulation
  const sim = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(linkData).id(d => d.id).distance(80).strength(0.6))
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(W / 2, H / 2))
    .force("collision", d3.forceCollide().radius(d => d.size + 8));

  // 链接
  const link = g.append("g")
    .selectAll("line")
    .data(linkData)
    .join("line")
    .attr("class", "graph-link");

  // 节点
  const node = g.append("g")
    .selectAll("g.graph-node")
    .data(nodes)
    .join("g")
    .attr("class", "graph-node")
    .call(d3.drag()
      .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
    );

  node.append("circle")
    .attr("r", d => d.size / 2 + 6)
    .attr("fill", d => chapterColors[d.chapter] || "#64748b")
    .attr("opacity", 0.9);

  node.append("text")
    .text(d => d.id)
    .attr("dy", d => -d.size / 2 - 8);

  // 悬停高亮
  node.on("mouseover", (e, d) => {
    const connected = new Set([d.id]);
    links.forEach(([s, t]) => {
      if (s === d.id) connected.add(t);
      if (t === d.id) connected.add(s);
    });
    node.classed("dimmed", n => !connected.has(n.id));
    node.classed("highlighted", n => n.id === d.id);
    link.classed("dimmed", l => !(l.source.id === d.id || l.target.id === d.id));
  }).on("mouseout", () => {
    node.classed("dimmed highlighted", false);
    link.classed("dimmed", false);
  });

  // tick
  sim.on("tick", () => {
    link
      .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
    node.attr("transform", d => `translate(${d.x},${d.y})`);
  });

  // 响应式
  window.addEventListener("resize", () => {
    const nW = container.clientWidth, nH = container.clientHeight;
    svg.attr("viewBox", `0 0 ${nW} ${nH}`);
    sim.force("center", d3.forceCenter(nW / 2, nH / 2)).alpha(0.3).restart();
  });
}

// ---------- 主题切换（简易版）----------
function initThemeToggle() {
  const btn = document.querySelector(".lang-switch");
  if (!btn || document.querySelector(".theme-toggle")) return;
  const themeBtn = document.createElement("button");
  themeBtn.className = "theme-toggle";
  themeBtn.textContent = "🌓";
  themeBtn.title = "切换主题";
  themeBtn.style.cssText = "padding:4px 10px;border:none;background:transparent;cursor:pointer;border-radius:6px;font-size:14px;";
  themeBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("vis-theme", next); } catch {}
  });
  btn.appendChild(themeBtn);
  // 恢复
  try {
    const saved = localStorage.getItem("vis-theme");
    if (saved === "dark") document.documentElement.setAttribute("data-theme", "dark");
  } catch {}
}

// ---------- 启动 ----------
function init() {
  initHeroBg();
  initRoadmap();
  initMiniCharts();
  initKnowledgeGraph();
  updateProgressUI();
  initProgressReset();
  // 稍等 i18n 完成再更新
  setTimeout(() => {
    initThemeToggle();
    updateProgressUI(); // 路线图可能需要重新渲染
  }, 500);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
