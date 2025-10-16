const dropdown = document.querySelector(".dropdown");
const toggleBtn = dropdown.querySelector(".dropdown-button");
const items = dropdown.querySelectorAll(".dropdown-item");

const searchInput = document.querySelector(".search-input");
const suggestions = document.querySelector(".suggestions");
const searchBtn = document.querySelector(".search-button");

/*********  Units dropdown functionality *********/
// Open/Close Units menu
toggleBtn.addEventListener("click", () => {
  dropdown.classList.toggle("show");
});

document.addEventListener("click", (e) => {
  if (!dropdown.contains(e.target)) {
    dropdown.classList.remove("show");
  }
});

items.forEach((item) => {
  item.addEventListener("click", () => {
    const section = item.closest(".dropdown-section");
    section
      .querySelectorAll(".dropdown-item")
      .forEach((i) => i.classList.remove("active"));
    item.classList.add("active");
  });
});

/********  Search functionality *********/
let timer;
let lat = null;
let lon = null;
let name = null;

searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim();
  if (query.length < 2) return;

  clearTimeout(timer);
  timer = setTimeout(() => {
    fetchCities(query);
  }, 300);
});

async function fetchCities(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    query
  )}&count=5&language=en&format=json`;

  suggestions.innerHTML = `
    <div class="loader">
      <img src="./assets/images/icon-loading.svg" alt="Loading..." />
      <p>Search in progress</p>
    </div>`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!data.results) {
      suggestions.innerHTML = `<div class="suggestion-item">No results found</div>`;
      return;
    }

    suggestions.innerHTML = data.results
      .map(
        (city) => `
        <div class="suggestion-item"
          data-lat="${city.latitude}"
          data-lon="${city.longitude}"
          data-name="${city.name}, ${city.country}">
          ${city.name}, ${city.country}
        </div>`
      )
      .join("");

    document.querySelectorAll(".suggestion-item").forEach((item) => {
      item.addEventListener("click", () => {
        lat = item.dataset.lat;
        lon = item.dataset.lon;
        name = item.dataset.name;
        searchInput.value = name;
        suggestions.innerHTML = "";
      });
    });
  } catch (error) {
    console.error("Error fetching cities:", error);
    suggestions.innerHTML = `<div class="suggestion-item">Error fetching results</div>`;
  }
}

// Search Button
searchBtn.addEventListener("click", () => {
  if (!lat || !lon) {
    alert("Please select a city from the suggestions first!");
    return;
  }
  getWeather(lat, lon, name);
});

searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    if (!lat || !lon) {
      alert("Please select a city from the suggestions first!");
      return;
    }
    getWeather(lat, lon, name);
  }
});

/******** Fetch weather ********/

async function getWeather(lat, lon, name) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&hourly=temperature_2m,weather_code&timezone=auto`;

  try {
    document.querySelector(".main-container").style.display = "flex";
    showLoadingState();

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    globalHourlyData = data.hourly;
    globalDailyData = data.daily;

    const current = data.current;
    updateWeatherCard(current, name);
    updateDailyForecast(data.daily);
    populateDayDropdown(data.daily);
    updateHourlyForecast(data.hourly, 0);
  } catch (err) {
    console.error("Weather fetch failed:", err);
    document.querySelector("main").innerHTML = `
      <div class="wrong">
        <img src="./assets/images/icon-error.svg" alt="Error" />
        <h1>Something went wrong</h1>
        <p>We couldn't connect to the weather API. Please try again in a few moment.</p>
        <button class="retry" onclick="window.location.reload()">
          <img src="./assets/images/icon-retry.svg"/>Retry
        </button>
      </div>`;
  }
}

/******** Update UI ********/
function updateWeatherCard(current, name) {
  document.querySelector(".weather-header h1").textContent = name;

  const date = new Date(current.time);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  document.querySelector(".weather-header p").textContent = formattedDate;

  document.querySelector(".temperature").textContent = `${Math.round(
    current.temperature_2m
  )}°`;

  const icon = getWeatherIcon(current.weather_code);
  document.querySelector(".weather-icon").src = icon;

  document.getElementById("feelslike").innerHTML = `${Math.round(
    current.apparent_temperature
  )}°C`;
  document.getElementById(
    "humidity"
  ).innerHTML = `${current.relative_humidity_2m}%`;
  document.getElementById("wind").innerHTML = `${current.wind_speed_10m} km/h`;
  document.getElementById(
    "precipitation"
  ).innerHTML = `${current.precipitation} mm`;
}

function updateDailyForecast(daily) {
  const container = document.querySelector(".daily-container");
  container.innerHTML = "";
  for (let i = 0; i < daily.time.length; i++) {
    const date = new Date(daily.time[i]);
    const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
    const max = Math.round(daily.temperature_2m_max[i]);
    const min = Math.round(daily.temperature_2m_min[i]);
    const icon = getWeatherIcon(daily.weather_code[i]);

    container.innerHTML += `
      <div class="day">
        <p class="day-name">${weekday}</p>
        <img src="${icon}" alt="Weather icon" class="day-icon" />
        <p class="day-temp">${max}° / ${min}°</p>
      </div>`;
  }
}

