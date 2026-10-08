/**
 * @typedef {Object} RangeProps
 * @property {string} name
 * @property {number} min
 * @property {number} max
 * @property {number} step
 * @property {number} valueLow
 * @property {number} valueHigh
 * @property {() => void} onChange
 */

/**
 * @typedef {Object} Thumb
 * @property {number} value
 * @property {HTMLDataElement} element
 * @property {"left"|"right"} edge
 * @property {number} limit
 */

/**
 * @typedef {Object} MouseEventThis
 * @property {MouseEvent} event
 * @property {RangeProps} props
 * @property {Thumb[]} targets
 * @property {DOMRect} trackRect
 * @property {(event: MouseEvent) => void} handleEvent
 */

/**
 *
 * @param {string} name
 * @returns
 */
const getDecimals = (name) => (name === "theta" || name === "gamma" ? 4 : 2);

/**
 * @this {MouseEventThis}
 * @param {MouseEvent} event
 */
function dblclick(event) {
  const { currentTarget } = event;

  if (currentTarget instanceof HTMLDivElement) {
    const { trackRect, props } = this;
    const { name, min, max, onChange } = props;
    const { firstElementChild, lastElementChild } = currentTarget;

    if (
      firstElementChild instanceof HTMLDataElement &&
      lastElementChild instanceof HTMLDataElement
    ) {
      firstElementChild.style.right = "100%";
      lastElementChild.style.left = "100%";

      firstElementChild.value = String(min);
      lastElementChild.value = String(max);

      if (firstElementChild.firstElementChild) {
        firstElementChild.firstElementChild.textContent = min.toFixed(
          getDecimals(name),
        );
      }

      if (lastElementChild.lastElementChild) {
        lastElementChild.lastElementChild.textContent = max.toFixed(
          getDecimals(name),
        );
      }

      onChange();
    }
  }
}

/**
 * @this {MouseEventThis}
 * @param {MouseEvent} event
 */
function mousemove(event) {
  const {
    event: { clientX },
    props: { name, max, min, onChange },
    targets,
    trackRect: { width },
  } = this;

  const dist = event.clientX - clientX;
  const range = max - min;

  for (const target of targets) {
    const { value, element, edge } = target;
    const pxNew = Math.max(
      Math.min(width, edge == "left" ? value + dist : value - dist),
      target.limit,
    );

    const valNew =
      edge === "left"
        ? min + range * (pxNew / width)
        : max - range * (pxNew / width);

    element.value = `${valNew}`;

    if (element.firstChild) {
      element.firstChild.textContent = valNew.toFixed(getDecimals(name));
    }

    element.style[edge] = `${pxNew}px`;

    onChange();
  }
}

const GAP = 8;

/**
 * @this {{ props: RangeProps }}
 * @param {MouseEvent} event
 */
function mousedown(event) {
  const { clientX, currentTarget, target } = event;

  if (currentTarget instanceof HTMLDivElement) {
    const { firstChild, lastChild, children } = currentTarget;

    if (
      firstChild instanceof HTMLDataElement &&
      lastChild instanceof HTMLDataElement
    ) {
      const abort = new AbortController();
      const { signal } = abort;
      const { props } = this;

      /** @type {Thumb[]} */
      const targets = [];

      const trackRect = currentTarget.getBoundingClientRect();
      const firstRect = firstChild.getBoundingClientRect();
      const lastRect = lastChild.getBoundingClientRect();

      const lowLimit = trackRect.width - lastRect.left + trackRect.left + GAP;
      const highLimit = firstRect.right - trackRect.left + GAP;

      let lowEdge = trackRect.width - (firstRect.right - trackRect.left);
      let highEdge = lastRect.left - trackRect.left;
      const pxClient = clientX - trackRect.left;

      const handleEvent = mousemove;

      if (target === firstChild) {
        targets.push({
          value: lowEdge,
          element: firstChild,
          edge: "right",
          limit: lowLimit,
        });
      } else if (target === lastChild) {
        targets.push({
          value: highEdge,
          element: lastChild,
          edge: "left",
          limit: highLimit,
        });
      } else if (clientX < firstRect.right) {
        lowEdge = trackRect.width - pxClient - GAP;
        firstChild.style.right = `${lowEdge}px`;

        targets.push({
          value: lowEdge,
          element: firstChild,
          edge: "right",
          limit: lowLimit,
        });
      } else if (clientX > lastRect.left) {
        highEdge = pxClient - GAP;
        lastChild.style.left = `${highEdge}px`;

        targets.push({
          value: highEdge,
          element: lastChild,
          edge: "left",
          limit: highLimit,
        });
      } else {
        targets.push(
          { value: lowEdge, element: firstChild, edge: "right", limit: GAP },
          { value: highEdge, element: lastChild, edge: "left", limit: GAP },
        );
      }

      /** @type {MouseEventThis} */
      const controller = { event, props, trackRect, targets, handleEvent };

      document.addEventListener("mousemove", controller, { signal });
      document.addEventListener("mouseup", () => abort.abort(), { signal });
    }
  }
}

/**
 *
 * @param {RangeProps} props
 */
export const RangeSlider = (props) => {
  const { name, min, max, valueLow, valueHigh } = props;

  const fieldset = document.createElement("fieldset");
  const legend = document.createElement("legend");
  const div = document.createElement("div");

  legend.textContent = name;

  div.className = "multiThumb";
  div.dataset.name = String(name);

  const dataLow = document.createElement("data");
  const dataHigh = document.createElement("data");

  dataLow.value = String(valueLow);
  dataHigh.value = String(valueHigh);

  const labelLow = document.createElement("span");
  const labelHigh = document.createElement("span");

  const decimals = getDecimals(name);

  labelLow.textContent = valueLow.toFixed(decimals);
  labelHigh.textContent = valueHigh.toFixed(decimals);

  const range = max - min;

  dataLow.style.right = `${100 - (100 * (min + valueLow)) / range}%`;
  dataHigh.style.left = `${(100 * (min + valueHigh)) / range}%`;

  const mousedownController = { props, handleEvent: mousedown };
  const dblclickCntroller = { props, handleEvent: dblclick };

  div.addEventListener("mousedown", mousedownController);
  div.addEventListener("dblclick", dblclickCntroller);

  dataLow.replaceChildren(labelLow);
  dataHigh.replaceChildren(labelHigh);

  div.replaceChildren(dataLow, dataHigh);

  fieldset.replaceChildren(legend, div);

  return fieldset;
};
