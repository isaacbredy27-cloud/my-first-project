const DEFAULT = { name: "Boca Raton", lat: 26.3683, lon: -80.1289 };
const NAME = "Isaac";

const CODES = {
  0: ["Clear", "☀️", "🌙"],
  1: ["Mostly Clear", "🌤️", "🌙"],
  2: ["Partly Cloudy", "⛅", "☁️"],
  3: ["Cloudy", "☁️", "☁️"],
  45: ["Fog", "🌫️", "🌫️"],
  48: ["Fog", "🌫️", "🌫️"],
  51: ["Drizzle", "🌦️", "🌧️"],
  53: ["Drizzle", "🌦️", "🌧️"],
  55: ["Drizzle", "🌦️", "🌧️"],
  61: ["Rain", "🌧️", "🌧️"],
  63: ["Rain", "🌧️", "🌧️"],
  65: ["Heavy Rain", "🌧️", "🌧️"],
  71: ["Snow", "🌨️", "🌨️"],
  73: ["Snow", "🌨️", "🌨️"],
  75: ["Heavy Snow", "❄️", "❄️"],
  80: ["Showers", "🌦️", "🌧️"],
  81: ["Showers", "🌦️", "🌧️"],
  82: ["Heavy Showers", "🌧️", "🌧️"],
  95: ["Thunderstorm", "⛈️", "⛈️"],
  96: ["Thunderstorm", "⛈️", "⛈️"],
  99: ["Thunderstorm", "⛈️", "⛈️"],
};

const $ = (id) => document.getElementById(id);
const info = (code, isDay = 1) => {
  const c = CODES[code] || ["—", "🌡️", "🌡️"];
  return { label: c[0], icon: isDay ? c[1] : c[2] };
};

async function load({ name, lat, lon }) {
  $("place").textContent = name;
  $("desc").textContent = "Loading…";

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day" +
    "&hourly=temperature_2m,weather_code,is_day" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max" +
    "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=7";

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    render(await res.json());
  } catch (err) {
    $("desc").textContent = "Couldn't load weather";
  }
}

function render(data) {
  const { current: c, hourly: h, daily: d } = data;
  const now = info(c.weather_code, c.is_day);

  $("temp").textContent = `${Math.round(c.temperature_2m)}°`;
  $("desc").textContent = now.label;
  $("hilo").textContent = `H:${Math.round(d.temperature_2m_max[0])}°  L:${Math.round(d.temperature_2m_min[0])}°`;
  $("feels").textContent = `${Math.round(c.apparent_temperature)}°`;
  $("humidity").textContent = `${c.relative_humidity_2m}%`;
  $("wind").textContent = `${Math.round(c.wind_speed_10m)} mph`;
  $("uv").textContent = Math.round(d.uv_index_max[0]);

  // Next 24 hours, starting at the current hour
  const start = Math.max(0, h.time.findIndex((t) => t >= c.time.slice(0, 13)));
  $("hourly").innerHTML = h.time
    .slice(start, start + 24)
    .map((t, i) => {
      const j = start + i;
      const hr = new Date(t).getHours();
      const label = i === 0 ? "Now" : `${hr % 12 || 12}${hr < 12 ? "AM" : "PM"}`;
      return `<div class="hour"><span>${label}</span><span class="icon">${info(h.weather_code[j], h.is_day[j]).icon}</span><span>${Math.round(h.temperature_2m[j])}°</span></div>`;
    })
    .join("");

  // 7-day forecast with range bars
  const lo = Math.min(...d.temperature_2m_min);
  const hi = Math.max(...d.temperature_2m_max);
  const span = hi - lo || 1;
  $("daily").innerHTML = d.time
    .map((t, i) => {
      const day = i === 0 ? "Today" : new Date(t + "T12:00").toLocaleDateString("en-US", { weekday: "short" });
      const min = d.temperature_2m_min[i];
      const max = d.temperature_2m_max[i];
      const left = ((min - lo) / span) * 100;
      const width = ((max - min) / span) * 100;
      return `<li><span>${day}</span><span class="icon">${info(d.weather_code[i]).icon}</span>
        <span class="range"><span class="lo">${Math.round(min)}°</span>
        <span class="bar"><span style="left:${left}%;width:${width}%"></span></span>
        <span>${Math.round(max)}°</span></span></li>`;
    })
    .join("");
}

$("search").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("city").value.trim();
  if (!q) return;
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1`);
    const { results } = await res.json();
    if (!results || !results.length) {
      $("desc").textContent = "City not found";
      return;
    }
    const r = results[0];
    $("city").value = "";
    $("city").blur();
    load({ name: r.name, lat: r.latitude, lon: r.longitude });
  } catch {
    $("desc").textContent = "Search failed";
  }
});

// Greeting
const hour = new Date().getHours();
const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
$("greeting").textContent = `${part}, ${NAME}`;

// Theme switcher: light, dark, or follow the system setting
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll(".themes button").forEach((b) =>
    b.classList.toggle("active", b.dataset.theme === theme)
  );
  try { localStorage.setItem("theme", theme); } catch {}
}
document.querySelectorAll(".themes button").forEach((b) =>
  b.addEventListener("click", () => setTheme(b.dataset.theme))
);
setTheme(document.documentElement.dataset.theme);

load(DEFAULT);