let globalHourlyData = null;
let globalDailyData = null;

function populateDayDropdown(daily) {
  const daySelect = document.getElementById("day-select");
  if (!daySelect) return; // In case the element doesn't exist yet
  daySelect.innerHTML = "";

  daily.time.forEach((dateStr, index) => {
    const date = new Date(dateStr);
    const label = date.toLocaleDateString("en-US", { weekday: "long" });
    const option = document.createElement("option");
    option.value = index;
    option.textContent = label;
    daySelect.appendChild(option);
  });

  daySelect.value = 0;

  daySelect.addEventListener("change", () => {
    const selectedDay = parseInt(daySelect.value);
    updateHourlyForecast(globalHourlyData, selectedDay);
  });
}

function updateHourlyForecast(hourly, dayIndex = 0) {
  const container = document.getElementById("hourly-container");
  if (!container) return;
  container.innerHTML = "";

  const startTime = new Date(globalDailyData.time[dayIndex]);
  const endTime = new Date(
    globalDailyData.time[dayIndex + 1] || hourly.time[hourly.time.length - 1]
  );

  for (let i = 0; i < hourly.time.length; i++) {
    const time = new Date(hourly.time[i]);

    if (time >= startTime && time < endTime) {
      const hourLabel = time.toLocaleTimeString("en-US", {
        hour: "numeric",
        hour12: true,
      });
      const temp = Math.round(hourly.temperature_2m[i]);
      const icon = getWeatherIcon(hourly.weather_code[i]);

      container.innerHTML += `
        <div class="hour">
          <img src="${icon}" alt="icon" class="hour-icon" />
          <p class="hour-time">${hourLabel}</p>
          <p class="hour-temp">${temp}°</p>
        </div>`;
    }
  }
}

/******** Weather icon mapping ********/
function getWeatherIcon(code) {
  if ([0, 1].includes(code)) return "./assets/images/icon-sunny.webp";
  if ([2].includes(code)) return "./assets/images/icon-partly-cloudy.webp";
  if ([3].includes(code)) return "./assets/images/icon-overcast.webp";
  if ([45, 48].includes(code)) return "./assets/images/icon-fog.webp";
  if ([51, 61, 80].includes(code)) return "./assets/images/icon-rain.webp";
  if ([71, 85].includes(code)) return "./assets/images/icon-snow.webp";
  return "./assets/images/icon-sunny.webp";
}

function showLoadingState() {
  const mainContainer = document.querySelector(".main-container");
  mainContainer.style.display = "flex";

  document.querySelector(
    ".weather-header h1"
  ).innerHTML = `<span class="loading-placeholder">...</span>`;
  document.querySelector(
    ".weather-header p"
  ).innerHTML = `<span class="loading-placeholder">Loading...</span>`;

  document.getElementById(
    "feelslike"
  ).innerHTML = `<span class="loading-placeholder">--</span>`;
  document.getElementById(
    "humidity"
  ).innerHTML = `<span class="loading-placeholder">--</span>`;
  document.getElementById(
    "wind"
  ).innerHTML = `<span class="loading-placeholder">--</span>`;
  document.getElementById(
    "precipitation"
  ).innerHTML = `<span class="loading-placeholder">--</span>`;

  document.querySelector(".daily-container").innerHTML = `
  <div class="day loading-placeholder" style="height:150px;width:80px;"></div>
    <div class="day loading-placeholder" style="height:150px;width:80px;"></div>
    <div class="day loading-placeholder" style="height:150px;width:80px;"></div>
    <div class="day loading-placeholder" style="height:150px;width:80px;"></div>
    <div class="day loading-placeholder" style="height:150px;width:80px;"></div>
    <div class="day loading-placeholder" style="height:150px;width:80px;"></div>
    <div class="day loading-placeholder" style="height:150px;width:80px;"></div>
  `;

  document.querySelector(".hourly-forecast").innerHTML = `
         <div class="hour-header">
            <p>Hourly forecast</p>
            <select id="day-select">-</select>
          </div>
  <div id= "hourly-container">
    <div class="hour loading-placeholder" style="height:40px;width:90%;"></div>
    <div class="hour loading-placeholder" style="height:40px;width:90%;"></div>
    <div class="hour loading-placeholder" style="height:40px;width:90%;"></div>
    <div class="hour loading-placeholder" style="height:40px;width:90%;"></div>
    <div class="hour loading-placeholder" style="height:40px;width:90%;"></div>
    <div class="hour loading-placeholder" style="height:40px;width:90%;"></div>
    <div class="hour loading-placeholder" style="height:40px;width:90%;"></div>
    <div class="hour loading-placeholder" style="height:40px;width:90%;"></div>
    </div> `;
}
