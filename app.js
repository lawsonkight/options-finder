import { RangeSlider } from "./RangeSlider.js";

/**
 * @typedef {Object} Greeks
 * @property {number} delta
 * @property {number} gamma
 * @property {number} rho
 * @property {number} theta
 * @property {number} vega
 */

/**
 * @typedef {Object} Instrument
 * @property {number} ask_price
 * @property {string} base_currency
 * @property {number} bid_price
 * @property {EpochTimeStamp} creation_timestamp
 * @property {number} estimated_delivery_price
 * @property {EpochTimeStamp} expiration_timestamp
 * @property {Record<string, number>} greeks
 * @property {number|null} high
 * @property {number} instrument_id
 * @property {string} instrument_name
 * @property {number} interest_rate
 * @property {number|null} last
 * @property {number|null} low
 * @property {number} mark_iv
 * @property {number} mark_price
 * @property {number} mid_price
 * @property {number} open_interest
 * @property {string} option_token_address
 * @property {number} price_change
 * @property {string} quote_currency
 * @property {number} theoretical_price
 * @property {string} underlying_index
 * @property {number} underlying_price
 * @property {number} volume
 * @property {number} volume_usd
 */

/**
 * @typedef {Object} OptionsSummary
 * @property {string} jsonrpc
 * @property {Instrument[]} result
 * @property {boolean} testnet
 * @property {EpochTimeStamp} usDiff
 * @property {EpochTimeStamp} usIn
 * @property {EpochTimeStamp} usOut
 */

const SYMBOL = "SP500";
const PRODUCTION_URL = `https://api.hypercall.xyz/options-summary?currency=${SYMBOL}`;
const CACHE_URL = `./cache/${SYMBOL}.json`;

/**
 *
 * @param {string} url
 */
async function getData(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    /** @type {OptionsSummary} */
    const result = await response.json();

    /** @type {{ C: Record<string, [number, number]>, P: Record<string, [number,number]>}} */
    const greeksRange = {
      C: {
        delta: [Infinity, -Infinity],
        gamma: [Infinity, -Infinity],
        theta: [Infinity, -Infinity],
        vega: [Infinity, -Infinity],
        rho: [Infinity, -Infinity],
      },
      P: {
        delta: [Infinity, -Infinity],
        gamma: [Infinity, -Infinity],
        theta: [Infinity, -Infinity],
        vega: [Infinity, -Infinity],
        rho: [Infinity, -Infinity],
      },
    };

    for (const instrument of result.result) {
      const { instrument_name } = instrument;
      const type = instrument_name[instrument_name.length - 1];

      if (type !== "C" && type !== "P") continue;

      for (const key in greeksRange[type]) {
        greeksRange[type][key][0] = Math.min(
          greeksRange[type][key][0],
          instrument.greeks[key],
        );
        greeksRange[type][key][1] = Math.max(
          greeksRange[type][key][1],
          instrument.greeks[key],
        );
      }
    }

    const filterControls = document.getElementById("filterControls");

    if (filterControls instanceof HTMLElement) {
      const controller = {
        data: result.result,
        handleEvent: handleInput,
      };

      filterControls.addEventListener("input", controller);
    }

    const deltaRange = RangeSlider({
      name: "delta",
      min: 0.01,
      max: 0.99,
      step: 0.1,
      valueLow: 0.4,
      valueHigh: 0.6,
      onChange: () => displayData(result.result),
    });

    const gammaRange = RangeSlider({
      name: "gamma",
      min: 0.0001,
      max: greeksRange.C.gamma[1],
      step: 0.001,
      valueLow: 0.0001,
      valueHigh: greeksRange.C.gamma[1],
      onChange: () => displayData(result.result),
    });

    const thetaRange = RangeSlider({
      name: "theta",
      min: greeksRange.C.theta[1],
      max: 0,
      step: 0.001,
      valueLow: greeksRange.C.theta[1],
      valueHigh: 0,
      onChange: () => displayData(result.result),
    });

    const vegaRange = RangeSlider({
      name: "vega",
      min: 0.01,
      max: greeksRange.C.vega[1],
      step: 0.001,
      valueLow: 0.01,
      valueHigh: greeksRange.C.vega[1],
      onChange: () => displayData(result.result),
    });

    const rhoRange = RangeSlider({
      name: "rho",
      min: 0,
      max: greeksRange.C.rho[1],
      step: 0.001,
      valueLow: 0,
      valueHigh: greeksRange.C.rho[1],
      onChange: () => displayData(result.result),
    });

    filterControls?.replaceChildren(
      deltaRange,
      gammaRange,
      //   thetaRange,
      vegaRange,
      rhoRange,
    );

    displayData(result.result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : `An unknown error occurred: ${error}`;

    console.error(message);
  }
}

