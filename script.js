const dropdown = document.querySelector(".dropdown");
const toggleBtn = dropdown.querySelector(".dropdown-button");
const items = dropdown.querySelectorAll(".dropdown-item");

const searchInput = document.querySelector(".search-input");
const suggestions = document.querySelector(".suggestions");
const searchBtn = document.querySelector(".search-button");

/*********  Units dropdown functionality *********/
let unitSettings = {
  temperature: "C",
  wind: "kmh",
  precipitation: "mm",
};

const savedUnits = localStorage.getItem("unitSettings");
if (savedUnits) {
  unitSettings = JSON.parse(savedUnits);
}

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

    const text = item.textContent.trim();
    if (text.includes("Celsius")) unitSettings.temperature = "C";
    else if (text.includes("Fahrenheit")) unitSettings.temperature = "F";
    else if (text.includes("km/h")) unitSettings.wind = "kmh";
    else if (text.includes("mph")) unitSettings.wind = "mph";
    else if (text.includes("Millimeters")) unitSettings.precipitation = "mm";
    else if (text.includes("Inches")) unitSettings.precipitation = "in";

    localStorage.setItem("unitSettings", JSON.stringify(unitSettings));

    if (globalWeatherData) {
      updateWeatherCard(globalWeatherData.current, globalWeatherData.name);
      updateDailyForecast(globalWeatherData.daily);
      updateHourlyForecast(
        globalWeatherData.hourly,
        document.getElementById("day-select").value
      );
    }
  });
});

/********  Switch to Imperial / Metric toggle ********/
const switchBtn = dropdown.querySelector(".dropdown-section .dropdown-item");

switchBtn.addEventListener("click", () => {
  const isImperial = switchBtn.textContent.includes("Imperial");

  if (isImperial) {
    // Switch to Imperial units
    unitSettings = {
      temperature: "F",
      wind: "mph",
      precipitation: "in",
    };
    switchBtn.textContent = "Switch to Metric";

    document
      .querySelectorAll(".dropdown-item")
      .forEach((i) => i.classList.remove("active"));
    document
      .querySelectorAll(".dropdown-section")[1]
      .querySelectorAll(".dropdown-item")[1]
      .classList.add("active");
    document
      .querySelectorAll(".dropdown-section")[2]
      .querySelectorAll(".dropdown-item")[1]
      .classList.add("active");
    document
      .querySelectorAll(".dropdown-section")[3]
      .querySelectorAll(".dropdown-item")[1]
      .classList.add("active");
  } else {
    // Switch to Metric units
    unitSettings = {
      temperature: "C",
      wind: "kmh",
      precipitation: "mm",
    };
    switchBtn.textContent = "Switch to Imperial";

    // Update active states
    document
      .querySelectorAll(".dropdown-item")
      .forEach((i) => i.classList.remove("active"));
    document
      .querySelectorAll(".dropdown-section")[1]
      .querySelectorAll(".dropdown-item")[0]
      .classList.add("active");
    document
      .querySelectorAll(".dropdown-section")[2]
      .querySelectorAll(".dropdown-item")[0]
      .classList.add("active");
    document
      .querySelectorAll(".dropdown-section")[3]
      .querySelectorAll(".dropdown-item")[0]
      .classList.add("active");
  }

  localStorage.setItem("unitSettings", JSON.stringify(unitSettings));

  if (globalWeatherData) {
    updateWeatherCard(globalWeatherData.current, globalWeatherData.name);
    updateDailyForecast(globalWeatherData.daily);
    updateHourlyForecast(
      globalWeatherData.hourly,
      document.getElementById("day-select").value
    );
  }
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
        localStorage.setItem(
          "lastSearchedLocation",
          JSON.stringify({ lat: lat, lon: lon, name: name })
        );
      });
    });
  } catch (error) {
    console.error("Error fetching cities:", error);
    suggestions.innerHTML = `<div class="suggestion-item">Error fetching results</div>`;
  }
}

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
let globalHourlyData = null;
let globalDailyData = null;
let globalWeatherData = null;

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
    globalWeatherData = {
      current: data.current,
      daily: data.daily,
      hourly: data.hourly,
      name,
    };

    updateWeatherCard(data.current, name);
    updateDailyForecast(data.daily);
    populateDayDropdown(data.daily);
    updateHourlyForecast(data.hourly, 0);
  } catch (err) {
    console.error("Weather fetch failed:", err);
    document.querySelector("main").innerHTML = `
      <div class="wrong">
        <img src="./assets/images/icon-error.svg" alt="Error" />
        <h1>Something went wrong</h1>
        <p>We couldn't connect to the weather API. Please try again later.</p>
        <button class="retry" onclick="window.location.reload()">
          <img src="./assets/images/icon-retry.svg"/>Retry
        </button>
      </div>`;
  }
}

