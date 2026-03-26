/**
 * Animated Counter Component
 * Adapted from https://reactbits.dev/components/counter (React Bits)
 * Added comma-separator support for large numbers.
 */

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

import "./Counter.css";

function Number({ mv, number, height }) {
  let y = useTransform(mv, (latest) => {
    let placeValue = latest % 10;
    let offset = (10 + number - placeValue) % 10;
    let memo = offset * height;
    if (offset > 5) {
      memo -= 10 * height;
    }
    return memo;
  });
  return (
    <motion.span className="counter-number" style={{ y }}>
      {number}
    </motion.span>
  );
}

function Digit({ place, value, height, digitStyle }) {
  const isSeparator = place === "." || place === ",";
  const valueRoundedToPlace = isSeparator ? 0 : Math.floor(value / place);
  const animatedValue = useSpring(valueRoundedToPlace);

  useEffect(() => {
    if (!isSeparator) {
      animatedValue.set(valueRoundedToPlace);
    }
  }, [animatedValue, valueRoundedToPlace, isSeparator]);

  if (isSeparator) {
    return (
      <span
        className="counter-digit"
        style={{ height, ...digitStyle, width: "fit-content" }}
      >
        {place}
      </span>
    );
  }

  return (
    <span className="counter-digit" style={{ height, ...digitStyle }}>
      {Array.from({ length: 10 }, (_, i) => (
        <Number key={i} mv={animatedValue} number={i} height={height} />
      ))}
    </span>
  );
}

/**
 * Build places array with comma separators inserted.
 * e.g. 14523 → [10000, ',', 1000, 100, 10, 1] → "14,523"
 */
function buildPlaces(value) {
  const intStr = Math.floor(Math.abs(value)).toString();
  const digits = intStr.length;
  const places = [];

  for (let i = 0; i < digits; i++) {
    const place = 10 ** (digits - i - 1);
    places.push(place);

    // Insert comma after this digit if:
    // - there are more digits remaining
    // - the remaining count is a multiple of 3
    const remaining = digits - i - 1;
    if (remaining > 0 && remaining % 3 === 0) {
      places.push(",");
    }
  }

  return places;
}

export default function Counter({
  value,
  fontSize = 100,
  padding = 0,
  places,
  gap = 8,
  borderRadius = 4,
  horizontalPadding = 8,
  textColor = "inherit",
  fontWeight = "inherit",
  containerStyle,
  counterStyle,
  digitStyle,
  gradientHeight = 16,
  gradientFrom = "black",
  gradientTo = "transparent",
  topGradientStyle,
  bottomGradientStyle,
}) {
  const resolvedPlaces = places || buildPlaces(value);
  const height = fontSize + padding;

  const defaultCounterStyle = {
    fontSize,
    gap,
    borderRadius,
    paddingLeft: horizontalPadding,
    paddingRight: horizontalPadding,
    color: textColor,
    fontWeight,
  };

  const defaultTopGradientStyle = {
    height: gradientHeight,
    background: `linear-gradient(to bottom, ${gradientFrom}, ${gradientTo})`,
  };

  const defaultBottomGradientStyle = {
    height: gradientHeight,
    background: `linear-gradient(to top, ${gradientFrom}, ${gradientTo})`,
  };

  return (
    <span className="counter-container" style={containerStyle}>
      <span
        className="counter-counter"
        style={{ ...defaultCounterStyle, ...counterStyle }}
      >
        {resolvedPlaces.map((place, i) => (
          <Digit
            key={`${place}-${i}`}
            place={place}
            value={value}
            height={height}
            digitStyle={digitStyle}
          />
        ))}
      </span>
      <span className="gradient-container">
        <span
          className="top-gradient"
          style={topGradientStyle || defaultTopGradientStyle}
        />
        <span
          className="bottom-gradient"
          style={bottomGradientStyle || defaultBottomGradientStyle}
        />
      </span>
    </span>
  );
}