const MIN_ASK = 0.005;
const MAX_LEVERAGE = 100;

const svgNS = "http://www.w3.org/2000/svg";

/**
 *
 * @param {Instrument[]} result
 */
function displayData(result) {
  const chartSvg = document.getElementById("chartSvg");
  const instrumentSection = document.getElementById("instrumentSection");
  const filterControls = document.getElementById("filterControls");
  const chartXAxis = document.getElementById("chartXAxis");
  const chartYAxis = document.getElementById("chartYAxis");

  const instrumentHeader = instrumentSection?.firstElementChild;
  const instrumentList = instrumentSection?.lastElementChild;

  if (
    !(
      filterControls instanceof HTMLElement &&
      chartSvg instanceof SVGSVGElement &&
      instrumentHeader instanceof HTMLElement &&
      instrumentList instanceof HTMLOListElement &&
      chartXAxis instanceof HTMLDivElement &&
      chartYAxis instanceof HTMLDivElement
    )
  ) {
    return;
  }

  const filters = filterControls.querySelectorAll(".multiThumb");
  for (const element of filters) {
    if (element instanceof HTMLDivElement) {
      const { dataset, firstChild, lastChild } = element;
      const { name } = dataset;

      const lowerBound =
        firstChild instanceof HTMLDataElement ? Number(firstChild.value) : null;
      const upperBound =
        lastChild instanceof HTMLDataElement ? Number(lastChild.value) : null;

      if (name && lowerBound !== null && upperBound !== null) {
        result = result.filter((instrument) => {
          const isWithinBounds =
            instrument.greeks[name] >= lowerBound &&
            instrument.greeks[name] <= upperBound;

          return isWithinBounds;
        });
      }
    }
  }

  const now = Date.now();

  const listItems = [];
  const points = [];

  let xMin = Infinity;
  let yMin = Infinity;
  let xMax = -Infinity;
  let yMax = -Infinity;

  for (const instrument of result) {
    const {
      instrument_name,
      expiration_timestamp,
      ask_price,
      theoretical_price,
      underlying_price,
    } = instrument;

    const hte = (expiration_timestamp - now) / 3600000; // 1000 * 60 * 60
    const dte = Math.floor(hte / 24);
    const lvg = underlying_price / (ask_price || theoretical_price);

    /* List item */
    const li = document.createElement("li");
    li.innerText = instrument_name;
    // li.innerText = `${instrument_name} ${dte} ${Math.round(lvg)}`;

    listItems.push(li);

    /* Chart dot */
    const line = document.createElementNS(svgNS, "line");

    line.setAttribute("x1", String(hte));
    line.setAttribute("x2", String(hte + 0.01));
    line.setAttribute("y1", String(lvg));
    line.setAttribute("y2", String(lvg));
    line.setAttribute("vector-effect", "non-scaling-stroke");

    points.push(line);

    /* Update boundaries */
    xMin = Math.min(xMin, hte);
    xMax = Math.max(xMax, hte);
    yMin = Math.min(yMin, lvg);
    yMax = Math.max(yMax, lvg);
  }

  xMin = 0;

  const xMinLabel = document.createElement("div");
  xMinLabel.textContent = `${xMin} DTE`;

  const xMaxLabel = document.createElement("div");
  xMaxLabel.textContent = `${Math.floor(xMax / 24)} DTE`;

  const yMinLabel = document.createElement("div");
  yMinLabel.textContent = yMin.toFixed(0) + "x";

  const yMaxLabel = document.createElement("div");
  yMaxLabel.textContent = yMax.toFixed(0) + "x";

  chartSvg.setAttribute(
    "viewBox",
    `${xMin} ${yMin} ${xMax - xMin} ${yMax - yMin}`,
  );

  chartSvg.replaceChildren(...points);
  instrumentHeader.replaceChildren(`${result.length} items`);
  instrumentList.replaceChildren(...listItems);

  if (!result.length) return;

  chartYAxis.replaceChildren(yMinLabel, yMaxLabel);
  chartXAxis.replaceChildren(xMinLabel, xMaxLabel);
}

/**
 * @this {{ data: Instrument[]}}
 */
function handleInput() {
  displayData(this.data);
}

getData(PRODUCTION_URL);