/******** Update UI ********/
function updateWeatherCard(current, name) {
  const locationTitle = document.querySelector(".weather-header h1");
  locationTitle.textContent = name;

  const date = new Date(current.time);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  document.querySelector(".weather-header p").textContent = formattedDate;

  const temp = convertTemperature(current.temperature_2m);
  document.querySelector(".temperature").textContent = `${temp}°`;

  const icon = getWeatherIcon(current.weather_code);
  document.querySelector(".weather-icon").src = icon;

  document.getElementById("feelslike").innerHTML = `${convertTemperature(
    current.apparent_temperature
  )}°${unitSettings.temperature}`;
  document.getElementById(
    "humidity"
  ).innerHTML = `${current.relative_humidity_2m}%`;
  document.getElementById("wind").innerHTML = `${convertWind(
    current.wind_speed_10m
  )} ${unitSettings.wind === "kmh" ? "km/h" : "mph"}`;
  document.getElementById("precipitation").innerHTML = `${convertPrecip(
    current.precipitation
  )} ${unitSettings.precipitation}`;
}

function updateDailyForecast(daily) {
  const container = document.querySelector(".daily-container");
  container.innerHTML = "";
  for (let i = 0; i < daily.time.length; i++) {
    const date = new Date(daily.time[i]);
    const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
    const max = convertTemperature(daily.temperature_2m_max[i]);
    const min = convertTemperature(daily.temperature_2m_min[i]);
    const icon = getWeatherIcon(daily.weather_code[i]);

    container.innerHTML += `
      <div class="day">
        <p class="day-name">${weekday}</p>
        <img src="${icon}" alt="Weather icon" class="day-icon" />
        <p class="day-temp">${max}° / ${min}°</p>
      </div>`;
  }
}

function populateDayDropdown(daily) {
  const daySelect = document.getElementById("day-select");
  if (!daySelect) return;
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
      const temp = convertTemperature(hourly.temperature_2m[i]);
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

/******** Unit Conversion ********/
function convertTemperature(tempC) {
  if (unitSettings.temperature === "F") return Math.round((tempC * 9) / 5 + 32);
  return Math.round(tempC);
}

function convertWind(kmh) {
  if (unitSettings.wind === "mph") return Math.round(kmh * 0.621371);
  return Math.round(kmh);
}

function convertPrecip(mm) {
  if (unitSettings.precipitation === "in") return (mm / 25.4).toFixed(2);
  return Math.round(mm);
}

/******** Loading UI ********/
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
    <div id="hourly-container">
      <div class="hour loading-placeholder" style="height:40px;width:90%;"></div>
      <div class="hour loading-placeholder" style="height:40px;width:90%;"></div>
      <div class="hour loading-placeholder" style="height:40px;width:90%;"></div>
    </div>`;
}

/******** Load last searched location ********/
document.addEventListener("DOMContentLoaded", function () {
  const savedLocation = localStorage.getItem("lastSearchedLocation");
  if (savedLocation) {
    const { lat, lon, name: locationName } = JSON.parse(savedLocation);
    getWeather(lat, lon, locationName);
  } else {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          let locationName = "Current Location";
          try {
            const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
            const res = await fetch(reverseUrl);
            if (res.ok) {
              const data = await res.json();
              if (data.address && data.address.city && data.address.country) {
                locationName = `${data.address.city}, ${data.address.country}`;
              } else if (data.display_name) {
                locationName = data.display_name;
              }
            }
          } catch (error) {
            console.error("Reverse geocoding error:", error);
          }
          getWeather(lat, lon, locationName);
        },
        (error) => {
          console.error("Geolocation error:", error);
        }
      );
    } else {
      console.error("Geolocation not supported");
    }
  }
});
